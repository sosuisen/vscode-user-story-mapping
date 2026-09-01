import * as assert from 'assert';
import * as vscode from 'vscode';
import { openPreview } from '../preview';

// パネルとの配線
suite('openPreview', () => {
	// アウトラインを渡すと、renderMapの結果がWebviewのHTMLに反映される
	test('sets the rendered map as the webview html', () => {
		const panel = openPreview('- 活動A\n- 活動B');

		assert.ok(panel.webview.html.includes('class="activity-row"'));
		assert.ok(panel.webview.html.includes('活動A'));
		assert.ok(panel.webview.html.includes('活動B'));
		panel.dispose();
	});
});
