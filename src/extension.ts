import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ItemTreeProvider, Item } from './tree';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { runCustomCommand, Command } from './customCommand';

let schemas: any = [];
let itemTreeProvider: ItemTreeProvider; // Declare the itemTreeProvider variable at the top level
let itemTreeView: vscode.TreeView<Item> | undefined; // To keep a reference to the tree view
let webViewPanel: vscode.WebviewPanel | undefined; // To keep a reference to the webview panel

export function activate(context: vscode.ExtensionContext) {
    const handleMessage = (message: any) => {
        try {
            // Handle the message received from the webview
            // Perform actions based on the message content
            if (message.command === 'saveObject') {
                itemTreeProvider.saveObject(message.json, message.jsonPath, message.jsonFile);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Error handling webview message.');
        }
    };

    try {
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

        const editObjectCommand = vscode.commands.registerCommand('codearchitect.editObject', async (jsonPath: string[], filePath: string) => {
            try {
                await vscode.commands.executeCommand('codearchitect.openWebview', jsonPath, filePath);
            } catch (error) {
                vscode.window.showErrorMessage('Error editing object.');
            }
        });

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
            try {
                await itemTreeProvider.createParent();
                await new Promise(resolve => setTimeout(resolve, 150));
                const newItem = itemTreeProvider.getLastItemCreated();
                if (newItem) {
                    vscode.commands.executeCommand('codearchitect.editObject', newItem.jsonPath, newItem.filePath);
                }
            } catch (error) {
                vscode.window.showErrorMessage('Error creating new project.');
            }
        });

        const refreshProjectsCommand = vscode.commands.registerCommand('codearchitect.refresh', async () => {
            try {
                schemas = [];
                await readSchemaFiles(pathModels, pathProjects);
                itemTreeProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage('Error refreshing projects.');
            }
        });

        const removeItemCommand = vscode.commands.registerCommand('codearchitect.removeItem', async (item) => {
            try {
                await itemTreeProvider.removeItem(item);
            } catch (error) {
                vscode.window.showErrorMessage('Error removing item.');
            }
        });

        const addItemCommand = vscode.commands.registerCommand('codearchitect.addItem', async (item) => {
            try {
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
            } catch (error) {
                vscode.window.showErrorMessage('Error adding item.');
            }
        });

        const customCommand = vscode.commands.registerCommand('codearchitect.customCommand', async (item: Item) => {
            try {
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
            } catch (error) {
                vscode.window.showErrorMessage('Error executing custom command.');
            }
        });

        // Command to open the webview in a new tab
        const openWebviewCommand = vscode.commands.registerCommand('codearchitect.openWebview', async (jsonPath: string[], filePath: string) => {
            const openJson = (jsonFile: string): any => {
                const filePath = path.resolve(jsonFile);
                let jsonData: any;

                try {
                    const fileContents = fs.readFileSync(filePath, 'utf8');
                    jsonData = JSON.parse(fileContents);
                } catch (error) {
                    vscode.window.showErrorMessage('Error reading or parsing JSON file. Error: ' + error);
                    return null;
                }

                return jsonData;
            };

            const handleCircularReferences = (obj: any): any => {
                try {
                    const seen = new WeakSet();

                    const processObject = (value: any): any => {
                        if (value !== null && typeof value === 'object') {
                            if (seen.has(value)) {
                                return '[Circular]';
                            }
                            seen.add(value);

                            if (Array.isArray(value)) {
                                return value.map(processObject);
                            } else {
                                const output: any = {};
                                for (const key in value) {
                                    if (value.hasOwnProperty(key)) {
                                        output[key] = processObject(value[key]);
                                    }
                                }
                                return output;
                            }
                        }
                        return value;
                    };

                    return processObject(obj);
                } catch (error) {
                    vscode.window.showErrorMessage('Error handling circular references. Error: ' + error);
                    return null;
                }
            };

            const updateWebview = (webview: vscode.Webview, schema: any, jsonFile: string, jsonPath: string[]) => {
                try {
                    if (webview) {
                        const json = openJson(jsonFile);

                        webview.postMessage({
                            command: 'editObject',
                            schema: handleCircularReferences(schema),
                            json: json,
                            jsonPath: jsonPath,
                            jsonFile: jsonFile
                        });
                    }
                } catch (error) {
                    vscode.window.showErrorMessage('Error updating webview. Error: ' + error);
                }
            };

            const getWebviewOptions = (): vscode.WebviewOptions => {
                try {
                    return {
                        enableScripts: true,
                        localResourceRoots: [
                            vscode.Uri.joinPath(context.extensionUri, 'resources', 'webview', 'media'),
                            vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode-elements', 'elements', 'dist'),
                            vscode.Uri.joinPath(context.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist'),
                        ]
                    };
                } catch (error) {
                    vscode.window.showErrorMessage('Error getting webview options. Error: ' + error);
                    return { enableScripts: true };
                }
            };

            try {
                // If the webViewPanel exists but is disposed, recreate it
                if (webViewPanel && webViewPanel.viewColumn === vscode.ViewColumn.One) {
                    webViewPanel.reveal(vscode.ViewColumn.One);
                    const item = itemTreeProvider.getItem(jsonPath, filePath);
                    if (item) {
                        updateWebview(webViewPanel.webview, item.schema, item.filePath, jsonPath);
                    }
                    return;  // Exit the function if the panel is just refreshed
                }

                // Create a new webview panel
                const panel = vscode.window.createWebviewPanel(
                    'codearchitectWebview',  // Webview identifier
                    'Code Architect',         // Title of the panel
                    vscode.ViewColumn.One,    // Display in the first editor column
                    getWebviewOptions()
                );

                panel.iconPath = {
                    light: vscode.Uri.file(path.join(context.extensionPath, 'resources', 'light', 'code-architect.svg')),
                    dark: vscode.Uri.file(path.join(context.extensionPath, 'resources', 'dark', 'code-architect.svg'))
                };

                const webview = panel.webview;
                const indexPath = vscode.Uri.file(path.join(context.extensionUri.path, 'resources', 'webview', 'media', 'index.html'));
                let html = fs.readFileSync(indexPath.fsPath, 'utf8');

                const codiconCss = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'webview', 'media', 'codicon.css'));
                const styleCss = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'webview', 'media', 'style.css'));
                const indexJs = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'webview', 'media', 'index.js'));
                const bundledJs = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'resources', 'webview', 'media', 'bundled.js'));

                html = html.replace('codicon.css', codiconCss.toString());
                html = html.replace('style.css', styleCss.toString());
                html = html.replace('index.js', indexJs.toString());
                html = html.replace('bundled.js', bundledJs.toString());

                panel.webview.html = html;

                panel.webview.onDidReceiveMessage((message) => {
                    handleMessage(message);  // Update this to handle specific messages
                });

                panel.onDidDispose(() => {
                    webViewPanel = undefined;
                });

                panel.onDidChangeViewState((event) => {
                    if (event.webviewPanel.active) {
                        const item = itemTreeProvider.getItem(jsonPath, filePath);
                        if (item) {
                            updateWebview(webview, item.schema, item.filePath, jsonPath);
                        }
                    }
                });

                const item = itemTreeProvider.getItem(jsonPath, filePath);
                if (!item) return;

                await itemTreeView?.reveal(item, { select: true, focus: true });

                webViewPanel = panel;

                updateWebview(webview, item.schema, item.filePath, jsonPath);

            } catch (error) {
                vscode.window.showErrorMessage('Error opening webview. Error: ' + error);
            }
        });


        // Other existing commands...
        context.subscriptions.push(vscode.commands.registerCommand('codearchitect.navigateBack', async (item: Item) => {
            try {
                itemTreeProvider.navigateBack(item);
            } catch (error) {
                vscode.window.showErrorMessage('Error navigating back.');
            }
        }));

        context.subscriptions.push(vscode.commands.registerCommand('codearchitect.navigateForward', async (item: Item) => {
            try {
                itemTreeProvider.navigateForward(item);
            } catch (error) {
                vscode.window.showErrorMessage('Error navigating forward.');
            }
        }));

        // Initialize schema reading and tree view
        readSchemaFiles(pathModels, pathProjects);

        // Register commands
        context.subscriptions.push(helloWorldCommand);
        context.subscriptions.push(newProjectCommand);
        context.subscriptions.push(refreshProjectsCommand);
        context.subscriptions.push(addItemCommand);
        context.subscriptions.push(removeItemCommand);
        context.subscriptions.push(customCommand);
        context.subscriptions.push(openWebviewCommand); // Register the new webview command
        context.subscriptions.push(editObjectCommand);
    } catch (error) {
        vscode.window.showErrorMessage('Error during extension activation.');
    }
}

export function deactivate() {
    // Add any cleanup logic here if needed
}
