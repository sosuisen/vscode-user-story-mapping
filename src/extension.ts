import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "user-story-mapping" is now active!');

	const disposable = vscode.commands.registerCommand('user-story-mapping.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from User Story Mapping!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
