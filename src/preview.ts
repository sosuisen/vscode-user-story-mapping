import * as vscode from 'vscode';
import { renderMap } from './renderMap';
import { dataUrlToPngBuffer, defaultPngFileName } from './savePng';

export function openPreview(document: vscode.TextDocument, extensionUri: vscode.Uri): vscode.WebviewPanel {
	const panel = vscode.window.createWebviewPanel(
		'userStoryMapping.preview',
		'User Story Map',
		vscode.ViewColumn.Beside,
		{ enableScripts: true }
	);
	const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
	const buildHtml = () => `${renderMap(document.getText())}<script src="${scriptUri}"></script>`;
	panel.webview.html = buildHtml();
	const subscription = vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document === document) {
			panel.webview.html = buildHtml();
		}
	});
	panel.webview.onDidReceiveMessage(async (message: { type?: string; dataUrl?: string }) => {
		if (message.type === 'savePng' && typeof message.dataUrl === 'string') {
			const fileName = defaultPngFileName(document.getText());
			const target = await vscode.window.showSaveDialog({
				filters: { 'PNG Image': ['png'] },
				defaultUri: document.uri.scheme === 'file' ? vscode.Uri.joinPath(document.uri, '..', fileName) : undefined,
			});
			if (target !== undefined) {
				await vscode.workspace.fs.writeFile(target, dataUrlToPngBuffer(message.dataUrl));
			}
		}
	});
	panel.onDidDispose(() => subscription.dispose());
	return panel;
}
