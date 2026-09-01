import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('user-story-mapping.preview', () => {
		vscode.window.createWebviewPanel(
			'userStoryMapping.preview',
			'User Story Map',
			vscode.ViewColumn.Beside,
			{}
		);
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}
