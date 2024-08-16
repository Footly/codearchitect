import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { json } from 'stream/consumers';

export class ItemTreeProvider implements vscode.TreeDataProvider<Item> {

  private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | void> = new vscode.EventEmitter<Item | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | undefined | void> = this._onDidChangeTreeData.event;

  constructor(private rootPath: string, private rootSchema: any) {
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
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

  getTreeItem(element: Item): vscode.TreeItem {
    // Get the parent item's JSON file
    const parentJSON = JSON.parse(fs.readFileSync(element.filePath, 'utf-8')); // Read the parent JSON file

    // Drill down to the desired part of the JSON
    const jsonObject = element.jsonPath.reduce((obj, key) => obj[key], parentJSON);

    this.decodeChildrenFromJson(jsonObject, element);

    //Check if element.children is empty
    if (element.children.length === 0) {
      element.collapsibleState = vscode.TreeItemCollapsibleState.None;
    }

    return element;
  }


  private decodeChildrenFromJson(jsonObject: any, parent: Item): void {
    let schema = parent.schema;

    const createItem = (key: string, keyProperties: any, jsonPath: string[], $label: string): Item => {
      keyProperties = this.resolveRef(keyProperties, this.rootSchema);
      return new Item(
        $label,
        key,
        keyProperties,
        parent.filePath,
        jsonPath,
        vscode.TreeItemCollapsibleState.Collapsed,
        this.rootSchema
      );
    };

    const addItemToParent = (item: Item, format: string): void => {
      //Add the contents of $tags of the parent into the item
      if (parent.$tags) {
        item.$tags.push(...parent.$tags);
      }
      switch (format) {
        case 'parent-object':
          parent.children.push(item);
          break;
        case 'array-parent-objects':
          parent.children.push(item);
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
        case 'sub-object':
          // Decode the sub-object
          this.decodeChildrenFromJson(item.value, item);
          parent.hidden_children.push(item);
          break;
        default:
          vscode.window.showErrorMessage(`Type ${format} is not supported`);
          break;
      }
    };

    const processArray = (array: any[]): void => {
      array.forEach((itemValue, index) => {
        let itemSchema = this.resolveRef(schema.items, this.rootSchema);
        

        const item = createItem(index.toString(), itemSchema, parent.jsonPath.concat(index.toString()), itemValue?.$label);

        if (itemValue !== undefined) {
          item.value = itemValue;
        }

        addItemToParent(item, itemSchema.format);
      });
    };

    const processObject = (object: { [key: string]: any }): void => {
      const properties = this.resolveRef(schema.properties, this.rootSchema);
      

      for (const key in object) {
        if (object.hasOwnProperty(key)) {
          const keyProperties = properties[key];
          const jsonKey = object[key];
          const item = createItem(key, keyProperties, parent.jsonPath.concat(key), key);

          if (jsonKey !== undefined) {
            item.value = jsonKey;
          }

          addItemToParent(item, keyProperties.format);
        }
      }
    };

    // Check if $tags exists in jsonObject
    if (jsonObject.$tags) {
      parent.$tags.push(...jsonObject.$tags.map((tag: any) => ({
        ...tag,
        $label: this.findObjectByID(tag.$id, jsonObject).$label
      })));
    }

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

      // Get the parent items
      const ParentItems = jsonFiles.map(file => new Item(
        path.basename(file, '.json'),
        this.rootSchema.title,
        this.rootSchema,
        path.join(this.rootPath, file), // Pass the parent JSON file path
        [],  // Root path
        vscode.TreeItemCollapsibleState.Collapsed,
        this.rootSchema
      ));

      return ParentItems;
      //return ParentItems.filter(item => item.visible); // Filter by visibility
    } else {
      return element.children;
      //return children.filter(item => item.visible); // Filter by visibility
    }
  }

  private createChildrenFromSchema(schema: any, rootJSONpath: any, jsonPath: string[] = [], name?: string): [any, { [key: string]: any }] {
    const children: { [key: string]: any } = {};
    let isTag = false;
    let scope = "";

    schema = this.resolveRef(schema, this.rootSchema);

    //Convert the path to a JSON file and create a variable for the parentJSON
    let rootJSON = JSON.parse(fs.readFileSync(rootJSONpath, 'utf-8'));

    for (const key in schema.properties) {
      const jsonPathKey = [...jsonPath];
      jsonPathKey.push(key); 
      const property = this.resolveRef(schema.properties[key], this.rootSchema);
      const type = property.type;

      if (key === '$label') {
        children.$label = name || '';
      } else if (key === '$id') {
        children.$id = generateUUID();
      } else if (key === '$tag') {
        children.$tag = property.properties.$filter.const;
        scope = property.properties.$scope.const;
        isTag = true;
      } else if (type === 'string') {
        children[key] = '';
      } else if (type === 'number') {
        children[key] = 0;
      } else if (type === 'boolean') {
        children[key] = false;
      } else if (type === 'array') {
        children[key] = [];
      } else if (type === 'object') {
        [, children[key]] = this.createChildrenFromSchema(property, rootJSONpath, jsonPathKey);
      } else {
        vscode.window.showWarningMessage(`Type ${type} in property ${key} is not supported`);
      }
    }

    if(!name) {
      return [rootJSON, children];
    }

    //Drill down to the desired part of the JSON
    let current = rootJSON;
    for (const key of jsonPath) {
      current = current[key];
    }

    //check if jsonPath is empty
    if (jsonPath.length === 0) {
      //Add the children to the rootJSON
      rootJSON = children;
    } else {
      current.push(children);
    }

    if (isTag) {
      //Create object for the tags
      const obj = {
        $tag: children.$tag,
        $id: children.$id
      }
      //Check the scope which can be global, parent or local
      if (scope === 'global') {
        //Add the $tags to the rootJSON
        if (!rootJSON.$tags) {
          rootJSON.$tags = [];
        }
        rootJSON.$tags.push(obj);
      } else if (scope === 'parent') {
        //Add the $tags to the parent
        const jsonPathParent = jsonPath.slice(0, -1);
        let parent = rootJSON;
        for (const key of jsonPathParent) {
          parent = parent[key];
        }
        if (!parent.$tags) {
          parent.$tags = [];
        }
        parent.$tags.push(obj);
      } else if (scope === 'local') {
        //Add the $tags to the children
        if (!children.$tags) {
          children.$tags = [];
        }
        children.$tags.push(obj);
      }
    }

    return [rootJSON, children];
  }

  async createParent(): Promise<void> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage('No folder or workspace opened');
      return;
    }

    // Ask for the name of the parent object
    const name = await vscode.window.showInputBox({ prompt: 'Enter parent object name' });
    if (!name) {
      // Send a warning message if the user cancels the input box
      vscode.window.showWarningMessage('Parent object creation cancelled');
      return;
    }

    // Check if type is object
    if (this.rootSchema.type !== 'object') {
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
    [rootJSON,] = this.createChildrenFromSchema(this.rootSchema, rootJSONfile, [], name);

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

    if (!parent.schema.items) {
      vscode.window.showErrorMessage('Child object can only be created for array with items');
      return;
    }

    const childName = await vscode.window.showInputBox({ prompt: 'Enter child object name' });
    if (!childName) {
      vscode.window.showWarningMessage('Child object creation cancelled');
      return;
    }

    const rootJSONfile = parent.filePath;
    const jsonPath = parent.jsonPath;

    // Create child object based on schema
    const [rootJSON,] = this.createChildrenFromSchema(parent.schema.items, rootJSONfile, jsonPath, childName);

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

  private removeIds(obj: any, rootJSON: any): void {
    for (const key in obj) {
      if (key === '$id') {
        // Remove the $id from the $tags
        if (rootJSON.$tags) {
          rootJSON.$tags = rootJSON.$tags.filter((tag: any) => tag.$id !== obj.$id);
        }
      } else if (typeof obj[key] === 'object') {
        this.removeIds(obj[key], rootJSON);
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
        if (child.value !== undefined) {
          childCurrent[childLastKey] = child.value;
        }
        if (child.children.length > 0) {
          updateItemInJSON(jsonObject, child);
        }
      });
    };

    updateItemInJSON(parentJSON, item);

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
  public $tags: any[] = [];
  public value: any;
  public hidden_children: Item[] = [];

  constructor(
    public readonly $label: string,
    public readonly description: string,
    public readonly schema: any,
    public readonly filePath: string,
    public readonly jsonPath: string[] = [], // New property to track JSON path
    public collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.Collapsed,
    public root_schema: any
  ) {
    super($label, collapsibleState);
    this.description = "";

    if (this.schema?.contentMediaType) {
      this.iconPath = new vscode.ThemeIcon(this.schema.contentMediaType);
    }
    this.contextValue = this.schema.format;

    this.children = []; // Initialize children[] as an empty array
    this.hidden_children = []; // Initialize hidden_children[] as an empty array
  }

}

function generateUUID(): string {
  return randomUUID();
}