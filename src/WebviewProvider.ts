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
		this._view = webviewView;
		webviewView.webview.options = this.getWebviewOptions();

		this._view.webview.onDidReceiveMessage(message => {
			this._messageHandler(message);
		});

		// Set the initial HTML content
		this.initWebview();
	}

	updateWebview(schema: any, jsonFile: string, jsonPath: string[]) {
		if (this?._view?.webview) {
			// Step 1: Create the JSON object
			const json = this.openJson(jsonFile);

			// Step 2: Send the JSON object to the webview
			this._view.webview.postMessage({
				command: 'editObject',
				schema: schema,
				json: json,
				jsonPath: jsonPath,
				jsonFile: jsonFile
			});
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
			console.error('Error reading or parsing JSON file:', error);
			return null;
		}

		// Step 3: Navigate to the desired path within the JSON object
		return jsonData;
	}

	private getWebviewOptions(): vscode.WebviewOptions {
		return {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'media'),
				vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode-elements', 'elements', 'dist'),
				vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist'),
			]
		};
	}

	private initWebview() {
		if (!this._view) {
			return;
		}

		const webview = this._view.webview;
		const filePath = vscode.Uri.file(path.join(this.extensionUri.path, 'src', 'webview', 'media', 'index.html'));
		let html = fs.readFileSync(filePath.fsPath, 'utf8');

		const codiconCss = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));
		const styleCss = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'media', 'style.css'));
		const indexJs = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'webview', 'media', 'index.js'));
		const bundledJs = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@vscode-elements', 'elements', 'dist', 'bundled.js'));

		html = html.replace('codicon.css', codiconCss.toString());
		html = html.replace('style.css', styleCss.toString());
		html = html.replace('index.js', indexJs.toString());
		html = html.replace('bundled.js', bundledJs.toString());

		this._view.webview.html = html;
	}
}