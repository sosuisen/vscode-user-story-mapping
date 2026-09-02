import * as assert from 'assert';
import * as vscode from 'vscode';
import { openPreview } from '../preview';

// パネルとの配線
suite('openPreview', () => {
	function getExtensionUri(): vscode.Uri {
		const extension = vscode.extensions.getExtension('hidekazu-kubota.user-story-mapping');
		if (extension === undefined) {
			throw new Error('Extension not found');
		}
		return extension.extensionUri;
	}

	// Webviewからのメッセージをテストから流し込める偽パネル
	function createFakePanel() {
		const listeners: ((message: unknown) => void)[] = [];
		return {
			webview: {
				html: '',
				options: { enableScripts: true },
				asWebviewUri: (uri: vscode.Uri) => uri,
				onDidReceiveMessage: (listener: (message: unknown) => void) => {
					listeners.push(listener);
					return { dispose() {} };
				},
			},
			onDidDispose: () => ({ dispose() {} }),
			dispose() {},
			receiveMessage: (message: unknown) => listeners.forEach(listener => listener(message)),
		};
	}

	// ドキュメントを渡すと、renderMapの結果がWebviewのHTMLに反映される
	test('sets the rendered map as the webview html', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- Activity A\n- Activity B' });
		const panel = openPreview(document, getExtensionUri());

		assert.ok(panel.webview.html.includes('class="map-grid"'));
		assert.ok(panel.webview.html.includes('Activity A'));
		assert.ok(panel.webview.html.includes('Activity B'));
		panel.dispose();
	});

	// プレビュー中のドキュメントを編集すると、Webviewが新しい内容で更新される
	test('updates the webview when the previewed document changes', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- Activity A' });
		const panel = openPreview(document, getExtensionUri());

		const edit = new vscode.WorkspaceEdit();
		edit.insert(document.uri, document.positionAt(document.getText().length), '\n- Activity B');
		await vscode.workspace.applyEdit(edit);

		assert.ok(panel.webview.html.includes('Activity B'));
		panel.dispose();
	});

	// Webviewからズーム値の変更が通知された後にドキュメントを編集すると、再描画後のHTMLにもそのズーム値が反映されている
	test('keeps the zoom reported by the webview when the document changes', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- Activity A' });
		const panel = createFakePanel();
		openPreview(document, getExtensionUri(), panel);
		panel.receiveMessage({ type: 'zoom', zoom: 1.44 });

		const edit = new vscode.WorkspaceEdit();
		edit.insert(document.uri, document.positionAt(document.getText().length), '\n- Activity B');
		await vscode.workspace.applyEdit(edit);

		assert.ok(panel.webview.html.includes('<div class="map-zoom" style="zoom: 1.44;">'));
	});

	// ズーム値の通知を受けていなければ、再描画後のズームは等倍のまま
	// （注: 初期値1はズーム維持の実装と同時に入ったため、このテストは仕様の記録としてRedを経ずに置いたもの）
	test('renders at zoom 1 after the document changes when the webview has not reported a zoom', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- Activity A' });
		const panel = createFakePanel();
		openPreview(document, getExtensionUri(), panel);

		const edit = new vscode.WorkspaceEdit();
		edit.insert(document.uri, document.positionAt(document.getText().length), '\n- Activity B');
		await vscode.workspace.applyEdit(edit);

		assert.ok(panel.webview.html.includes('<div class="map-zoom" style="zoom: 1;">'));
	});

	// 2つのドキュメントをそれぞれプレビューし、片方のズーム値を変更しても、もう片方の再描画後のズームは変わらない
	// （注: ズーム値はパネルごとのクロージャに持つため元々独立しており、このテストはモジュール変数化を防ぐ仕様の記録としてRedを経ずに置いたもの）
	test('keeps the zoom of each preview independent', async () => {
		const zoomed = await vscode.workspace.openTextDocument({ content: '- Activity A' });
		const other = await vscode.workspace.openTextDocument({ content: '- Another Activity' });
		const zoomedPanel = createFakePanel();
		const otherPanel = createFakePanel();
		openPreview(zoomed, getExtensionUri(), zoomedPanel);
		openPreview(other, getExtensionUri(), otherPanel);
		zoomedPanel.receiveMessage({ type: 'zoom', zoom: 1.44 });

		const edit = new vscode.WorkspaceEdit();
		edit.insert(zoomed.uri, zoomed.positionAt(zoomed.getText().length), '\n- Activity B');
		edit.insert(other.uri, other.positionAt(other.getText().length), '\n- Activity X');
		await vscode.workspace.applyEdit(edit);

		assert.ok(zoomedPanel.webview.html.includes('<div class="map-zoom" style="zoom: 1.44;">'));
		assert.ok(otherPanel.webview.html.includes('<div class="map-zoom" style="zoom: 1;">'));
	});

	// プレビュー対象ではないドキュメントの編集では更新されない
	// （注: 対象テキストのみで再描画するためHTMLは元々変わらず、このテストは仕様の記録としてRedを経ずに置いたもの）
	test('does not update the webview when another document changes', async () => {
		const previewed = await vscode.workspace.openTextDocument({ content: '- Activity A' });
		const other = await vscode.workspace.openTextDocument({ content: '- Another Activity' });
		const panel = openPreview(previewed, getExtensionUri());
		const before = panel.webview.html;

		const edit = new vscode.WorkspaceEdit();
		edit.insert(other.uri, other.positionAt(other.getText().length), '\n- Activity X');
		await vscode.workspace.applyEdit(edit);

		assert.strictEqual(panel.webview.html, before);
		panel.dispose();
	});

	// PNG保存を行うWebview用スクリプト（バンドル済み）が読み込まれる
	test('loads the bundled webview script', async () => {
		const extension = vscode.extensions.getExtension('hidekazu-kubota.user-story-mapping');
		assert.ok(extension);
		const document = await vscode.workspace.openTextDocument({ content: '- Activity A' });
		const panel = openPreview(document, extension.extensionUri);

		assert.ok(/<script src="[^"]*webview\.js"><\/script>/.test(panel.webview.html));
		panel.dispose();
	});

	// ズーム操作のスクリプトが動くよう、Webviewのスクリプトを有効にしている
	test('enables scripts in the webview', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- Activity A' });
		const panel = openPreview(document, getExtensionUri());

		assert.strictEqual(panel.webview.options.enableScripts, true);
		panel.dispose();
	});

	// パネルを閉じた後の編集でもエラーなく動く（監視は解除される）
	// （注: 解除漏れの例外はVSCodeが握りつぶすため外から観測できず、このテストも仕様の記録としてRedを経ずに置いたもの）
	test('keeps working after the panel is disposed', async () => {
		const document = await vscode.workspace.openTextDocument({ content: '- Activity A' });
		const panel = openPreview(document, getExtensionUri());
		panel.dispose();

		const edit = new vscode.WorkspaceEdit();
		edit.insert(document.uri, document.positionAt(document.getText().length), '\n- Activity B');
		const applied = await vscode.workspace.applyEdit(edit);

		assert.ok(applied);
	});
});
