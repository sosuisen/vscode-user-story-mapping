import * as vscode from 'vscode';
import { openPreview } from './preview';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('user-story-mapping.preview', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			openPreview(editor.document.getText());
		}
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}
