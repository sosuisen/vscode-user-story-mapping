import * as vscode from 'vscode';
import { renderMap } from './renderMap';

export function openPreview(document: vscode.TextDocument): vscode.WebviewPanel {
	const panel = vscode.window.createWebviewPanel(
		'userStoryMapping.preview',
		'User Story Map',
		vscode.ViewColumn.Beside,
		{}
	);
	panel.webview.html = renderMap(document.getText());
	const subscription = vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document === document) {
			panel.webview.html = renderMap(document.getText());
		}
	});
	panel.onDidDispose(() => subscription.dispose());
	return panel;
}
