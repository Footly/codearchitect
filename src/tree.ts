import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { json } from 'stream/consumers';

export class JsonEditor {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private currentContent: string = '';
  private currentUndoIndex: number = -1; // Keeps track of the current position in the undo stack
  private isInUndoRedoOperation: boolean = false; // Flag to indicate if an undo/redo operation is in progress

  constructor(private jsonFilePath: string) {
    // Initialize current content with the file's content
    this.currentContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
    this.undoStack.push(this.currentContent);
    this.currentUndoIndex = 0;

    // Subscribe to document changes
    vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this);
  }

  private onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
    if (event.document.fileName.toLowerCase() === this.jsonFilePath.toLowerCase()) {
      if (this.isInUndoRedoOperation) {
        this.isInUndoRedoOperation = false;
        return; // Skip processing if an undo/redo operation is in progress
      }

      // Remove any redo entries as new change happened
      this.redoStack = [];

      // Update undo stack and current content
      this.currentContent = event.document.getText();
      if (this.currentUndoIndex === this.undoStack.length - 1) {
        // Append new change to the end of the undo stack
        this.undoStack.push(this.currentContent);
      } else {
        // Replace the current position with new change
        this.undoStack[this.currentUndoIndex + 1] = this.currentContent;
        // Remove entries after the current position
        this.undoStack = this.undoStack.slice(0, this.currentUndoIndex + 2);
      }
      this.currentUndoIndex = this.undoStack.length - 1;
    }
  }

  public undo(): boolean {
    if (this.currentUndoIndex > 0) {
      this.isInUndoRedoOperation = true; // Start undo/redo operation

      // Move current content to redo stack
      this.redoStack.push(this.currentContent);

      // Move one step back in the undo stack
      this.currentUndoIndex--;
      this.currentContent = this.undoStack[this.currentUndoIndex];
      this.writeContentToFile(this.currentContent);
      return true;
    } else {
      vscode.window.showInformationMessage('Nothing to undo');
      return false;
    }
  }

  public redo(): boolean {
    if (this.redoStack.length > 0) {
      this.isInUndoRedoOperation = true; // Start undo/redo operation

      // Move current content to undo stack
      this.undoStack.push(this.currentContent);
      this.currentUndoIndex++;

      // Move one step forward in the redo stack
      this.currentContent = this.redoStack.pop()!;
      this.writeContentToFile(this.currentContent);
      return true;
    } else {
      vscode.window.showInformationMessage('Nothing to redo');
      return false;
    }
  }

  private writeContentToFile(content: string) {
    fs.writeFileSync(this.jsonFilePath, content, 'utf-8');
    this.refreshFile();
  }

  private refreshFile() {
    const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === this.jsonFilePath);
    if (document) {
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      edit.replace(document.uri, fullRange, this.currentContent);
      vscode.workspace.applyEdit(edit);
    }
  }
}

export class ItemTreeProvider implements vscode.TreeDataProvider<Item> {

  private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | void> = new vscode.EventEmitter<Item | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | undefined | void> = this._onDidChangeTreeData.event;
  private editors: Map<string, JsonEditor> = new Map();
  private itemMap: Map<string, Item> = new Map();
  private lastIDCreated: string = '';
  private lastItemCreated: Item | undefined;

  constructor(private rootPath: string, public schemas: any[]) {
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  navigateBack(item: Item): void {
    if (this.editors.get(item.filePath)?.undo()) {
      this.refresh();
    }
  }

  navigateForward(item: Item): void {
    if (this.editors.get(item.filePath)?.redo()) {
      this.refresh();
    }
  }

  private resolveRef(schema: any, root_schema: any): any {
    for (const key in schema) {
      if (key === "$ref") {
        const ref = schema["$ref"].split("/");
        //Discard the first element
        ref.shift();
        //Convert all %24 to $ using map
        const ref_keys = ref.map((item: string) => item.replace(/%24/g, "$"));
        //Get the root schema
        let current_schema = root_schema;
        //Loop through the ref_keys
        for (const ref_key of ref_keys) {
          current_schema = current_schema[ref_key];
        }
        //Concat both schemas
        schema = { ...schema, ...current_schema };
      }
    }
    return schema;
  }

  getItem(jsonPath: string[], filePath: string): Item | undefined {
    return this.itemMap.get(filePath + jsonPath.join('/'));
  }

  getLastItemCreated(): Item | undefined {
    return this.lastItemCreated;
  }

  getParent(element: Item): vscode.ProviderResult<Item> {
    // Get the json path of current element
    const parentPath = element.parentJsonPath;

    // Check if parent path is empty
    if (parentPath === undefined) {
      return undefined;
    }

    // Get the parent item
    const parent = this.itemMap.get(element.filePath + parentPath.join('/'));

    return parent;
  }

  getTreeItem(element: Item): vscode.TreeItem {
    // Get the parent item's JSON file
    const parentJSON = JSON.parse(fs.readFileSync(element.filePath, 'utf-8')); // Read the parent JSON file

    // Drill down to the desired part of the JSON
    const jsonObject = element.jsonPath.reduce((obj, key) => obj[key], parentJSON);

    this.decodeChildrenFromJson(jsonObject, element.schema, element.jsonPath, element);

    //Check if element.children is empty
    if (element.children.length === 0) {
      element.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }

    return element;
  }


  private decodeChildrenFromJson(jsonObject: any, schemaItem: any, parentPath: string[], parent: Item): void {
    let schema = schemaItem;

    const createItem = (key: string, keyProperties: any, jsonPath: string[], $label: string): Item => {
      keyProperties = this.resolveRef(keyProperties, parent.root_schema);
      return new Item(
        $label,
        keyProperties,
        parent.filePath,
        jsonPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        parent.root_schema,
        parent.jsonPath
      );
    };

    const addItemToParent = (item: Item, modelType: string): void => {
      switch (modelType) {
        case 'parent-object':
        case 'array-parent-objects':
        case 'root-object':
          parent.children.push(item);
          break;
        case 'folder':
          this.decodeChildrenFromJson(jsonObject[item.$label], item.schema, item.jsonPath, parent);
          parent.hidden_children.push(item);
          break;
        case 'hidden':
        case 'pool-dropdown-select-tag':
        case 'dropdown-select-tag':
        case 'input-string':
        case 'text-area':
        case 'checkbox':
        case 'dropdown-select':
          parent.hidden_children.push(item);
          break;
        case 'array-creator':
        case 'sub-object':
          // Decode the sub-object
          this.decodeChildrenFromJson(item.value, item.schema, item.jsonPath, item);
          parent.hidden_children.push(item);
          break;
        default:
          vscode.window.showErrorMessage(`Type ${modelType} is not supported`);
          break;
      }
    };

    const processArray = (array: any[]): void => {
      array.forEach((itemValue, index) => {
        let itemSchema = this.resolveRef(schema.items, parent.root_schema);

        const item = createItem(index.toString(), itemSchema, parentPath.concat(index.toString()), itemValue?.$label);

        // Add item into the itemMap. String is item.filePath + item.jsonPath.join('/')
        this.itemMap.set(item.filePath + item.jsonPath.join('/'), item);

        if (itemValue !== undefined) {
          item.value = itemValue;
        }

        addItemToParent(item, itemSchema.modelType);
      });
    };

    const processObject = (object: { [key: string]: any }): void => {
      const properties = this.resolveRef(schema.properties, parent.root_schema);


      for (const key in object) {
        if (object.hasOwnProperty(key)) {
          const keyProperties = properties[key];
          const jsonKey = object[key];
          const item = createItem(key, keyProperties, parentPath.concat(key), key);

          // Add item into the itemMap. String is item.filePath + item.jsonPath.join('/')
          this.itemMap.set(item.filePath + item.jsonPath.join('/'), item);

          if (jsonKey !== undefined) {
            if (key === '$id') {
              if (jsonKey === this.lastIDCreated) {
                this.lastItemCreated = parent;
              }
            }
            item.value = jsonKey;
          }

          addItemToParent(item, keyProperties.modelType);
        }
      }
    };

    if (Array.isArray(jsonObject)) {
      processArray(jsonObject);
    } else if (typeof jsonObject === 'object' && jsonObject !== null) {
      processObject(jsonObject);
    } else {
      vscode.window.showErrorMessage('Unsupported JSON data type');
    }

    // Check if parent has any children
    if (parent.children.length === 0) {
      parent.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
    }
  }

  async getChildren(element?: Item): Promise<Item[]> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage('No folder or workspace opened');
      return [];
    }

    if (!element) {
      // Find all .json files in the rootPath
      const files = fs.readdirSync(this.rootPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      // Create a new JSON editor for each of the parent JSON files
      jsonFiles.forEach(file => {
        const filePath = path.join(this.rootPath, file);
        if (!this.editors.has(filePath)) {
          const editor = new JsonEditor(filePath);
          this.editors.set(filePath, editor);
        }
      });

      // Get the parent items
      const ParentItems: Item[] = [];
      jsonFiles.forEach(file => {
        // Read the JSON file
        const content = fs.readFileSync(path.join(this.rootPath, file), 'utf-8');
        //Look for the $schema in the JSON file
        const rootSchema = JSON.parse(content);
        //Check if rootSchema has a $schema
        if (!rootSchema.$schema) {
          vscode.window.showWarningMessage(`$schema not found for ${file}`);
          return;
        }
        //Check if the $schema is in the schemas
        const schema = this.schemas.find(schema => schema.$id === rootSchema.$schema);
        if (!schema) {
          vscode.window.showWarningMessage(`Schema ${rootSchema.$schema} not found for ${file}`);
          return;
        }
        const item = new Item(
          path.basename(file, '.json'),
          schema,
          path.join(this.rootPath, file), // Pass the parent JSON file path
          [],  // Root path
          vscode.TreeItemCollapsibleState.Collapsed,
          schema,
          []
        );
        ParentItems.push(item);
      });

      return ParentItems;
    } else {
      return element.children;
    }
  }

  private createChildrenFromSchema(schema: any, rootSchema: any, rootJSONpath: any, jsonPath: string[] = [], name?: string): [any, { [key: string]: any }] {
    const children: { [key: string]: any } = {};
    let tags: string[] = [];
    let visibility: string = 'public';
    let scope: string = 'global';

    schema = this.resolveRef(schema, rootSchema);

    //Convert the path to a JSON file and create a variable for the parentJSON
    let rootJSON = JSON.parse(fs.readFileSync(rootJSONpath, 'utf-8'));

    if(schema?.$link)
    {
      tags = schema?.$link?.tags;
      scope = schema?.$link?.scope;
    }

    for (const key in schema.properties) {
      const jsonPathKey = [...jsonPath];
      jsonPathKey.push(key);
      const property = this.resolveRef(schema.properties[key], rootSchema);
      const type = property.type;

      if (key === '$label') {
        children.$label = name || '';
      } else if (key === '$id') {
        children.$id = generateUUID();
        this.lastIDCreated = children.$id;
      } else if (key === '$schema') {
        children.$schema = rootSchema.$id;
      } else if (key === 'visibility') {
        children[key] = property.default;
        if (property.const) children[key] = property.const;
        visibility = children[key];
      } else if (type === 'string') {
        children[key] = '';
      } else if (type === 'number') {
        children[key] = 0;
      } else if (type === 'boolean') {
        children[key] = false;
      } else if (type === 'array') {
        children[key] = [];
      } else if (type === 'object') {
        [, children[key]] = this.createChildrenFromSchema(property, rootSchema, rootJSONpath, jsonPathKey);
      } else {
        vscode.window.showWarningMessage(`Type ${type} in property ${key} is not supported`);
      }
    }

    if (!name) {
      return [rootJSON, children];
    }

    // Drill down to the desired part of the JSON
    let current = rootJSON;
    for (const key of jsonPath) {
      // If current is an array, ensure key is treated as an index (number)
      const index = Array.isArray(current) ? Number(key) : key;
      //Check if current is an array and if tke key does not exist in the array
      if (Array.isArray(current) && !current[Number(index)]) {
        current[Number(index)] = {};
        break;
      } else {
        current = current[index];
      }
    }

    //check if jsonPath is empty
    if (jsonPath.length === 0) {
      //Add the children to the rootJSON
      rootJSON = children;
    } else {
      if (Array.isArray(current)) {
        //Substitute the current array with the children
        current[Number(jsonPath[jsonPath.length - 1])] = children;
      } else {
        //Add the children to the current object
        current.push(children);
      }
    }

    if (tags.length > 0) {
      children.$link = {};
      if(scope === 'local') {
        children.$link.dependencies = [];
        children.$link.dependencies.push(children.$id);
      }
      children.$link.scope = scope;

      //Create object for the tags
      const obj = {
        $id: children.$id,
        $tags: tags,
        $visibility: visibility,
        $label: children.$label,
        $path: jsonPath,
        $scope: scope
      }

      //Add the tags to the rootJSON
      rootJSON.$links.push(obj);

      //Populate the dependencies
      const populateDependencies = (json: any, link: any, rootLinks: any): void => {
        const searchOnPath = (path: string[], json: any): any => {
          let current = json;
          for (const key of path) {
            current = current[key];
          }
          return current;
        }

        if (link.$scope === 'global') {
          for (const key in json) {
            if (key === '$link') {
              if (json[key].dependencies) {
                //Only add link.$id to the dependencies if it is not already in the dependencies
                if (!json[key].dependencies.includes(link.$id)) {
                  json[key].dependencies.push(link.$id);
                }
              }
            }
            if (typeof json[key] === 'object') {
              populateDependencies(json[key], link, rootLinks);
            }
          }
        } else if (link.$scope === 'parent') {
          const jsonPath = [...link.$path];
          let endPath = [];
          while (jsonPath.length > 0) {
            jsonPath.pop();
            const parentJSON = searchOnPath(jsonPath, json);
            if (parentJSON?.$link?.scope !== undefined && parentJSON.$link.scope !== 'parent') {
              endPath = jsonPath;
              break;
            }
          }

          // Function to check if a path starts with a given prefix
          const startsWith = (path: string[], prefix: string[]): boolean => {
            return prefix.every((part, index) => path[index] === part);
          };

          // Find all paths that start with endPath
          const pathsFound = rootLinks.filter((link: any) => startsWith(link.$path, endPath)).map((link: any) => link.$path);

          for(const pathFound of pathsFound) {
            const parentJSON = searchOnPath(pathFound, json);
            if (parentJSON?.$link?.dependencies) {
              //Only add link.$id to the dependencies if it is not already in the dependencies
              if (!parentJSON.$link.dependencies.includes(link.$id)) {
                parentJSON.$link.dependencies.push(link.$id);
              }
            }
          }

          console.log(pathsFound);
        }
      }

      //Get the Links Object
      const rootLinks = rootJSON.$links;

      for (const link of rootLinks) {
        populateDependencies(rootJSON, link, rootLinks);
      }
    }
    return [rootJSON, children];
  }

  async createParent(): Promise<void> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage('No folder or workspace opened');
      return;
    }

    // Get options from the schemas provided
    const options: Array<[string, number]> = [];

    this.schemas.forEach((schema, index) => {
      if (schema.modelType === 'root-object') {
        options.push([schema.$id, index]);
      }
    });

    if (options.length === 0) {
      vscode.window.showWarningMessage('No parent object available to create');
      return;
    }

    // Show a quick pick dialog to select a schema
    const optionName = await vscode.window.showQuickPick(options.map(option => option[0]), { placeHolder: 'Select parent object to create' });

    if (!optionName) {
      vscode.window.showWarningMessage('Parent object creation cancelled');
      return;
    }

    const selectedOption = options.find(option => option[0] === optionName);

    // Get the selected schema
    const rootSchema = this.schemas[selectedOption![1]];

    // Ask for the name of the parent object
    const name = await vscode.window.showInputBox({ prompt: 'Enter parent object name' });
    if (!name) {
      // Send a warning message if the user cancels the input box
      vscode.window.showWarningMessage('Parent object creation cancelled');
      return;
    }

    // Check if type is object
    if (rootSchema.type !== 'object') {
      vscode.window.showErrorMessage('Parent object can only be created for type object');
      return;
    }

    //Create the json file
    const rootJSONfile = path.join(this.rootPath, `${name}.json`);

    //Create an empty object
    let rootJSON = {};

    //Write the object to the file
    fs.writeFileSync(rootJSONfile, JSON.stringify(rootJSON, null, 2), 'utf-8');

    //Now open the file and write the parent object
    [rootJSON,] = this.createChildrenFromSchema(rootSchema, rootSchema, rootJSONfile, [], name);

    try {
      fs.writeFileSync(rootJSONfile, JSON.stringify(rootJSON, null, 2), 'utf-8');
      vscode.window.showInformationMessage(`Parent object ${name} created successfully!`);
      this.refresh();
    } catch (error) {
      // Type assertion to handle 'unknown' type
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to create parent object: ${errorMessage}`);
    }
  }

  async createChildFrom(parent: Item): Promise<void> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage('No folder or workspace opened');
      return;
    }

    let jsonPath = [];
    let items = undefined;

    if (parent.schema.type === 'object') {
      let options: Array<[string, number]> = [];
      //Check options for creating a child object
      parent.hidden_children.forEach((child) => {
        const schema = this.resolveRef(child.schema, parent.root_schema);
        const type = schema.type;
        const items = this.resolveRef(schema.items, parent.root_schema);
        if (items?.modelType === 'parent-object' || items?.modelType === 'root-object') {
          options.push([items.title, parent.hidden_children.indexOf(child)]);
        }
      });

      if (options.length === 0) {
        vscode.window.showWarningMessage('No child object available to create');
        return;
      }
      const optionName = await vscode.window.showQuickPick(options.map(option => option[0]), { placeHolder: 'Select child object to create' });

      if (!optionName) {
        vscode.window.showWarningMessage('Child object creation cancelled');
        return;
      }

      const selectedOption = options.find(option => option[0] === optionName);
      const selectedChild = parent.hidden_children[selectedOption![1]];
      const schemaItems = this.resolveRef(selectedChild.schema.items, parent.root_schema);
      let index = 0;
      for (const child of parent.children) {
        if (child.schema.title === schemaItems.title) {
          index++;
        }
      }
      const selectedChildCopy = JSON.parse(JSON.stringify(selectedChild));
      selectedChildCopy.jsonPath.push(index.toString());
      jsonPath = selectedChildCopy.jsonPath;
      items = selectedChildCopy.schema.items;
    } else if (parent.schema.type === 'array') {
      // Push the new value to the array
      parent.jsonPath.push(parent.children.length.toString());
      // Then, assign the updated array to jsonPath
      jsonPath = parent.jsonPath;
      items = parent.schema.items;
    } else {
      vscode.window.showErrorMessage('Child object can only be created for type object or array');
      return;
    }

    const rootJSONfile = parent.filePath;

    const childName = await vscode.window.showInputBox({ prompt: 'Enter child object name' });
    if (!childName) {
      vscode.window.showWarningMessage('Child object creation cancelled');
      return;
    }

    // Create child object based on schema
    const [rootJSON,] = this.createChildrenFromSchema(items, parent.root_schema, rootJSONfile, jsonPath, childName);

    try {
      fs.writeFileSync(rootJSONfile, JSON.stringify(rootJSON, null, 2), 'utf-8');
      vscode.window.showInformationMessage(`Child object ${childName} created successfully!`);
      this.refresh();
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to create child object: ${errorMessage}`);
    }
  }

  private findObjectByID($id: string, rootJSON: any): any {
    for (const key in rootJSON) {
      if (rootJSON[key].$id === $id) {
        return rootJSON[key];
      } else if (typeof rootJSON[key] === 'object') {
        const result = this.findObjectByID($id, rootJSON[key]);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  private removeAllRefsToID($id: string, rootJSON: any): void {
    for (const key in rootJSON) {
      if (rootJSON[key].$id === $id) {
        //If rootJSON is an array, remove the $id from the array
        if (Array.isArray(rootJSON)) {
          rootJSON.splice(Number(key), 1);
        } else {
          delete rootJSON[key];
        }
      }
      else if (rootJSON[key] === $id) {
        // If rootJSON is a array, remove the $id from the array
        if (Array.isArray(rootJSON)) {
          rootJSON.splice(Number(key), 1);
        } else {
          rootJSON[key] = ''; // Remove the $id
        }
      } else if (typeof rootJSON[key] === 'object') {
        this.removeAllRefsToID($id, rootJSON[key]);
      }
    }
  }

  async removeItem(item: Item): Promise<void> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage('No folder or workspace opened');
      return;
    }

    // Show a quick pick dialog to confirm item removal
    const response = await vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: `Are you sure you want to remove item ${item.$label}?` });
    if (response !== 'Yes') {
      return;
    }

    const rootJSON = JSON.parse(fs.readFileSync(item.filePath, 'utf-8'));

    if (item.contextValue === 'root-object') {
      //Add another prompt to confirm the removal of the root object in the disk
      const response = await vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: `The root object ${item.$label}.json will be removed from the disk. Are you sure you want to proceed?` });
      if (response !== 'Yes') {
        return;
      }
      // Remove the root object
      fs.unlinkSync(item.filePath);
      vscode.window.showInformationMessage(`Item ${item.$label} removed successfully!`);
      this.refresh();
      return;
    }

    // Drill down to the desired part of the JSON
    let current = rootJSON;
    for (const key of item.jsonPath) {
      current = current[key];
    }

    // Get the ID of the item
    const $id = current.$id;

    // Remove all references to this itemr recursively
    this.removeAllRefsToID($id, rootJSON);

    try {
      fs.writeFileSync(item.filePath, JSON.stringify(rootJSON, null, 2), 'utf-8');
      vscode.window.showInformationMessage(`Item ${item.$label} removed successfully!`);
      this.refresh();
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to remove item: ${errorMessage}`);
    }
  }

  async updateItem(item: Item): Promise<void> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage('No folder or workspace opened');
      return;
    }

    const parentJSON = JSON.parse(fs.readFileSync(item.filePath, 'utf-8'));

    const updateItemInJSON = (jsonObject: any, item: Item): void => {
      let id_item_changed = undefined;
      let current = jsonObject;
      for (let i = 0; i < item.jsonPath.length - 1; i++) {
        const key = item.jsonPath[i];
        if (!current[key]) {
          current[key] = {}; // Initialize if not exist
        }
        current = current[key];
      }

      const lastKey = item.jsonPath[item.jsonPath.length - 1];
      if (item.value !== undefined) {
        current[lastKey] = item.value;
      }

      item.children.forEach((child) => {
        let childCurrent = jsonObject;
        for (let i = 0; i < child.jsonPath.length - 1; i++) {
          const key = child.jsonPath[i];
          if (!childCurrent[key]) {
            childCurrent[key] = {}; // Initialize if not exist
          }
          childCurrent = childCurrent[key];
        }
        const childLastKey = child.jsonPath[child.jsonPath.length - 1];
        if (child.value !== childCurrent[childLastKey] && childLastKey === '$label' &&
          item.contextValue === 'root-object') {
          //Change the name of the file
          const newFilePath = path.join(this.rootPath, `${child.value}.json`);
          fs.renameSync(item.filePath, newFilePath);
          item.filePath = newFilePath;
        }
        if (child.value !== undefined) {
          if(childLastKey === '$id') {
            id_item_changed = child.value;
          }
          childCurrent[childLastKey] = child.value;
        }
        if (child.children.length > 0) {
          updateItemInJSON(jsonObject, child);
        }
      });

      return id_item_changed;
    };

    const $update_id = updateItemInJSON(parentJSON, item);

    parentJSON.$links.forEach((link: any) => {
      if (link.$id === $update_id) {
        link.$label = item.$label;
      }
    });

    try {
      fs.writeFileSync(item.filePath, JSON.stringify(parentJSON, null, 2), 'utf-8');
      vscode.window.showInformationMessage(`Item ${item.$label} updated successfully!`);
      this.refresh();
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to update item: ${errorMessage}`);
    }
  }

}

export class Item extends vscode.TreeItem {
  public children: Item[]; // Add children[] property
  public $links: any[] = [];
  public dependencies: any[] = [];
  public value: any;
  public hidden_children: Item[] = [];

  constructor(
    public readonly $label: string,
    public readonly schema: any,
    public filePath: string,
    public jsonPath: string[] = [], // New property to track JSON path
    public collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
    public root_schema: any,
    public parentJsonPath: string[]
  ) {
    super($label, collapsibleState);
    if (this.schema.title) {
      this.description = this.schema.title;
      //this.tooltip = this.schema.title;
    }

    if (this.schema?.vscodeIcon) {
      this.iconPath = new vscode.ThemeIcon(this.schema.vscodeIcon);
    }
    this.contextValue = this.schema.modelType;

    this.children = []; // Initialize children[] as an empty array
    this.hidden_children = []; // Initialize hidden_children[] as an empty array
  }

}

function generateUUID(): string {
  return randomUUID();
}