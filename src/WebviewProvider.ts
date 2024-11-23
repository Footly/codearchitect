import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class PropertiesWebviewViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _messageHandler: (message: any) => void;

	constructor(private readonly extensionUri: vscode.Uri, handle: (message: any) => void) {
		// Step 3: Add the handler message callback
		this._messageHandler = handle;
	}

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken) {
		try {
			this._view = webviewView;
			webviewView.webview.options = this.getWebviewOptions();

			this._view.webview.onDidReceiveMessage(message => {
				try {
					this._messageHandler(message);
				} catch (error) {
					vscode.window.showErrorMessage('Error handling message from webview. Error: ' + error);
				}
			});

			// Set the initial HTML content
			this.initWebview();
		} catch (error) {
			vscode.window.showErrorMessage('Error resolving webview view. Error: ' + error);
		}
	}

	// Function to handle circular references and return an object
	private handleCircularReferences(obj: any): any {
		try {
			const seen = new WeakSet();

			function processObject(value: any): any {
				if (value !== null && typeof value === 'object') {
					if (seen.has(value)) {
						return '[Circular]';
					}
					seen.add(value);

					// Process arrays and objects separately
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
			}

			return processObject(obj);
		} catch (error) {
			vscode.window.showErrorMessage('Error handling circular references. Error: ' + error);
			return null;
		}
	}

	updateWebview(schema: any, jsonFile: string, jsonPath: string[]) {
		try {
			if (this?._view?.webview) {
				// Step 1: Create the JSON object
				const json = this.openJson(jsonFile);

				// Step 2: Send the JSON object to the webview
				this._view.webview.postMessage({
					command: 'editObject',
					schema: this.handleCircularReferences(schema),
					json: json,
					jsonPath: jsonPath,
					jsonFile: jsonFile
				});
			}
		} catch (error) {
			vscode.window.showErrorMessage('Error updating webview. Error: ' + error);
		}
	}

	private openJson(jsonFile: string): any {
		// Step 1: Read the file contents
		const filePath = path.resolve(jsonFile);
		let jsonData: any;

		try {
			const fileContents = fs.readFileSync(filePath, 'utf8');

			// Step 2: Parse the file contents as JSON
			jsonData = JSON.parse(fileContents);
		} catch (error) {
			vscode.window.showErrorMessage('Error reading or parsing JSON file. Error: ' + error);
			return null;
		}

		// Step 3: Navigate to the desired path within the JSON object
		return jsonData;
	}

	private getWebviewOptions(): vscode.WebviewOptions {
		try {
			return {
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'media'),
					vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode-elements', 'elements', 'dist'),
					vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist'),
				]
			};
		} catch (error) {
			vscode.window.showErrorMessage('Error getting webview options. Error: ' + error);
			return { enableScripts: true };
		}
	}

	private initWebview() {
		try {
			if (!this._view) {
				return;
			}

			const webview = this._view.webview;
			const filePath = vscode.Uri.file(path.join(this.extensionUri.path, 'resources', 'webview', 'media', 'index.html'));
			let html = fs.readFileSync(filePath.fsPath, 'utf8');

			const codiconCss = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'media', 'codicon.css'));
			const styleCss = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'media', 'style.css'));
			const indexJs = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'media', 'index.js'));
			const bundledJs = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'media', 'bundled.js'));

			html = html.replace('codicon.css', codiconCss.toString());
			html = html.replace('style.css', styleCss.toString());
			html = html.replace('index.js', indexJs.toString());
			html = html.replace('bundled.js', bundledJs.toString());

			this._view.webview.html = html;
		} catch (error) {
			vscode.window.showErrorMessage('Error initializing webview. Error: '+ error);
		}
	}
}
