import * as assert from 'assert';
import * as vscode from 'vscode';

// プレビューパネル
suite('Preview panel', () => {
	// previewコマンドを実行すると、プレビューパネルがエディタの横に表示される
	// （エディタ右上のボタンとエディタ内の右クリックメニューは同じコマンドを実行するため、どちらの経路もこのテストが記録している）
	test('opens the preview panel beside the editor when the preview command runs', async () => {
		const document = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '- Activity A'
		});
		await vscode.window.showTextDocument(document, vscode.ViewColumn.One);

		await vscode.commands.executeCommand('user-story-mapping.preview');

		// タブへの反映は非同期のため、2列目にWebviewタブが現れるまで待つ
		const findPreviewTab = () => {
			const group = vscode.window.tabGroups.all.find(
				g => g.viewColumn === vscode.ViewColumn.Two
			);
			return group?.tabs.find(
				t =>
					t.input instanceof vscode.TabInputWebview &&
					t.input.viewType.includes('userStoryMapping.preview')
			);
		};
		const start = Date.now();
		while (!findPreviewTab() && Date.now() - start < 5000) {
			await new Promise(resolve => setTimeout(resolve, 50));
		}

		const tab = findPreviewTab();
		assert.ok(tab);
		await vscode.window.tabGroups.close(tab);
	});
});
