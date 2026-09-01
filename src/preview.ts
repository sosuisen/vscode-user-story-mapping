import * as vscode from 'vscode';
import { renderMap } from './renderMap';

export function openPreview(outline: string): vscode.WebviewPanel {
	const panel = vscode.window.createWebviewPanel(
		'userStoryMapping.preview',
		'User Story Map',
		vscode.ViewColumn.Beside,
		{}
	);
	panel.webview.html = renderMap(outline);
	return panel;
}
