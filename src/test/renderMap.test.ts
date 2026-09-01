import * as assert from 'assert';
import { renderMap } from '../renderMap';

// マップの描画
suite('renderMap', () => {
	// アクティビティが、アウトラインの順で1つの行コンテナに横一列に並ぶ
	test('renders activities in one row container in outline order', () => {
		const outline = '- 活動A\n- 活動B\n- 活動C';

		const html = renderMap(outline);

		// 行コンテナは1つだけ
		assert.strictEqual((html.match(/class="activity-row"/g) ?? []).length, 1);
		// 各アクティビティがカードとして含まれる
		assert.ok(html.includes('<div class="activity">活動A</div>'));
		assert.ok(html.includes('<div class="activity">活動B</div>'));
		assert.ok(html.includes('<div class="activity">活動C</div>'));
		// アウトラインの順序が保たれている
		const positions = ['活動A', '活動B', '活動C'].map(name => html.indexOf(name));
		assert.deepStrictEqual(positions, [...positions].sort((a, b) => a - b));
	});

	// 行コンテナには横並び（flex）のスタイルが付いている
	test('styles the activity row as a horizontal flex container', () => {
		const html = renderMap('- 活動A\n- 活動B');

		assert.ok(/\.activity-row\s*\{[^}]*display:\s*flex/.test(html));
	});

	// アクティビティのカードには枠線が付き、カード同士の間隔があいている
	test('draws a border around each activity and puts a gap between them', () => {
		const html = renderMap('- 活動A\n- 活動B');

		// カードに枠線
		assert.ok(/\.activity\s*\{[^}]*border:/.test(html));
		// 行コンテナに間隔
		assert.ok(/\.activity-row\s*\{[^}]*gap:/.test(html));
	});

	// 背景は白である
	test('has a white background', () => {
		const html = renderMap('- 活動A');

		assert.ok(/body\s*\{[^}]*background:\s*white/.test(html));
	});

	// 文字色は黒である
	test('has black text color', () => {
		const html = renderMap('- 活動A');

		assert.ok(/body\s*\{[^}]*color:\s*black/.test(html));
	});
});
