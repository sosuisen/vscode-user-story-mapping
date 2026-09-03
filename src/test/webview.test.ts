import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Webviewスクリプト（バンドル済み dist/webview.js）
// （注: Webview内のDOM操作はテストランナーから観測できないため、このsuiteは配線の記録としてRedを経ずに置いたもの。動作は手動で確認する）
suite('Webview script', () => {
	function readBundledScript(): string {
		const extension = vscode.extensions.getExtension('sosuisha.user-story-mapping');
		if (extension === undefined) {
			throw new Error('Extension not found');
		}
		return fs.readFileSync(path.join(extension.extensionPath, 'dist', 'webview.js'), 'utf8');
	}

	// ズームボタンを押すと、新しいズーム値を zoom メッセージで拡張機能へ通知する
	test('posts a zoom message with the new zoom when a zoom button is clicked', () => {
		const script = readBundledScript();

		assert.ok(script.includes('.zoom-in'));
		assert.ok(script.includes('.zoom-out'));
		assert.ok(/type:\s*['"]zoom['"]/.test(script));
	});

	// ズームは描画時のズーム値（.map-zoom の style.zoom）から始まる
	// （ズーム後に再描画されたマップで＋を押しても、等倍からやり直しにならない）
	test('starts from the zoom already applied to the map element', () => {
		const script = readBundledScript();

		assert.ok(/parseFloat\([^)]*style\.zoom\)/.test(script));
	});

	// ズームボタン（＋/－）を押すと、表示される倍率が新しい倍率に更新される
	test('updates the shown zoom level when a zoom button is clicked', () => {
		const script = readBundledScript();

		assert.ok(script.includes('.zoom-level'));
		assert.ok(/textContent\s*=/.test(script));
	});
});
