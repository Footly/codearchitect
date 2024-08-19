import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ItemTreeProvider, Item } from './tree';
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { JSON2plantuml } from './json2plantuml';

let schemas: any = [];
let itemTreeProvider: ItemTreeProvider; // Declare the itemTreeProvider variable at the top level
let webviewPanel: vscode.WebviewView | undefined; // To keep a reference to the webview panel
let itemTreeView: vscode.TreeView<Item> | undefined; // To keep a reference to the tree view

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('codearchitect');
	const pathSchema = config.get<string>('pathSchema', '');
	const pathProjects = config.get<string>('pathProjects', '');

	if (pathSchema) {
		// Look for all .schema.json files in the pathSchema directory
		fs.readdir(pathSchema, async (err, files) => {
			if (err) {
				vscode.window.showErrorMessage('Error reading the schema directory.');
				return;
			}

			const schemaFiles = files.filter(file => file.endsWith('.schema.json'));

			if (schemaFiles.length === 0) {
				vscode.window.showErrorMessage('No schema files found in the schema directory.');
				return;
			}

			try {
				const schemaPromises = schemaFiles.map(async (file) => {
					const pathFileProfile = path.join(pathSchema, file);

					try {
						// Read file data
						const data = await fs.promises.readFile(pathFileProfile, 'utf8');

						// Parse JSON data
						const jsonData = JSON.parse(data);

						if (jsonData?.format === 'root-object') {
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
					itemTreeProvider = new ItemTreeProvider(pathProjects, schemas);
					itemTreeView = vscode.window.createTreeView('codearchitect-treeview', { treeDataProvider: itemTreeProvider });
					// Handle selection changes
					itemTreeView.onDidChangeSelection(event => {
						if (event.selection.length > 0) {
							const selectedItem = event.selection[0];
							// Handle the selected item, e.g., open or edit it
							vscode.commands.executeCommand('codearchitect.editObject', selectedItem);
						}
					});
				} else {
					vscode.window.showErrorMessage('No valid schema files found in the schema directory.');
				}
			} catch (error) {
				vscode.window.showErrorMessage('Error processing schema files.');
			}
		});
	}

	// Check if in the pathProjects directory there is any json file
	if (pathProjects) {
		fs.readdir(pathProjects, (err, files) => {
			if (err) {
				vscode.window.showErrorMessage('Error reading the projects directory.');
				return;
			}

			const jsonFiles = files.filter(file => file.endsWith('.json'));
			if (jsonFiles.length > 0) {
				vscode.window.showInformationMessage('JSON files found in the projects directory.');
			} else {
				vscode.window.showWarningMessage('No JSON files found in the projects directory.');
			}
		});
	}

	const helloWorldCommand = vscode.commands.registerCommand('codearchitect.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from codearchitect!');
	});

	const newProjectCommand = vscode.commands.registerCommand('codearchitect.newProject', async () => {
		// Call the createParent method from the tree.ts file
		await itemTreeProvider.createParent();
		//Wait 50ms for the item to be created
		await new Promise(resolve => setTimeout(resolve, 50));
		//Get the created item
		const newItem = itemTreeProvider.getLastItemCreated();
		if (newItem) {
			//Edit the created item
			vscode.commands.executeCommand('codearchitect.editObject', newItem);
		}
	});

	const refreshProjectsCommand = vscode.commands.registerCommand('codearchitect.refresh', async () => {
		// Assuming itemTreeProvider is a valid object
		if (itemTreeProvider) {
			itemTreeProvider.refresh();
			vscode.window.showInformationMessage('Projects refreshed successfully!');
		}
	});

	const removeItemCommand = vscode.commands.registerCommand('codearchitect.removeItem', async (item) => {
		await itemTreeProvider.removeItem(item);
	});

	const addItemCommand = vscode.commands.registerCommand('codearchitect.addItem', async (item) => {
		//Get JSON path from currrent parent
		const jsonPath = item.jsonPath;
		const filePath = item.filePath;
		//Create a child from the item
		await itemTreeProvider.createChildFrom(item);
		//Wait 50ms for the item to be created
		await new Promise(resolve => setTimeout(resolve, 50));
		//Get parent Object
		const parentObject = itemTreeProvider.getItem(jsonPath, filePath);
		if (parentObject) {
			//First reveal the item
			await itemTreeView?.reveal(parentObject, { expand: true });
			//Wait 50ms for the item to be created
			await new Promise(resolve => setTimeout(resolve, 50));
			//Get the created item
			const newItem = itemTreeProvider.getLastItemCreated();
			if (newItem) {
				//Edit the created item
				vscode.commands.executeCommand('codearchitect.editObject', newItem);
			}
		}
	});

	const propertiesProvider = vscode.window.registerWebviewViewProvider('codearchitect-properties', {
		resolveWebviewView: (webviewView: vscode.WebviewView) => {
			webviewPanel = webviewView; // Keep a reference to the webview panel

			// Enable scripts in the webview
			webviewView.webview.options = {
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
			};


			// Set the webview's HTML content
			webviewView.webview.html = getWebviewContent(webviewView.webview, context.extensionUri);


			// Handle messages from the webview
			webviewView.webview.onDidReceiveMessage(message => {
				handleMessage(message);
			});
		}
	});

	const previewPlantUmlCommand = vscode.commands.registerCommand('codearchitect.previewPlantuml', async (item: Item) => {
		//Get the rootJSON
		const rootJSON = JSON.parse(fs.readFileSync(item.filePath, 'utf8'));

		let current = rootJSON;
		for (const key of item.jsonPath) {
			current = current[key];
		}
		await JSON2plantuml(item.filePath, current.$id);

		try {
			const tempPath = path.resolve(__dirname, '../py_scripts/temp.puml');
			// Open the file
			const document = await vscode.workspace.openTextDocument(tempPath);
			await vscode.window.showTextDocument(document);

			//Wait 250ms for the item to be created
			await new Promise(resolve => setTimeout(resolve, 250));

			// Execute the plantuml.preview command
			await vscode.commands.executeCommand('plantuml.preview');
		} catch (error) {
			console.error('Error opening file:', error);
			vscode.window.showErrorMessage('Failed to open PlantUML file.');
		}

	});

	const editObjectCommand = vscode.commands.registerCommand('codearchitect.editObject', async (item: Item) => {
		//First reveal the item
		await itemTreeView?.reveal(item, { select: true, focus: true });
		const itemCopy = JSON.parse(JSON.stringify(item));
		// Combine children and hidden_children
		const combinedChildren = itemCopy.children.concat(itemCopy.hidden_children);

		// Create a Set to track unique labels
		const seenLabels = new Set();

		// Filter combinedChildren to only include items with unique $label values
		itemCopy.children = combinedChildren.filter((child: Item) => {
			const label = child.$label;
			if (!seenLabels.has(label)) {
				seenLabels.add(label);
				return true;
			}
			return false;
		});
		//Get the rootJSON
		const rootJSON = JSON.parse(fs.readFileSync(item.filePath, 'utf8'));
		//Open and parse the JSON file
		const $links = rootJSON.$links;
		//Add the $links to the item
		itemCopy.$links = $links;
		//Get the JSON path
		const jsonPath = [...item.jsonPath];

		itemCopy.dependencies = [];

		while (jsonPath.length > 0) {
			let current = rootJSON;
			for (const key of jsonPath) {
				current = current[key];
			}
			if (current?.$link?.scope !== undefined && current?.$link?.scope !== 'parent') {
				itemCopy.dependencies = current.$link.dependencies;
				break;
			}
			jsonPath.pop();
		}
		if (webviewPanel) {
			webviewPanel.webview.postMessage({ command: 'editObject', item: itemCopy });
		} else {
			vscode.window.showErrorMessage('Properties panel is not open.');
		}
	});

	const lookUpCommand = vscode.commands.registerCommand('codearchitect.lookUp', async (item: Item) => {
		// Given this filepath
		const filePath = item.filePath;
		const uri = vscode.Uri.file(filePath);
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document, { preview: true });
	});

	// Command to navigate back
	context.subscriptions.push(vscode.commands.registerCommand('codearchitect.navigateBack', async (item: Item) => {
		itemTreeProvider.navigateBack(item);
	}));

	// Command to navigate forward
	context.subscriptions.push(vscode.commands.registerCommand('codearchitect.navigateForward', async (item: Item) => {
		itemTreeProvider.navigateForward(item);
	}));

	context.subscriptions.push(helloWorldCommand);
	context.subscriptions.push(newProjectCommand);
	context.subscriptions.push(refreshProjectsCommand);
	context.subscriptions.push(addItemCommand);
	context.subscriptions.push(editObjectCommand);
	context.subscriptions.push(propertiesProvider);
	context.subscriptions.push(removeItemCommand);
	context.subscriptions.push(lookUpCommand);
	context.subscriptions.push(previewPlantUmlCommand);
}

export function deactivate() { }

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
	const filePath = path.join(extensionUri.fsPath, 'media', 'webview.html');
	const fileContent = fs.readFileSync(filePath, 'utf8');

	// Update paths for styles and scripts to be accessible by the webview
	const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styles.css'));
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'script.js'));

	return fileContent
		.replace(/href="styles\.css"/, `href="${stylesUri}"`)
		.replace(/src="script\.js"/, `src="${scriptUri}"`);
}

function handleMessage(message: any) {
	//// Handle the message received from the webview
	//// You can perform actions based on the message content
	if (message.command === 'saveObject') {
		// Handle the objectEdited command
		// Call the saveObject method from the tree.ts file
		itemTreeProvider.updateItem(message.item);
	} else if (message.command === 'createItem') {
		// Call the deleteObject method from the tree.ts file
		itemTreeProvider.createChildFrom(message.item);
	} else if (message.command === 'removeItem') {
		// Call the deleteObject method from the tree.ts file
		itemTreeProvider.removeItem(message.item);
	}
}