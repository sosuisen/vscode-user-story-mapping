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
		// アクティビティのカードが 活動A → 活動B → 活動C の順に並ぶ
		const cards = [...html.matchAll(/<div class="activity">([^<]*)<\/div>/g)].map(m => m[1]);
		assert.deepStrictEqual(cards, ['活動A', '活動B', '活動C']);
	});

	// 行コンテナには横並び（flex）のスタイルが付いている
	test('styles the activity row as a horizontal flex container', () => {
		const html = renderMap('- 活動A\n- 活動B');

		assert.ok(/\.activity-row\s*\{[^}]*display:\s*flex/.test(html));
	});

	// 各アクティビティの下に、そのタスクがアウトラインの順で縦に並ぶ
	test('renders tasks under their activity in outline order', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t\t- タスクA2\n- 活動B\n\t- タスクB1';

		const html = renderMap(outline);

		// アクティビティごとに列コンテナがある
		assert.strictEqual((html.match(/class="activity-column"/g) ?? []).length, 2);
		// カードが 活動A → タスクA1 → タスクA2 → 活動B → タスクB1 の順に並ぶ
		const cards = [...html.matchAll(/<div class="(?:activity|task)">([^<]*)<\/div>/g)].map(m => m[1]);
		assert.deepStrictEqual(cards, ['活動A', 'タスクA1', 'タスクA2', '活動B', 'タスクB1']);
	});

	// スペースでインデントされたタスクも、タブと同じくアクティビティの下に並ぶ
	test('renders space-indented tasks the same as tab-indented ones', () => {
		const outline = '- 活動A\n  - タスクA1\n    - タスクA2';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task">タスクA1</div>'));
		assert.ok(html.includes('<div class="task">タスクA2</div>'));
	});

	// マークダウンで最初に現れた見出しが、マップ冒頭にタイトルとして表示される
	test('renders the first heading as the map title at the top', () => {
		const outline = '# マップのタイトル\n- 活動A';

		const html = renderMap(outline);

		const titlePosition = html.indexOf('<h1 class="map-title">マップのタイトル</h1>');
		assert.ok(titlePosition !== -1);
		// タイトルは行コンテナより前にある
		assert.ok(titlePosition < html.indexOf('class="activity-row"'));
	});

	// 見出しがない場合、空のタイトル領域が表示される
	test('renders an empty title area when there is no heading', () => {
		const html = renderMap('- 活動A');

		assert.ok(html.includes('<h1 class="map-title"></h1>'));
	});

	// ## の見出しでも、最初に現れたものがタイトルになる
	test('renders a level-2 heading as the map title too', () => {
		const html = renderMap('## マップのタイトル\n- 活動A');

		assert.ok(html.includes('<h1 class="map-title">マップのタイトル</h1>'));
	});

	// 同じアクティビティ内で同じレベルのタスクは、右どなりの内部カラムに分かれて並ぶ
	test('puts same-level tasks into separate inner columns side by side', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t- タスクA2';

		const html = renderMap(outline);

		// 内部カラムが2つあり、それぞれに1つずつタスクが入る
		assert.ok(html.includes('<div class="task-column"><div class="task">タスクA1</div></div>'));
		assert.ok(html.includes('<div class="task-column"><div class="task">タスクA2</div></div>'));
	});
});
