import * as assert from 'assert';
import { renderMap } from '../renderMap';

// マップの描画
suite('renderMap', () => {
	// アクティビティが、アウトラインの順でグリッドの1行目に横一列に並ぶ
	test('renders activities in outline order on the first grid row', () => {
		const outline = '- 活動A\n- 活動B\n- 活動C';

		const html = renderMap(outline);

		// グリッドコンテナは1つだけ
		assert.strictEqual((html.match(/class="map-grid"/g) ?? []).length, 1);
		// アクティビティのカードが 活動A → 活動B → 活動C の順に並ぶ
		const cards = [...html.matchAll(/<div class="activity"[^>]*>([^<]*)<\/div>/g)].map(m => m[1]);
		assert.deepStrictEqual(cards, ['活動A', '活動B', '活動C']);
		// すべてのアクティビティが1行目にある
		assert.strictEqual((html.match(/<div class="activity"[^>]*grid-row: 1;/g) ?? []).length, 3);
	});

	// マップ全体がグリッドとして配置される
	test('lays out the map as a grid', () => {
		const html = renderMap('- 活動A\n- 活動B');

		assert.ok(/\.map-grid\s*\{[^}]*display:\s*grid/.test(html));
	});

	// 各アクティビティの下に、そのタスクがアウトラインの順で縦に並ぶ
	test('renders tasks under their activity in outline order', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t\t- タスクA2\n- 活動B\n\t- タスクB1';

		const html = renderMap(outline);

		// カードが 活動A → タスクA1 → タスクA2 → 活動B → タスクB1 の順に並ぶ
		const cards = [...html.matchAll(/<div class="(?:activity|task)"[^>]*>([^<]*)<\/div>/g)].map(m => m[1]);
		assert.deepStrictEqual(cards, ['活動A', 'タスクA1', 'タスクA2', '活動B', 'タスクB1']);
		// タスクは自分のアクティビティと同じグリッド列に入る
		assert.ok(html.includes('<div class="task" style="grid-column: 1; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 1; grid-row: 3;">タスクA2</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 2;">タスクB1</div>'));
	});

	// スペースでインデントされたタスクも、タブと同じくアクティビティの下に並ぶ
	test('renders space-indented tasks the same as tab-indented ones', () => {
		const outline = '- 活動A\n  - タスクA1\n    - タスクA2';

		const html = renderMap(outline);

		assert.ok(/<div class="task"[^>]*>タスクA1<\/div>/.test(html));
		assert.ok(/<div class="task"[^>]*>タスクA2<\/div>/.test(html));
	});

	// マークダウンで最初に現れた見出しが、マップ冒頭にタイトルとして表示される
	test('renders the first heading as the map title at the top', () => {
		const outline = '# マップのタイトル\n- 活動A';

		const html = renderMap(outline);

		const titlePosition = html.indexOf('<h1 class="map-title">マップのタイトル</h1>');
		assert.ok(titlePosition !== -1);
		// タイトルはグリッドコンテナより前にある
		assert.ok(titlePosition < html.indexOf('class="map-grid"'));
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

	// 同じアクティビティ内で同じレベルのタスクは、右どなりのグリッド列に分かれて並ぶ
	test('puts same-level tasks into adjacent grid columns', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t- タスクA2';

		const html = renderMap(outline);

		// 同じレベルなので、同じ行のまま隣のグリッド列に分かれる
		assert.ok(html.includes('<div class="task" style="grid-column: 1; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 2;">タスクA2</div>'));
	});

	// 最上段（レベル1）のグリッド行そのものに、Walking Skeletonを示す背景色が付く
	test('paints the top grid row background to show the walking skeleton', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t\t- タスクA2';

		const html = renderMap(outline);

		// 2行目（レベル1）の全列に広がる背景要素がある
		assert.ok(/<div class="skeleton-row" style="grid-column: 1 \/ \d+; grid-row: 2;"><\/div>/.test(html));
		// 背景色が指定されている
		assert.ok(/\.skeleton-row\s*\{[^}]*background:/.test(html));
	});

	// 同じレベルのタスクは、どのカラムにあっても同じグリッド行に置かれる
	test('places tasks of the same level on the same grid row', () => {
		const outline = '- 活動A\n\t- タスクA1\n- 活動B\n\t- タスクB1\n\t\t- タスクB2';

		const html = renderMap(outline);

		// レベル1は2行目、レベル2は3行目
		assert.ok(html.includes('<div class="task" style="grid-column: 1; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 2;">タスクB1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 3;">タスクB2</div>'));
	});

	// タブ1個とスペース4個のインデントは同じレベルとして扱われる
	test('treats one tab and four spaces as the same level', () => {
		const outline = '- 活動A\n\t- タスクA1\n    - タスクA2';

		const html = renderMap(outline);

		// 同じレベルなので、同じ行のまま隣のグリッド列に分かれる
		assert.ok(html.includes('<div class="task" style="grid-column: 1; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 2;">タスクA2</div>'));
	});
});
