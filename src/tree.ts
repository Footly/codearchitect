import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { JsonTreeDecoder } from './JsonTreeDecoder';
import { resolveRef } from './SchemaUtils'; // Import resolveRef from SchemaUtils
import { JsonHistory } from './JsonHistory';
import { JsonGenerator } from './JsonGenerator';

export class ItemTreeProvider implements vscode.TreeDataProvider<Item> {
  private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | void> = new vscode.EventEmitter<Item | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<Item | undefined | void> = this._onDidChangeTreeData.event;
  private editors: Map<string, JsonHistory> = new Map();
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
          const editor = new JsonHistory(filePath);
          this.editors.set(filePath, editor);
        }
      });

      // Get the parent items
      const ParentItems: Item[] = [];
      jsonFiles.forEach(file => {
        // Read the JSON file
        const content = fs.readFileSync(path.join(this.rootPath, file), 'utf-8');
        //Look for the $model in the JSON file
        const rootSchema = JSON.parse(content);
        //Check if rootSchema has a $model
        if (!rootSchema.$model) {
          vscode.window.showWarningMessage(`$model not found for ${file}`);
          return;
        }
        //Check if the $model is in the schemas
        const schema = this.schemas.find(schema => schema.$id === rootSchema.$model);
        if (!schema) {
          vscode.window.showWarningMessage(`model ${rootSchema.$model} not found for ${file}`);
          return;
        }
        const item = new Item(
          path.basename(file, '.json'),
          schema,
          path.join(this.rootPath, file), // Pass the parent JSON file path
          [],  // Root path
          schema,
          []
        );
        // Add item into the itemMap. String is item.filePath + item.jsonPath.join('/')
        this.itemMap.set(item.filePath + item.jsonPath.join('/'), item);
        ParentItems.push(item);
      });

      return ParentItems;
    } else {
      return element.children;
    }
  }

  getTreeItem(element: Item): vscode.TreeItem {
    // Get the parent item's JSON file
    const parentJSON = JSON.parse(fs.readFileSync(element.filePath, 'utf-8')); // Read the parent JSON file

    // Drill down to the desired part of the JSON
    const jsonObject = element.jsonPath.reduce((obj, key) => obj[key], parentJSON);

    // Create an instance of the decoder
    const decoder = new JsonTreeDecoder(this.itemMap);

    // Use the decoder to decode JSON data
    decoder.decode(jsonObject, element.schema, element.jsonPath, element);

    return element;
  }

  async createParent(): Promise<void> {
    if (!this.rootPath) {
      vscode.window.showInformationMessage('No folder selected to save the projects');
      return;
    }

    // Get options from the schemas provided
    const options: Array<[string, number]> = [];

    this.schemas.forEach((schema, index) => {
      if (schema?.modelType === 'root') {
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

    //Create JSON generator instance
    const generator = new JsonGenerator(rootSchema, rootSchema);

    //Generate the JSON
    const newJson = generator.generate(name);

    try {
      fs.writeFileSync(rootJSONfile, JSON.stringify(newJson, null, 2), 'utf-8');
      vscode.window.showInformationMessage(`Parent object ${name} created successfully!`);
      this.refresh();
    } catch (error) {
      // Type assertion to handle 'unknown' type
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to create parent object: ${errorMessage}`);
    }
  }

  async createChildFrom(parent: Item): Promise<void> {
    interface PropertyItem {
      hidden?: boolean;
      type?: string;
      items?: {
        title?: string;
      };
    }
    if (!this.rootPath) {
      vscode.window.showInformationMessage('No folder or workspace opened');
      return;
    }

    const getOptions = (properties: Record<string, PropertyItem>, rootSchema: any) =>
      Object.entries(properties)
        .map(([key, value]) => {
          // Resolve references before filtering and mapping
          value.items = resolveRef(value.items, rootSchema);
          return [key, value] as [string, PropertyItem];
        })
        .filter(([_, value]) =>
          value.hidden === true &&
          value.type === 'array' &&
          value.items?.title
        )
        .map(([key, value], index) => ({
          parent_key: key,
          title: value.items!.title!,
          index: parent.children.length,
          items: value.items
        }));

    const handleSchemaForObject = async (parent: any) => {
      const properties = parent.schema?.properties ?? {};
      const options = getOptions(properties, parent.root_schema);

      if (options.length === 0) {
        vscode.window.showWarningMessage('No child object available to create');
        return { jsonPath: [], items: undefined };
      }

      const selectedOption = await vscode.window.showQuickPick(
        options.map(option => option.title),
        { placeHolder: 'Select child object to create' }
      );

      if (!selectedOption) {
        vscode.window.showWarningMessage('Child object creation cancelled');
        return { jsonPath: [], items: undefined };
      }

      // Find the selected option
      const selectedValue = options.find(option => option.title === selectedOption);

      if (!selectedValue) {
        // Handle the case where no option was found
        console.error('Selected option not found');
        return { jsonPath: [], items: undefined };
      }

      return {
        jsonPath: [...parent.jsonPath, selectedValue.parent_key, selectedValue.index.toString()],
        items: selectedValue.items
      };
    };

    const handleSchemaForArray = (parent: any) => ({
      jsonPath: [...parent.jsonPath, parent.children.length.toString()],
      items: parent.schema?.items
    });

    const handleSchema = async (parent: any) => {
      if (parent.schema?.type === 'object') {
        return handleSchemaForObject(parent);
      } else if (parent.schema?.type === 'array') {
        return handleSchemaForArray(parent);
      } else {
        console.error('Child object can only be created for type object or array');
        return { jsonPath: [], items: undefined };
      }
    };

    // Usage
    const { jsonPath, items } = await handleSchema(parent);

    const rootJSONfile = parent.filePath;

    const childName = await vscode.window.showInputBox({ prompt: 'Enter child object name' });
    if (!childName) {
      vscode.window.showWarningMessage('Child object creation cancelled');
      return;
    }

    // Create JSON generator instance
    const generator = new JsonGenerator(items, parent.root_schema);

    // Generate the JSON
    const newJson = generator.generate(childName);

    // Open rootJSONfile
    const rootJSON = JSON.parse(fs.readFileSync(rootJSONfile, 'utf-8'));

    // On jsonPath write newJson using reduce for a more modern approach
    jsonPath.slice(0, -1).reduce((acc, key) => {
      // If the key does not exist, create an empty object at that key
      if (!(key in acc)) {
        acc[key] = {};
      }
      return acc[key]; // Return the nested object for the next iteration
    }, rootJSON)[jsonPath[jsonPath.length - 1]] = newJson;

    try {
      fs.writeFileSync(rootJSONfile, JSON.stringify(rootJSON, null, 2), 'utf-8');
      vscode.window.showInformationMessage(`Child object '${childName}' created successfully!`);
      this.refresh();
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to create child object: ${errorMessage}`);
    }
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

  async selectDirectory(item: Item, id: string): Promise<void> {
    //const uri = await vscode.window.showOpenDialog({
    //  canSelectFiles: false,
    //  canSelectFolders: true,
    //  canSelectMany: false,
    //  openLabel: 'Select Directory'
    //});
    //
    //if (!uri) {
    //  vscode.window.showWarningMessage('No directory selected');
    //  return;
    //}
    //
    //const selectedDirectory = uri[0].fsPath;
    //
    //// Fill current with the selected directory
    //item.value = selectedDirectory;
    //
    ////Edit the object again
    //await this.updateItem(item, id);
    //
    ////Send command to edit the object
    //vscode.commands.executeCommand('codearchitect.editObject', item.jsonPath, item.filePath);
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

    if (item?.contextValue?.includes('root')) {
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

  async updateItem(item: Item, id: string): Promise<void> {
    //  if (!this.rootPath) {
    //    vscode.window.showInformationMessage('No folder or workspace opened');
    //    return;
    //  }
    //
    //  const parentJSON = JSON.parse(fs.readFileSync(item.filePath, 'utf-8'));
    //
    //  const updateItemInJSON = (jsonObject: any, item: Item): void => {
    //    let current = jsonObject;
    //    for (let i = 0; i < item.jsonPath.length - 1; i++) {
    //      const key = item.jsonPath[i];
    //      if (!current[key]) {
    //        current[key] = {}; // Initialize if not exist
    //      }
    //      current = current[key];
    //    }
    //
    //    const lastKey = item.jsonPath[item.jsonPath.length - 1];
    //    if (item.value !== undefined) {
    //      current[lastKey] = item.value;
    //    }
    //
    //    item.hidden_children.forEach((child) => {
    //      let childCurrent = jsonObject;
    //      for (let i = 0; i < child.jsonPath.length - 1; i++) {
    //        const key = child.jsonPath[i];
    //        if (!childCurrent[key]) {
    //          childCurrent[key] = {}; // Initialize if not exist
    //        }
    //        childCurrent = childCurrent[key];
    //      }
    //      const childLastKey = child.jsonPath[child.jsonPath.length - 1];
    //      if (child.value !== childCurrent[childLastKey] && childLastKey === '$label' &&
    //        item?.contextValue?.includes('root')) {
    //        //Change the name of the file
    //        const newFilePath = path.join(this.rootPath, `${child.value}.json`);
    //        fs.renameSync(item.filePath, newFilePath);
    //        item.filePath = newFilePath;
    //      }
    //      if (child.value !== undefined) {
    //        if (childLastKey === '$id') {
    //        }
    //        childCurrent[childLastKey] = child.value;
    //      }
    //      if (child.children.length > 0) {
    //        updateItemInJSON(jsonObject, child);
    //      }
    //    });
    //  };
    //
    //  updateItemInJSON(parentJSON, item);
    //
    //  const jsonUpdated = this.findObjectByID(id, parentJSON);
    //
    //  interface Link {
    //    $id: string;
    //    $label: string;
    //    $jsonPath: string[];
    //    $tags: string[];
    //    $visibility: string;
    //  }
    //
    //  if (parentJSON?.$links.length != 0) {
    //    (parentJSON.$links as Link[]).forEach((link: Link) => {
    //      if (link.$id === jsonUpdated?.$id) {
    //        if (jsonUpdated?.$label)
    //          link.$label = jsonUpdated.$label;
    //        if (jsonUpdated?.visibility)
    //          link.$visibility = jsonUpdated.visibility;
    //      }
    //    });
    //  }
    //
    //  try {
    //    fs.writeFileSync(item.filePath, JSON.stringify(parentJSON, null, 2), 'utf-8');
    //    vscode.window.showInformationMessage(`Item ${item.$label} updated successfully!`);
    //    this.refresh();
    //  } catch (error) {
    //    const errorMessage = (error instanceof Error) ? error.message : String(error);
    //    vscode.window.showErrorMessage(`Failed to update item: ${errorMessage}`);
    //  }
  }
}

export class Item extends vscode.TreeItem {
  public children: Item[]; // Add children[] property

  constructor(
    public readonly $label: string,
    public readonly schema: any,
    public filePath: string,
    public jsonPath: string[] = [], // New property to track JSON path
    public root_schema: any,
    public parentJsonPath: string[]
  ) {
    super($label, vscode.TreeItemCollapsibleState.Collapsed);
    if (this.schema?.title) {
      this.description = this.schema?.title;
      //this.tooltip = this.schema?.title;
    }

    if (this.schema?.vscodeIcon) {
      this.iconPath = new vscode.ThemeIcon(this.schema?.vscodeIcon);
    }

    if (this.schema?.modelType) {
      this.contextValue = this.schema?.modelType;
      if (this.schema.modelType === 'root') {
        this.contextValue += ".rm";
      } else if (this.schema.modelType === 'parent-object') {
        this.contextValue += ".add";
        this.contextValue += ".rm";
        this.contextValue += ".duplicate";
      } else if (this.schema.modelType === 'folder') {
        this.contextValue += ".add";
      }
    } else {
      this.contextValue = "";
    }

    if (this.schema?.commands && this.schema?.commands.length != 0) {
      this.contextValue += ".command";
    }

    this.command = { command: 'codearchitect.editObject', title: 'Edit Object', arguments: [this.jsonPath, this.filePath] };

    this.children = []; // Initialize children[] as an empty array
  }
}