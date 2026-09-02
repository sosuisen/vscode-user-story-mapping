import * as assert from 'assert';
import * as vscode from 'vscode';

// Preview as User Story Map ボタン
suite('Preview as User Story Map button', () => {
	// mdファイルのとき、エディタ右上にPreview as User Story Mapボタンが表示される設定である
	test('shows the Preview as User Story Map button in the editor title for md files', () => {
		const extension = vscode.extensions.getExtension('hidekazu-kubota.user-story-mapping');
		assert.ok(extension);
		const contributes = extension.packageJSON.contributes;

		const command = contributes.commands.find(
			(c: { command: string }) => c.command === 'user-story-mapping.preview'
		);
		assert.ok(command);
		assert.strictEqual(command.title, 'Preview as User Story Map');

		const editorTitleMenus = contributes.menus?.['editor/title'] ?? [];
		const entry = editorTitleMenus.find(
			(m: { command: string }) => m.command === 'user-story-mapping.preview'
		);
		assert.ok(entry);
		assert.strictEqual(entry.when, 'resourceLangId == markdown');
		assert.strictEqual(entry.group, 'navigation');
	});

	// mdファイルのエディタ内右クリックメニューに、Preview as User Story Mapが表示される設定である
	test('shows Preview as User Story Map in the editor context menu for md files', () => {
		const extension = vscode.extensions.getExtension('hidekazu-kubota.user-story-mapping');
		assert.ok(extension);

		const editorContextMenus = extension.packageJSON.contributes.menus?.['editor/context'] ?? [];
		const entry = editorContextMenus.find(
			(m: { command: string }) => m.command === 'user-story-mapping.preview'
		);
		assert.ok(entry);
		assert.strictEqual(entry.when, 'resourceLangId == markdown');
	});

	// previewコマンドにmapアイコンが設定されている（標準のプレビューアイコンと区別するため）
	test('has the map icon on the preview command', () => {
		const extension = vscode.extensions.getExtension('hidekazu-kubota.user-story-mapping');
		assert.ok(extension);
		const command = extension.packageJSON.contributes.commands.find(
			(c: { command: string }) => c.command === 'user-story-mapping.preview'
		);
		assert.ok(command);
		assert.strictEqual(command.icon, '$(map)');
	});
});
