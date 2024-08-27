import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Item } from './tree'; // Assuming 'Item' is imported from another file

export class JsonFileHandler {
    private rootPath: string;
    private itemMap: Map<string, Item>;
    private schemas: any[];

    constructor(rootPath: string, itemMap: Map<string, Item>, schemas: any[]) {
        this.rootPath = rootPath;
        this.itemMap = itemMap;
        this.schemas = schemas;
    }

    public async getParentItems(): Promise<Item[]> {
        if (!this.rootPath) {
            vscode.window.showInformationMessage('No folder or workspace opened');
            return [];
        }

        const files = fs.readdirSync(this.rootPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        jsonFiles.forEach(file => {
            const filePath = path.join(this.rootPath, file);
            if (!this.itemMap.has(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const rootSchema = JSON.parse(content);

                if (!rootSchema.$model) {
                    vscode.window.showWarningMessage(`$model not found for ${file}`);
                    return;
                }

                const schema = this.schemas.find(schema => schema.$id === rootSchema.$model);
                if (!schema) {
                    vscode.window.showWarningMessage(`model ${rootSchema.$model} not found for ${file}`);
                    return;
                }

                const item = new Item(
                    path.basename(file, '.json'),
                    schema,
                    filePath,
                    [],
                    schema,
                    []
                );

                this.itemMap.set(filePath + item.jsonPath.join('/'), item);
            }
        });

        return Array.from(this.itemMap.values());
    }
}
