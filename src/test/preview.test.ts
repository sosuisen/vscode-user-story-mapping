import * as assert from 'assert';
import * as vscode from 'vscode';
import { openPreview } from '../preview';

// パネルとの配線
suite('openPreview', () => {
	// ドキュメントを渡すと、renderMapの結果がWebviewのHTMLに反映される
	test('sets the rendered map as the webview html', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- 活動A\n- 活動B' });
		const panel = openPreview(document);

		assert.ok(panel.webview.html.includes('class="map-grid"'));
		assert.ok(panel.webview.html.includes('活動A'));
		assert.ok(panel.webview.html.includes('活動B'));
		panel.dispose();
	});

	// プレビュー中のドキュメントを編集すると、Webviewが新しい内容で更新される
	test('updates the webview when the previewed document changes', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- 活動A' });
		const panel = openPreview(document);

		const edit = new vscode.WorkspaceEdit();
		edit.insert(document.uri, document.positionAt(document.getText().length), '\n- 活動B');
		await vscode.workspace.applyEdit(edit);

		assert.ok(panel.webview.html.includes('活動B'));
		panel.dispose();
	});

	// プレビュー対象ではないドキュメントの編集では更新されない
	// （注: 対象テキストのみで再描画するためHTMLは元々変わらず、このテストは仕様の記録としてRedを経ずに置いたもの）
	test('does not update the webview when another document changes', async () => {
		const previewed = await vscode.workspace.openTextDocument({ content: '- 活動A' });
		const other = await vscode.workspace.openTextDocument({ content: '- 別の活動' });
		const panel = openPreview(previewed);
		const before = panel.webview.html;

		const edit = new vscode.WorkspaceEdit();
		edit.insert(other.uri, other.positionAt(other.getText().length), '\n- 活動X');
		await vscode.workspace.applyEdit(edit);

		assert.strictEqual(panel.webview.html, before);
		panel.dispose();
	});

	// パネルを閉じた後の編集でもエラーなく動く（監視は解除される）
	// （注: 解除漏れの例外はVSCodeが握りつぶすため外から観測できず、このテストも仕様の記録としてRedを経ずに置いたもの）
	test('keeps working after the panel is disposed', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- 活動A' });
		const panel = openPreview(document);
		panel.dispose();

		const edit = new vscode.WorkspaceEdit();
		edit.insert(document.uri, document.positionAt(document.getText().length), '\n- 活動B');
		const applied = await vscode.workspace.applyEdit(edit);

		assert.ok(applied);
	});
});
