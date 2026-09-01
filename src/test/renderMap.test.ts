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
		const cards = [...html.matchAll(/<div class="(?:activity|task)(?: skeleton)?"[^>]*>([^<]*)<\/div>/g)].map(m => m[1]);
		assert.deepStrictEqual(cards, ['活動A', 'タスクA1', 'タスクA2', '活動B', 'タスクB1']);
		// タスクは自分のアクティビティと同じグリッド列に入る
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 3;">タスクA2</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 3; grid-row: 2;">タスクB1</div>'));
	});

	// スペースでインデントされたタスクも、タブと同じくアクティビティの下に並ぶ
	test('renders space-indented tasks the same as tab-indented ones', () => {
		const outline = '- 活動A\n  - タスクA1\n    - タスクA2';

		const html = renderMap(outline);

		assert.ok(/<div class="task skeleton"[^>]*>タスクA1<\/div>/.test(html));
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
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 3; grid-row: 2;">タスクA2</div>'));
	});

	// 一番左のカラムに、行の説明（User Activity / Walking skeleton / User tasks）が表示される。4行目以降にラベルはない
	test('renders row labels in the leftmost column', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t\t- タスクA2\n\t\t\t- タスクA3';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 1;">User Activity</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 2;">Walking skeleton</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 3;">User tasks</div>'));
		// ラベルは3つだけ（4行目以降にはない）
		assert.strictEqual((html.match(/class="row-label"/g) ?? []).length, 3);
		// アクティビティのカードは2列目から始まる
		assert.ok(/<div class="activity" style="grid-column: 2[^"]*"/.test(html));
	});

	// Walking Skeleton（レベル1）のカードは、帯の背景色から計算で導出した少し濃い色になる
	test('paints walking skeleton cards with a darker shade derived from the row background', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t\t- タスクA2';

		const html = renderMap(outline);

		// レベル1のタスクだけがskeletonクラスを持つ
		assert.ok(/<div class="task skeleton"[^>]*>タスクA1<\/div>/.test(html));
		assert.ok(/<div class="task"[^>]*>タスクA2<\/div>/.test(html));
		// 帯とカードの色は同じ変数（--skeleton-color）を源にする
		assert.ok(/\.skeleton-band\s*\{[^}]*var\(--skeleton-color\)/.test(html));
		// カードの色は相対色構文で帯の色から導出される（色相・彩度は保持）
		assert.ok(/\.task\.skeleton\s*\{[^}]*background:\s*hsl\(from var\(--skeleton-color\) h s /.test(html));
	});

	// User Activity行は緑、User tasks行は黄色の帯になり、カードは各帯の色から導出される
	test('paints activity and task rows with green and yellow bands like the skeleton row', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t\t- タスクA2\n\t\t\t- タスクA3';

		const html = renderMap(outline);

		// 1行目に緑の帯、3行目から最下行まで黄色の帯
		assert.ok(/<div class="row-band activity-band" style="grid-column: 1 \/ \d+; grid-row: 1;"><\/div>/.test(html));
		assert.ok(/<div class="row-band tasks-band" style="grid-column: 1 \/ \d+; grid-row: 3 \/ 5;"><\/div>/.test(html));
		assert.ok(/\.activity-band\s*\{[^}]*var\(--activity-color\)/.test(html));
		assert.ok(/\.tasks-band\s*\{[^}]*var\(--tasks-color\)/.test(html));
		// カードは各帯の色から導出される
		assert.ok(/\.activity\s*\{[^}]*background:\s*hsl\(from var\(--activity-color\)/.test(html));
		assert.ok(/\.task\s*\{[^}]*background:\s*hsl\(from var\(--tasks-color\)/.test(html));
	});

	// カードの枠色は、カードの背景色をさらに暗くした色として導出される
	test('derives card border color as a darker shade of the card background', () => {
		const html = renderMap('- 活動A\n\t- タスクA1');

		assert.ok(/\.activity\s*\{[^}]*border-color:\s*hsl\(from var\(--activity-color\)/.test(html));
		assert.ok(/\.task\s*\{[^}]*border-color:\s*hsl\(from var\(--tasks-color\)/.test(html));
		assert.ok(/\.task\.skeleton\s*\{[^}]*border-color:\s*hsl\(from var\(--skeleton-color\)/.test(html));
	});

	// カードには最低幅（120px）があり、狭くなりすぎない
	test('gives cards a minimum width so they do not get too narrow', () => {
		const html = renderMap('- 活動A');

		assert.ok(/\.activity,\s*\.task\s*\{[^}]*min-width:\s*120px/.test(html));
	});

	// 最上段（レベル1）のグリッド行そのものに、Walking Skeletonを示す背景色が付く
	test('paints the top grid row background to show the walking skeleton', () => {
		const outline = '- 活動A\n\t- タスクA1\n\t\t- タスクA2';

		const html = renderMap(outline);

		// 2行目（レベル1）の全列に広がる背景要素がある
		assert.ok(/<div class="row-band skeleton-band" style="grid-column: 1 \/ \d+; grid-row: 2;"><\/div>/.test(html));
		// 背景色が指定されている
		assert.ok(/\.skeleton-band\s*\{[^}]*background:/.test(html));
	});

	// 同じレベルのタスクは、どのカラムにあっても同じグリッド行に置かれる
	test('places tasks of the same level on the same grid row', () => {
		const outline = '- 活動A\n\t- タスクA1\n- 活動B\n\t- タスクB1\n\t\t- タスクB2';

		const html = renderMap(outline);

		// レベル1は2行目、レベル2は3行目
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 3; grid-row: 2;">タスクB1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 3; grid-row: 3;">タスクB2</div>'));
	});

	// タブ1個とスペース4個のインデントは同じレベルとして扱われる
	test('treats one tab and four spaces as the same level', () => {
		const outline = '- 活動A\n\t- タスクA1\n    - タスクA2';

		const html = renderMap(outline);

		// 同じレベルなので、同じ行のまま隣のグリッド列に分かれる
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 3; grid-row: 2;">タスクA2</div>'));
	});
});
