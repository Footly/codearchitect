import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ItemTreeProvider, Item } from './tree';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { runCustomCommand, Command } from './customCommand';
import { PropertiesWebviewViewProvider } from './WebviewProvider';

let schemas: any = [];
let itemTreeProvider: ItemTreeProvider; // Declare the itemTreeProvider variable at the top level
let itemTreeView: vscode.TreeView<Item> | undefined; // To keep a reference to the tree view

export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('codearchitect');
    const pathModels = config.get<string>('pathModels', '');
    const pathProjects = config.get<string>('pathProjects', '');

    const readSchemaFiles = async (pathModels: string, pathProjects: string) => {
        try {
            const files = await fs.promises.readdir(pathModels);

            const schemaFiles = files.filter(file => file.endsWith('.model.json'));

            if (schemaFiles.length === 0) {
                vscode.window.showErrorMessage('No model files found in the model directory.');
                return;
            }

            const schemaPromises = schemaFiles.map(async (file) => {
                const pathFileProfile = path.join(pathModels, file);
                try {
                    const data = await fs.promises.readFile(pathFileProfile, 'utf8');
                    const jsonData = JSON.parse(data);

                    if (jsonData?.root === true) {
                        // Dereference the schema
                        const dereferencedSchema = await $RefParser.bundle(pathFileProfile);
                        schemas.push(dereferencedSchema);
                    }

                } catch (fileError) {
                    vscode.window.showErrorMessage(`Error processing file ${file}: ${fileError}`);
                }
            });

            await Promise.all(schemaPromises);

            if (schemas.length !== 0) {
                initializeSchemaTree(pathProjects, schemas);
            } else {
                vscode.window.showErrorMessage('No valid schema files found in the schema directory.');
            }

        } catch (err) {
            vscode.window.showErrorMessage('Error reading the schema directory.');
        }
    };

    const initializeSchemaTree = (pathProjects: string, schemas: any[]) => {
        try {
            const files = fs.readdirSync(pathProjects);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            if (jsonFiles.length > 0) {
                vscode.window.showInformationMessage('JSON files found in the projects directory.');
            } else {
                vscode.window.showWarningMessage('No JSON files found in the projects directory.');
            }
        } catch (err) {
            vscode.window.showErrorMessage('Error reading the projects directory.');
            return;
        }

        if (itemTreeView) {
            itemTreeProvider.schemas = schemas;
            return;
        }

        try {
            itemTreeProvider = new ItemTreeProvider(pathProjects, schemas);
            itemTreeView = vscode.window.createTreeView('codearchitect-treeview', { treeDataProvider: itemTreeProvider });
            itemTreeView.onDidChangeSelection((event) => {
                const selectedItem = event.selection[0];
                // Perform actions based on the selected item
                // ...
            });
        } catch (error) {
            vscode.window.showErrorMessage('Error initializing the schema tree.');
        }
    };

    // Registering commands
    const helloWorldCommand = vscode.commands.registerCommand('codearchitect.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from codearchitect!');
    });

    const newProjectCommand = vscode.commands.registerCommand('codearchitect.newProject', async () => {
        await itemTreeProvider.createParent();
        await new Promise(resolve => setTimeout(resolve, 150));
        const newItem = itemTreeProvider.getLastItemCreated();
        if (newItem) {
            vscode.commands.executeCommand('codearchitect.editObject', newItem.jsonPath, newItem.filePath);
        }
    });

    const refreshProjectsCommand = vscode.commands.registerCommand('codearchitect.refresh', async () => {
        schemas = [];
        await readSchemaFiles(pathModels, pathProjects);
        itemTreeProvider.refresh();
    });

    const removeItemCommand = vscode.commands.registerCommand('codearchitect.removeItem', async (item) => {
        await itemTreeProvider.removeItem(item);
    });

    const addItemCommand = vscode.commands.registerCommand('codearchitect.addItem', async (item) => {
        const jsonPath = item.jsonPath;
        const filePath = item.filePath;
        await itemTreeProvider.createChildFrom(item);
        await new Promise(resolve => setTimeout(resolve, 150));
        const parentObject = itemTreeProvider.getItem(jsonPath, filePath);
        if (parentObject) {
            await itemTreeView?.reveal(parentObject, { expand: true });
            await new Promise(resolve => setTimeout(resolve, 150));
            const newItem = itemTreeProvider.getLastItemCreated();
            if (newItem) {
                vscode.commands.executeCommand('codearchitect.editObject', newItem.jsonPath, newItem.filePath);
            }
        }
    });

    const customCommand = vscode.commands.registerCommand('codearchitect.customCommand', async (item: Item) => {
        const commands: Command[] = item.schema.commands;
        const options: Array<[string, number]> = [];

        commands.forEach((command, index) => {
            options.push([command.title, index]);
        });

        if (options.length === 0) {
            vscode.window.showWarningMessage('No Command available for this item');
            return;
        }

        const optionName = await vscode.window.showQuickPick(options.map(option => option[0]), { placeHolder: 'Select command to execute' });

        if (!optionName) {
            vscode.window.showWarningMessage('Command cancelled');
            return;
        }

        const selectedIndex = options.find(option => option[0] === optionName)?.[1];
        if (selectedIndex === undefined) {
            vscode.window.showWarningMessage('Invalid selection');
            return;
        }

        const selectedCommand = commands[selectedIndex];

        vscode.window.showInformationMessage(`You selected: ${selectedCommand.title}\n`);

        const rootJSON = JSON.parse(fs.readFileSync(item.filePath, 'utf8'));

        let current = rootJSON;
        for (const key of item.jsonPath) {
            current = current[key];
        }

        await runCustomCommand(current, item.filePath, selectedCommand);
    });

    const handleMessage = (message: any) => {
        //// Handle the message received from the webview
        //// You can perform actions based on the message content
        if (message.command === 'saveObject') {
            itemTreeProvider.saveObject(message.json, message.jsonPath, message.jsonFile);
        }
    }

    const editObjectCommand = vscode.commands.registerCommand('codearchitect.editObject', async (jsonPath: string[], filePath: string) => {
        const item = itemTreeProvider.getItem(jsonPath, filePath);
        if (!item)
            return;

        await itemTreeView?.reveal(item, { select: true, focus: true });
        //Edit the object
        propertiesWebviewProvider.updateWebview(item.schema, item.filePath, item.jsonPath);
    });

    context.subscriptions.push(vscode.commands.registerCommand('codearchitect.navigateBack', async (item: Item) => {
        itemTreeProvider.navigateBack(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('codearchitect.navigateForward', async (item: Item) => {
        itemTreeProvider.navigateForward(item);
    }));

    // Register the Webview View provider
    const propertiesWebviewProvider = new PropertiesWebviewViewProvider(context.extensionUri, handleMessage);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codearchitect-properties', propertiesWebviewProvider)
    );

    readSchemaFiles(pathModels, pathProjects);

    context.subscriptions.push(helloWorldCommand);
    context.subscriptions.push(newProjectCommand);
    context.subscriptions.push(refreshProjectsCommand);
    context.subscriptions.push(addItemCommand);
    context.subscriptions.push(editObjectCommand);
    context.subscriptions.push(removeItemCommand);
    context.subscriptions.push(customCommand);
}

export function deactivate() { }
