// JsonTreeDecoder.ts
import * as vscode from 'vscode';
import { Item } from './tree'; // Assuming 'Item' is imported from another file
import { resolveRef } from './SchemaUtils'; // Import resolveRef from SchemaUtils

export class JsonTreeDecoder {
    private itemMap: Map<string, Item>;
    private childrenAdded: boolean; // New property to track if children were added

    constructor(itemMap: Map<string, Item>) {
        this.itemMap = itemMap;
        this.childrenAdded = false; // Initialize to false
    }

    public decode(
        jsonObject: any,
        schemaItem: any,
        parentPath: string[],
        parent: Item
    ): void {
        let schema = schemaItem;

        try {
            if (Array.isArray(jsonObject)) {
                this.processArray(jsonObject, schema, parentPath, parent);
            } else if (typeof jsonObject === 'object' && jsonObject !== null) {
                this.processObject(jsonObject, schema, parentPath, parent);
            } else {
                vscode.window.showErrorMessage('Unsupported JSON data type');
                return;
            }

            // Check if parent has any children and update collapsibleState accordingly
            if (!this.childrenAdded) {
                parent.collapsibleState = vscode.TreeItemCollapsibleState.None;
            } else {
                parent.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error decoding JSON: ${error}`);
        }
    }

    private createItem(
        key: string,
        keyProperties: any,
        jsonPath: string[],
        label: string | undefined,
        parent: Item
    ): Item | undefined {
        // Validate input parameters
        if (!label || !keyProperties) return undefined;

        try {
            // Use the imported resolveRef function
            const resolvedKeyProperties = resolveRef(keyProperties, parent.root_schema);

            // Return the newly created Item object
            return new Item(
                label,
                resolvedKeyProperties,
                parent.filePath,
                jsonPath,
                parent.root_schema,
                parent.jsonPath
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating item: ${error}`);
            return undefined;
        }
    }

    private processArray(
        array: any[],
        schema: any,
        parentPath: string[],
        parent: Item
    ): void {
        array.forEach((itemValue, index) => {
            const itemSchema = resolveRef(schema?.items, parent.root_schema);
            const item = this.createItem(
                index.toString(),
                itemSchema,
                parentPath.concat(index.toString()),
                itemValue?.label,
                parent
            );

            if (item) {
                this.addItemToParent(item, parent);
                this.childrenAdded = true; // Set to true when children are added
            }
        });
    }

    private processObject(
        object: { [key: string]: any },
        schema: any,
        parentPath: string[],
        parent: Item
    ): void {
        try {
            const properties = resolveRef(schema?.properties, parent.root_schema);

            Object.entries(object).forEach(([key, jsonKey]) => {
                if (typeof jsonKey !== 'object' && !Array.isArray(jsonKey)) return;

                const keyProperties = properties[key];

                if (keyProperties?.hidden === true) {
                    // Recursively process hidden objects
                    this.decode(
                        jsonKey,
                        keyProperties,
                        [...parent.jsonPath, key],
                        parent
                    );
                } else {
                    const item = this.createItem(
                        key,
                        keyProperties,
                        parentPath.concat(key),
                        key,
                        parent
                    );

                    if (item) {
                        this.addItemToParent(item, parent);
                        this.childrenAdded = true; // Set to true when children are added
                    }
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing object: ${error}`);
        }
    }

    private addItemToParent(item: Item, parent: Item): void {
        this.itemMap.set(item.filePath + item.jsonPath.join('/'), item);
        parent.children.push(item);
    }
}