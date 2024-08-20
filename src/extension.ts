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

					if (jsonData?.modelType === 'root') {
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
		// Check if there are any JSON files in the pathProjects directory
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
			// Create a new tree provider and tree view
			itemTreeProvider = new ItemTreeProvider(pathProjects, schemas);
			itemTreeView = vscode.window.createTreeView('codearchitect-treeview', { treeDataProvider: itemTreeProvider });
		} catch (error) {
			vscode.window.showErrorMessage('Error initializing the schema tree.');
		}
	};

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
			vscode.commands.executeCommand('codearchitect.editObject', newItem.jsonPath, newItem.filePath);
		}
	});

	const refreshProjectsCommand = vscode.commands.registerCommand('codearchitect.refresh', async () => {
		const pathModels = config.get<string>('pathModels', '');
		const pathProjects = config.get<string>('pathProjects', '');
		//Reset schemas
		schemas = [];
		await readSchemaFiles(pathModels, pathProjects);
		itemTreeProvider.refresh();
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
				vscode.commands.executeCommand('codearchitect.editObject', newItem.jsonPath, newItem.filePath);
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
		//Get the python script
		const pyScript = config.get<string>('pathPyPreviewScript', '');

		//Get the rootJSON
		const rootJSON = JSON.parse(fs.readFileSync(item.filePath, 'utf8'));

		let current = rootJSON;
		for (const key of item.jsonPath) {
			current = current[key];
		}
		await JSON2plantuml(pyScript, item.filePath, current.$id);

		try {
			// Get the directory where the Python script is located
			const scriptDir = path.dirname(pyScript);

			// Specify the path where you want to save the PlantUML content (same directory as the Python script)
			const filePath = path.resolve(scriptDir, 'output.puml');

			// Open the file
			const document = await vscode.workspace.openTextDocument(filePath);
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

	const editObjectCommand = vscode.commands.registerCommand('codearchitect.editObject', async (jsonPath: string[], filePath: string) => {
		//Get Item form jsonPath and filePath
		const item = itemTreeProvider.getItem(jsonPath, filePath);
		if(!item)
			return;
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
		const newJsonPath = [...item.jsonPath];

		itemCopy.dependencies = [];

		while (newJsonPath.length > 0) {
			let current = rootJSON;
			for (const key of newJsonPath) {
				current = current[key];
			}
			if (current?.scope !== undefined && current?.scope !== 'parent') {
				itemCopy.dependencies = current.dependencies;
				break;
			}
			newJsonPath.pop();
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

	readSchemaFiles(pathModels, pathProjects);

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