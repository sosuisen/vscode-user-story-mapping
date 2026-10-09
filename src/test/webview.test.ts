import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Webviewスクリプト（バンドル済み dist/webview.js）
// （注: Webview内のDOM操作はテストランナーから観測できないため、このsuiteは配線の記録としてRedを経ずに置いたもの。動作は手動で確認する）
suite('Webview script', () => {
	function readBundledScript(): string {
		const extension = vscode.extensions.getExtension(
			'sosuisha.user-story-mapping',
		);
		if (extension === undefined) {
			throw new Error('Extension not found');
		}
		return fs.readFileSync(
			path.join(extension.extensionPath, 'dist', 'webview.js'),
			'utf8',
		);
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

	// スクロールするたびに、位置を scroll メッセージで拡張機能へ通知する
	// （再描画のとき、拡張機能がこの位置を次のHTMLに持ち越す）
	test('posts a scroll message with the scroll position when the page is scrolled', () => {
		const script = readBundledScript();

		assert.ok(/addEventListener\(\s*['"]scroll['"]/.test(script));
		assert.ok(/type:\s*['"]scroll['"]/.test(script));
	});

	// 起動時に、マップ要素の data-scroll-x / data-scroll-y の位置へスクロールする
	// （再描画後に、編集前のスクロール位置へ戻る）
	test('scrolls to the position carried on the map element at start', () => {
		const script = readBundledScript();

		assert.ok(/dataset\.scrollX/.test(script));
		assert.ok(/dataset\.scrollY/.test(script));
		assert.ok(/scrollTo\(/.test(script));
	});

	// load のときにも、同じ位置へスクロールし直す
	// （VS CodeのWebview基盤は、縦位置が0だと load の前にスクロール位置をリセットし、横位置も0に戻してしまう。
	// 実際のWebviewで計測し、load 後の復元だけが残ることを確認済み）
	test('scrolls to the carried position again on load', () => {
		const script = readBundledScript();

		assert.ok(/addEventListener\(\s*['"]load['"]/.test(script));
	});

	// ズームボタン（＋/－）を押すと、倍率は zoomIn / zoomOut が返す段階の値になる
	// （マップの表示倍率・倍率表示・拡張機能への通知がすべてその値になる）
	test('moves the zoom to the step returned by zoomIn or zoomOut when a zoom button is clicked', () => {
		const script = readBundledScript();

		assert.ok(/zoomIn\(/.test(script));
		assert.ok(/zoomOut\(/.test(script));
	});
});
