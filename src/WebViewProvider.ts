import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class PropertiesWebviewViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;

	constructor(private readonly extensionUri: vscode.Uri) { }

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken) {
		this._view = webviewView;
		webviewView.webview.options = this.getWebviewOptions();

		// Set the initial HTML content
		this.updateWebview();
	}

	private getWebviewOptions(): vscode.WebviewOptions {
		return {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this.extensionUri, 'media'),
				vscode.Uri.joinPath(this.extensionUri, 'node_modules'),
			]
		};
	}

	private updateWebview() {
		if (!this._view) {
			return;
		}

		const webview = this._view.webview;
		const filePath = vscode.Uri.file(path.join(this.extensionUri.path, 'media', 'index_dev.html'));
		let html = fs.readFileSync(filePath.fsPath, 'utf8');
		// Convert local paths to webview URIs
		const lightCss = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'light.css'));
		const darkCss = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'dark.css'));
		const highContrastLightCss = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'high_contrast_light.css'));
		const highContrastDarkCss = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'high_contrast_dark.css'));

		const webcomponentsLoaderJs = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', '@webcomponents', 'webcomponentsjs', 'webcomponents-loader.js'));
		const polyfillSupportJs = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'lit', 'polyfill-support.js'));
		const bundleJs = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'bundle.js'));

		html = html.replace('webcomponents-loader.js', webcomponentsLoaderJs.toString());
		html = html.replace('polyfill-support.js', polyfillSupportJs.toString());
		html = html.replace('bundle.js', bundleJs.toString());
		html = html.replace('light.css', lightCss.toString());
		html = html.replace('dark.css', darkCss.toString());
		html = html.replace('high_contrast_light.css', highContrastLightCss.toString());
		html = html.replace('high_contrast_dark.css', highContrastDarkCss.toString());

		this._view.webview.html = html;
	}
}