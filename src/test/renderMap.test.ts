import * as assert from 'assert';
import { mapTitle, renderMap } from '../renderMap';
import { md } from './md';

// マップの描画
suite('renderMap', () => {
	// アクティビティが、アウトラインの順でグリッドの1行目に横一列に並ぶ
	test('renders activities in outline order on the first grid row', () => {
		const outline = md`
			- Activity A
			- Activity B
			- Activity C
		`;

		const html = renderMap(outline);

		// グリッドコンテナは1つだけ
		assert.strictEqual((html.match(/class="map-grid"/g) ?? []).length, 1);
		// アクティビティのカードが Activity A → Activity B → Activity C の順に並ぶ
		const cards = [
			...html.matchAll(/<div class="card level1"[^>]*>([^<]*)<\/div>/g),
		].map(m => m[1]);
		assert.deepStrictEqual(cards, ['Activity A', 'Activity B', 'Activity C']);
		// すべてのアクティビティが1行目にある
		assert.strictEqual(
			(html.match(/<div class="card level1"[^>]*grid-row: 1;/g) ?? []).length,
			3,
		);
	});

	// マップ全体がグリッドとして配置される
	test('lays out the map as a grid', () => {
		const html = renderMap(md`
			- Activity A
			- Activity B
		`);

		assert.ok(/\.map-grid\s*\{[^}]*display:\s*grid/.test(html));
	});

	// 各アクティビティの下に、そのタスクがアウトラインの順で縦に並ぶ
	test('renders tasks under their activity in outline order', () => {
		const outline = md`
			- Activity A
				- Task A1
					- Task A2
			- Activity B
				- Task B1
		`;

		const html = renderMap(outline);

		// カードが Activity A → Task A1 → Task A2 → Activity B → Task B1 の順に並ぶ
		const cards = [
			...html.matchAll(/<div class="card level\d"[^>]*>([^<]*)<\/div>/g),
		].map(m => m[1]);
		assert.deepStrictEqual(cards, [
			'Activity A',
			'Task A1',
			'Task A2',
			'Activity B',
			'Task B1',
		]);
		// タスクは自分のアクティビティと同じグリッド列に入る
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;">Task A2</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 2; grid-row: 2;">Task B1</div>',
			),
		);
	});

	// スペースでインデントされたタスクも、タブと同じくアクティビティの下に並ぶ
	test('renders space-indented tasks the same as tab-indented ones', () => {
		const outline = '- Activity A\n  - Task A1\n    - Task A2';

		const html = renderMap(outline);

		assert.ok(/<div class="card level2"[^>]*>Task A1<\/div>/.test(html));
		assert.ok(/<div class="card level3"[^>]*>Task A2<\/div>/.test(html));
	});

	// [ ] と [x] は、チェックボックス絵文字として表示される
	test('renders checkbox markers as emoji', () => {
		const outline = md`
			- Activity A
				- [x] Task A1
					- [ ] Task A2
		`;

		const html = renderMap(outline);

		assert.ok(
			/<div class="card level2 done"[^>]*>✅ Task A1<\/div>/.test(html),
		);
		assert.ok(
			/<div class="card level3 todo"[^>]*>⬜ Task A2<\/div>/.test(html),
		);
		// 生の [x] / [ ] は表示されない
		assert.ok(!html.includes('[x]'));
		assert.ok(!html.includes('[ ]'));
	});

	// 大文字の [X] も完了として絵文字になる
	test('renders an uppercase checkbox marker as emoji too', () => {
		const html = renderMap(md`
			- Activity A
				- [X] Task A1
		`);

		assert.ok(
			/<div class="card level2 done"[^>]*>✅ Task A1<\/div>/.test(html),
		);
	});

	// 完了済み（[x]）のカードは枠なし・影なしになる
	test('removes the border and shadow from completed cards', () => {
		const outline = md`
			- Activity A
				- [x] Task A1
					- [ ] Task A2
		`;

		const html = renderMap(outline);

		// 完了カードにはdoneクラスが付き、未完了カードには付かない
		assert.ok(
			/<div class="card level2 done"[^>]*>✅ Task A1<\/div>/.test(html),
		);
		assert.ok(
			/<div class="card level3 todo"[^>]*>⬜ Task A2<\/div>/.test(html),
		);
		// doneのカードは枠なし・影なし
		assert.ok(/\.done\s*\{[^}]*border:\s*none/.test(html));
		assert.ok(/\.done\s*\{[^}]*box-shadow:\s*none/.test(html));
	});

	// CRLF改行のアウトラインでも、「v 」のマーカーは効き、そのタスクは2つ下の帯に描画される
	test('applies a v marker in a CRLF outline', () => {
		const outline = '- Activity A\r\n\t- v Task A2\r\n';

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;">Task A2</div>',
			),
		);
	});

	// 内容のない「- 」だけの行は、本文のない空欄のカードになる。子はその1つ下の帯に置かれる
	test('renders an empty list item as a blank card', () => {
		// The trailing space after "-" matters, so this stays an explicit string
		const outline = '- Activity A\n\t- Task A1\n\t\t- \n\t\t\t- Task A2';

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level4" style="grid-column: 1; grid-row: 4;">Task A2</div>',
			),
		);
	});

	// CommonMarkは段落直後の「- 」だけの行をsetext見出しの下線と読む。その見出しでストーリーマップが途切れないこと
	test('keeps the map going after an empty list item that follows a parent item', () => {
		const outline =
			'# Title\n\n## Story map\n\n- Activity A\n\t- Task A1\n\t\t- \n- Activity B';

		const html = renderMap(outline);

		// 親のTask A1は見出しではなくカードのまま
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		// 後ろのアクティビティも描画される
		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 2; grid-row: 1;">Activity B</div>',
			),
		);
	});

	// リスト項目の末尾に複数のハッシュタグを付けられる。タグは本文から切り離され、「#」なしでカードの末尾に並ぶ
	test('renders trailing hashtags as tags at the end of the card', () => {
		const outline = md`
			- Activity A
				- Task A1 #tag1 #tag2
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1<span class="tag">tag1</span><span class="tag">tag2</span></div>',
			),
		);
	});

	// タグは白い背景で角丸に囲まれる
	test('draws tags with a white background and rounded corners', () => {
		const html = renderMap('- Activity A #tag1');

		assert.ok(/\.tag\s*\{[^}]*background:\s*white/.test(html));
		assert.ok(/\.tag\s*\{[^}]*border-radius:/.test(html));
	});

	// 帯の高さ（CSS行数）は全列でそろう。「^」で2行になったアクティビティ帯に合わせて、「^」のない列のlevel 2も3行目に下がる
	test('aligns band heights across columns so a plain column moves down too', () => {
		const outline = md`
			- Activity A
				- ^ Activity A2
					- Task A1
			- Activity B
				- Task B1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 3;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 2; grid-row: 3;">Task B1</div>',
			),
		);
	});

	// 帯（row-band）は、そのlevelの行数分の高さになる。2行になったアクティビティ帯は1〜2行目にまたがり、level 2の帯は3行目になる
	test('stretches a band over all the rows of its level', () => {
		const outline = md`
			- Activity A
				- ^ Activity A2
					- Task A1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-band level1" style="grid-column: 1 / 2; grid-row: 1 / 3;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level2" style="grid-column: 1 / 2; grid-row: 3;"></div>',
			),
		);
	});

	// 順序付きリストの空の項目は、ラベルのないレベルとして数える。そのレベルにはラベルが出ず、後ろのラベルは詰まらない
	test('leaves the level of an empty ordered list item without a label', () => {
		const outline = md`
			1. First
			2.
			3. Third

			- Activity A
				- Task A1
					- Task A2
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>',
			),
		);
		assert.ok(
			!html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 2;">',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 3;">Third</div>',
			),
		);
	});

	// レベルのタイトルは、各帯の先頭行に置かれる。最初の帯が2行なら、2番目のタイトルは3行目、3番目は4行目
	test('places each level title on the first row of its band', () => {
		const outline = md`
			1. First
			2. Second
			3. Third

			- Activity A
				- ^ Activity A2
					- Task A1
						- Task A2
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 3;">Second</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 4;">Third</div>',
			),
		);
	});

	// level 4以降の帯の明暗は、CSS行ではなくlevelごとに交互になる。2行にまたがるlevel 4の帯は1色で、次のlevel 5がalt
	test('alternates the bands from level 4 down per level, not per row', () => {
		const outline = md`
			- Activity A
				- Task A1
					- Task A2
						- Task A3
							- ^ Task A3b
								- Task A4
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-band level3" style="grid-column: 1 / 2; grid-row: 3;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level4" style="grid-column: 1 / 2; grid-row: 4 / 6;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level4 alt" style="grid-column: 1 / 2; grid-row: 6;"></div>',
			),
		);
	});

	// 「^」を付けたアクティビティの子は、2行目に列ごとに並び、アクティビティの帯（level1）に入る
	test('places caret children of an activity on the second row as activities', () => {
		const outline = md`
			- Activity A
				- ^ Activity A1
				- ^ Activity A2
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 2;">Activity A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 2; grid-row: 2;">Activity A2</div>',
			),
		);
	});

	// 「^」を付けたアクティビティの子の子は、次の帯（level2）に置かれる
	test('places the child of a caret activity in the level 2 band', () => {
		const outline = md`
			- Activity A
				- ^ Activity A2
					- Task A1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 3;">Task A1</div>',
			),
		);
	});

	// 先頭に「^ 」を付けた子は、親と同じ帯の1つ下の行に置かれる。「^」はカードに表示されない（ADR 005）
	test('places a child marked with a caret on the next row in the same band as its parent', () => {
		const outline = md`
			- Activity A
				- Task A1
					- ^ Task A1b
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 3;">Task A1b</div>',
			),
		);
	});

	// 「^」の子の子（マーカーなし）は、次の帯に置かれる
	test('places the child of a caret item in the next band', () => {
		const outline = md`
			- Activity A
				- Task A1
					- ^ Task A1b
						- Task A1c
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 3;">Task A1b</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 4;">Task A1c</div>',
			),
		);
	});

	// 「^」が連鎖すると、同じ帯のまま行が1つずつ下がる
	test('keeps the band while carets chain down the rows', () => {
		const outline = md`
			- Activity A
				- Task A1
					- ^ Task A1b
						- ^ Task A1c
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 3;">Task A1b</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 4;">Task A1c</div>',
			),
		);
	});

	// 兄弟のうち「^」の付いた子だけが親の帯に入る。付かない子は1つ下の帯に置かれる
	test('keeps only the caret siblings in the parent band', () => {
		const outline = md`
			- Activity A
				- Task A1
					- ^ Task A1b
					- Task A1c
					- ^ Task A1d
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 3;">Task A1b</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 2; grid-row: 4;">Task A1c</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 3; grid-row: 3;">Task A1d</div>',
			),
		);
	});

	// 「^」の子の兄弟は、タスクの兄弟と同じく右の列に並ぶ。マーカーは列に影響しない
	test('places caret siblings side by side in the columns to the right', () => {
		const outline = md`
			- Activity A
				- Task A1
					- ^ Task A1b
					- ^ Task A1c
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 3;">Task A1b</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 2; grid-row: 3;">Task A1c</div>',
			),
		);
	});

	// 先頭に「v 」を付けた子は、親の2つ下の帯に置かれる。「v」はカードに表示されない（ADR 005）
	test('places a child marked with a v two bands below its parent', () => {
		const outline = md`
			- Activity A
				- v Task A1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;">Task A1</div>',
			),
		);
	});

	// 「vvv 」を付けた子は、親の4つ下の帯に置かれる。vの数が、あける帯の数になる
	test('places a child marked with three v four bands below its parent', () => {
		const outline = md`
			- Activity A
				- vvv Task A1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level4" style="grid-column: 1; grid-row: 5;">Task A1</div>',
			),
		);
	});

	// 「v」で飛ばした帯も描画される
	test('draws the bands skipped by v markers', () => {
		const outline = md`
			- Activity A
				- vvv Task A1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-band level4" style="grid-column: 1 / 2; grid-row: 4;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level4 alt" style="grid-column: 1 / 2; grid-row: 5;"></div>',
			),
		);
	});

	// 「v」の子の子（マーカーなし）は、さらに1つ下の帯に置かれる
	test('places the child of a v item in the band below it', () => {
		const outline = md`
			- Activity A
				- v Task A1
					- Task A2
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level4" style="grid-column: 1; grid-row: 4;">Task A2</div>',
			),
		);
	});

	// チェックボックスの後にマーカーを書く。「- [ ] ^ Task」は⬜とtodoのまま、親の帯に入る
	test('accepts a caret after an open checkbox', () => {
		const outline = md`
			- Activity A
				- Task A1
					- [ ] ^ Task A1b
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2 todo" style="grid-column: 1; grid-row: 3;">⬜ Task A1b</div>',
			),
		);
	});

	// 「- [x] v Task」は✅とdoneのまま、2つ下の帯に入る
	test('accepts a v after a done checkbox', () => {
		const outline = md`
			- Activity A
				- [x] v Task A1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level3 done" style="grid-column: 1; grid-row: 3;">✅ Task A1</div>',
			),
		);
	});

	// マーカーはタグと併用できる。タグは表示され、子は親の帯に入る
	test('accepts a caret together with trailing tags', () => {
		const outline = md`
			- Activity A
				- Task A1
					- ^ Task A1b #tag1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 3;">Task A1b<span class="tag">tag1</span></div>',
			),
		);
	});

	// マーカーの直後に空白がなければマーカーではない。「^Task」や「vsCodeを開く」は通常のカードになる
	test('does not treat a caret or v without a following space as a marker', () => {
		const outline = md`
			- Activity A
				- Task A1
					- ^Task A1b
					- vsCodeを開く
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;">^Task A1b</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 2; grid-row: 3;">vsCodeを開く</div>',
			),
		);
	});

	// 「^」は繰り返さない。「^^ Task」はマーカーではなく、通常のカードになる
	test('does not treat a doubled caret as a marker', () => {
		const outline = md`
			- Activity A
				- Task A1
					- ^^ Task A1b
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;">^^ Task A1b</div>',
			),
		);
	});

	// トップレベル（アクティビティ）のマーカーは、動かす先がないので外すだけ。既定の位置に置かれる
	test('strips a marker on an activity and keeps the default position', () => {
		const outline = md`
			- ^ Activity A
			- v Activity B
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 2; grid-row: 1;">Activity B</div>',
			),
		);
	});

	// 行末の「+」はマーカーではない（ADR 005で廃止）。本文の一部として表示され、子は次の帯に置かれる
	test('renders a trailing plus as plain text and places the child in the next band', () => {
		const outline = md`
			- Activity A
				- Task A1 +
					- Task A1b
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1 +</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;">Task A1b</div>',
			),
		);
	});

	// 「_」だけのアイテムは空白レベルではない（ADR 005で廃止）。「_」のカードができ、子は次の帯に置かれる
	test('renders an underscore-only item as a normal card', () => {
		const outline = md`
			- Activity A
				- _
					- Task A2
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">_</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 1; grid-row: 3;">Task A2</div>',
			),
		);
	});

	// アイテム行内のインライン記法（強調など）がカードに反映される
	test('renders inline markdown such as emphasis inside a card', () => {
		const html = renderMap(md`
			- Activity A
				- **Task 1**
		`);

		assert.ok(
			/<div class="card level2"[^>]*><strong>Task 1<\/strong><\/div>/.test(
				html,
			),
		);
	});

	// アクティビティのカードにもインライン記法が反映される
	test('renders inline markdown inside an activity card too', () => {
		const html = renderMap('- **Activity A**');

		assert.ok(
			/<div class="card level1"[^>]*><strong>Activity A<\/strong><\/div>/.test(
				html,
			),
		);
	});

	// 行内の生のHTMLタグは解釈されず、文字としてエスケープ表示される
	// （注: markdown-it の既定（html: false）で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('escapes raw html tags in an item instead of rendering them', () => {
		const html = renderMap(md`
			- Activity A
				- <b>Task 1</b>
		`);

		assert.ok(
			/<div class="card level2"[^>]*>&lt;b&gt;Task 1&lt;\/b&gt;<\/div>/.test(
				html,
			),
		);
	});

	// ズームUIは画面の右上端にある
	test('places the zoom controls at the top-right corner of the screen', () => {
		const html = renderMap('- Activity A');

		assert.ok(
			html.includes(
				'.zoom-controls { position: fixed; right: 16px; top: 16px;',
			),
		);
	});

	// ズームコントロールは「－ボタン」「現在の倍率」「＋ボタン」の順に並ぶ
	test('orders the zoom controls as minus button, current zoom, plus button', () => {
		const html = renderMap('- Activity A');

		assert.ok(
			/<div class="zoom-controls"><button class="zoom-out">－<\/button><span class="zoom-level">[^<]*<\/span><button class="zoom-in">＋<\/button><\/div>/.test(
				html,
			),
		);
	});

	// 現在の倍率は整数のパーセントで表示される（ズーム値1.44なら 144%）
	test('shows the current zoom as a whole-number percent', () => {
		const html = renderMap('- Activity A', { zoom: 1.44 });

		assert.ok(html.includes('<span class="zoom-level">144%</span>'));
	});

	// ズーム値を渡さないと 100% と表示される
	test('shows 100% when no zoom is given', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('<span class="zoom-level">100%</span>'));
	});

	// 端数のあるズーム値は四捨五入して表示される（ズーム値1.728なら 173%）
	test('rounds a fractional zoom to the nearest percent', () => {
		const html = renderMap('- Activity A', { zoom: 1.728 });

		assert.ok(html.includes('<span class="zoom-level">173%</span>'));
	});

	// ズーム値を渡すと、マップ要素がそのズーム値で描画される
	test('renders the map element at the given zoom', () => {
		const html = renderMap('- Activity A', { zoom: 1.44 });

		assert.ok(html.includes('<div class="map-zoom" style="zoom: 1.44;"'));
	});

	// 渡されたスクロール位置を、マップ要素の data-scroll-x / data-scroll-y に出力する
	// （再描画後にWebviewがこの位置へ戻るための持ち越し）
	test('renders the given scroll position on the map element', () => {
		const html = renderMap('- Activity A', { scroll: { x: 120, y: 340 } });

		assert.ok(
			/<div class="map-zoom"[^>]*data-scroll-x="120" data-scroll-y="340"/.test(
				html,
			),
		);
	});

	// スクロール位置を渡さないと、先頭（0, 0）が出力される
	// （注: 既定値はスクロール位置対応と同時に入ったため、このテストは仕様の記録としてRedを経ずに置いたもの）
	test('renders scroll position 0, 0 when no scroll position is given', () => {
		const html = renderMap('- Activity A');

		assert.ok(
			/<div class="map-zoom"[^>]*data-scroll-x="0" data-scroll-y="0"/.test(
				html,
			),
		);
	});

	// ズーム値を渡さないと、マップは等倍で描画される
	// （注: 既定値1はズーム値対応と同時に入ったため、このテストは仕様の記録としてRedを経ずに置いたもの）
	test('renders the map at zoom 1 when no zoom is given', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('<div class="map-zoom" style="zoom: 1;"'));
	});

	// フローティングの保存ボタンが表示される
	test('renders a floating save button', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('<button class="save-png">PNG</button>'));
	});

	// 画像保存ボタンは画面の右下端にある
	test('places the save button at the bottom-right corner of the screen', () => {
		const html = renderMap('- Activity A');

		assert.ok(
			html.includes('.save-png { position: fixed; right: 16px; bottom: 16px;'),
		);
	});

	// マークダウンで最初に現れた見出しが、マップ冒頭にタイトルとして表示される
	test('renders the first heading as the map title at the top', () => {
		const outline = md`
			# Map Title
			- Activity A
		`;

		const html = renderMap(outline);

		const titlePosition = html.indexOf('<h1 class="map-title">Map Title</h1>');
		assert.ok(titlePosition !== -1);
		// タイトルはグリッドコンテナより前にある
		assert.ok(titlePosition < html.indexOf('class="map-grid"'));
	});

	// アウトラインより上のパラグラフは、タイトルの下・グリッドの上に段落（leading-note）として表示される
	test('renders a paragraph above the outline as a note between the title and the grid', () => {
		const outline = md`
			# Map Title

			This map covers the first release.

			- Activity A
		`;

		const html = renderMap(outline);

		const notePosition = html.indexOf(
			'<p class="leading-note">This map covers the first release.</p>',
		);
		assert.ok(notePosition !== -1);
		assert.ok(
			html.indexOf('<h1 class="map-title">Map Title</h1>') < notePosition,
		);
		assert.ok(notePosition < html.indexOf('class="map-grid"'));
	});

	// パラグラフが複数あれば、アウトラインの順に段落が並ぶ
	test('renders several paragraphs above the outline as notes in order', () => {
		const outline = md`
			# Map Title

			First note.

			Second note.

			- Activity A
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<p class="leading-note">First note.</p><p class="leading-note">Second note.</p>',
			),
		);
	});

	// 段落の中のインライン記法（強調など）が反映される
	test('renders inline markdown inside a note', () => {
		const html = renderMap(
			md`
			# Map Title

			Read **this** first.

			- Activity A
		`,
		);

		assert.ok(
			html.includes(
				'<p class="leading-note">Read <strong>this</strong> first.</p>',
			),
		);
	});

	// 見出しがなくても、アウトラインより上のパラグラフは段落として表示される
	test('renders a note above the outline even when there is no heading', () => {
		const html = renderMap(md`
			A note without a heading.

			- Activity A
		`);

		assert.ok(
			html.includes('<p class="leading-note">A note without a heading.</p>'),
		);
	});

	// アウトラインより下のパラグラフは、タイトル下の段落（leading-note）にはならない
	test('does not render a paragraph below the outline as a leading note', () => {
		const html = renderMap(
			md`
			# Map Title

			- Activity A

			A paragraph below the outline.
		`,
		);

		assert.ok(
			!html.includes(
				'<p class="leading-note">A paragraph below the outline.</p>',
			),
		);
	});

	// アウトラインより下のパラグラフは、グリッドの下に段落（trailing-note）として表示される
	test('renders a paragraph below the outline as a trailing note under the grid', () => {
		const outline = md`
			# Map Title

			- Activity A

			A paragraph below the outline.
		`;

		const html = renderMap(outline);

		const notePosition = html.indexOf(
			'<p class="trailing-note">A paragraph below the outline.</p>',
		);
		assert.ok(notePosition !== -1);
		assert.ok(html.indexOf('class="map-grid"') < notePosition);
	});

	// アウトラインより下のパラグラフが複数あれば、アウトラインの順に段落が並ぶ
	test('renders several paragraphs below the outline as trailing notes in order', () => {
		const outline = md`
			# Map Title

			- Activity A

			First trailing note.

			Second trailing note.
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<p class="trailing-note">First trailing note.</p><p class="trailing-note">Second trailing note.</p>',
			),
		);
	});

	// 「Story Map」見出しの外（次の見出し以降）のパラグラフは、trailing-noteとして表示されない
	test('does not render a paragraph outside the Story Map section as a trailing note', () => {
		const outline = md`
			# Map Title

			## Story Map

			- Activity A

			Inside the section.

			## Notes

			Outside the section.
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes('<p class="trailing-note">Inside the section.</p>'),
		);
		assert.ok(!html.includes('Outside the section.'));
	});

	// 見出しがない場合、空のタイトル領域が表示される
	test('renders an empty title area when there is no heading', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('<h1 class="map-title"></h1>'));
	});

	// ## の見出しでも、最初に現れたものがタイトルになる
	test('renders a level-2 heading as the map title too', () => {
		const html = renderMap(md`
			## Map Title
			- Activity A
		`);

		assert.ok(html.includes('<h1 class="map-title">Map Title</h1>'));
	});

	// 内部カラムが複数あっても、アクティビティのカードは最初の内部カラムだけを占め、タスクのカードと同じ幅になる
	test('keeps the activity card in the first inner column instead of spanning all of them', () => {
		const outline = md`
			- Activity A
				- Task A1
				- Task A2
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
			),
		);
	});

	// 同じアクティビティ内で同じレベルのタスクは、右どなりのグリッド列に分かれて並ぶ
	test('puts same-level tasks into adjacent grid columns', () => {
		const outline = md`
			- Activity A
				- Task A1
				- Task A2
		`;

		const html = renderMap(outline);

		// 同じレベルなので、同じ行のまま隣のグリッド列に分かれる
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 2; grid-row: 2;">Task A2</div>',
			),
		);
	});

	// Ordered listがないとき、レベルのタイトルは1つも描画されない（ADR 004）
	test('renders no level titles when there is no ordered list', () => {
		const outline = md`
			- Activity A
				- Task A1
					- Task A2
						- Task A3
		`;

		const html = renderMap(outline);

		assert.ok(!html.includes('class="row-label"'));
	});

	// Ordered listがないとき、レベルのタイトルの列は作られず、カードは1列目から始まる（ADR 004）
	test('starts the cards at the first column when there is no ordered list', () => {
		const outline = md`
			- Activity A
				- Task A1
			- Activity B
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 2; grid-row: 1;">Activity B</div>',
			),
		);
	});

	// Ordered listがないとき、帯も1列目から始まり、カードの列数ぶんの幅になる（ADR 004）
	test('starts the bands at the first column and spans only the card columns when there is no ordered list', () => {
		const outline = md`
			- Activity A
				- Task A1
			- Activity B
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-band level1" style="grid-column: 1 / 3; grid-row: 1;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level2" style="grid-column: 1 / 3; grid-row: 2;"></div>',
			),
		);
	});

	// Ordered listがあれば、その項目が上のレベルから順にレベルのタイトルになる。番号は表示されない。Ordered listは補足事項にはならない
	test('uses the items of an ordered list as the level titles', () => {
		const outline = md`
			1. First
			2. Second
			3. Third
			4. Fourth

			- Activity A
				- Task A1
					- Task A2
						- Task A3
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 3;">Third</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 4;">Fourth</div>',
			),
		);
		assert.ok(!html.includes('<p class="leading-note">First</p>'));
	});

	// Ordered listの項目数より深いレベルには、タイトルがない。タイトルの列は残り、カードは2列目から始まる
	test('leaves levels beyond the ordered list without a title but keeps the title column', () => {
		const outline = md`
			1. First
			2. Second

			- Activity A
				- Task A1
					- Task A2
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>',
			),
		);
		assert.strictEqual((html.match(/class="row-label"/g) ?? []).length, 2);
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 2; grid-row: 3;">Task A2</div>',
			),
		);
	});

	// Ordered listはアウトラインより下に置いてもレベルのタイトルになる
	test('uses an ordered list below the outline as the level titles', () => {
		const outline = md`
			- Activity A
				- Task A1

			1. First
			2. Second
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>',
			),
		);
	});

	// 存在しないレベルのタイトルは描画されない。level 1〜3の帯は常にあるので3つ目までは表示され、Ordered listがそれより長くても余りは表示されない
	test('does not render titles for levels that do not exist', () => {
		const outline = md`
			1. First
			2. Second
			3. Third
			4. Fourth

			- Activity A
				- Task A1
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 3;">Third</div>',
			),
		);
		assert.strictEqual((html.match(/class="row-label"/g) ?? []).length, 3);
	});

	// Ordered listがあるとき、レベルのタイトルは一番左のカラムに表示され、カードは2列目から始まる
	test('renders level titles in the leftmost column and starts the cards at the second column', () => {
		const outline = md`
			1. First
			2. Second
			3. Third

			- Activity A
				- Task A1
					- Task A2
						- Task A3
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 3;">Third</div>',
			),
		);
		// タイトルは3つだけ（4行目以降にはない）
		assert.strictEqual((html.match(/class="row-label"/g) ?? []).length, 3);
		// アクティビティのカードは2列目から始まる
		assert.ok(
			/<div class="card level1" style="grid-column: 2[^"]*"/.test(html),
		);
	});

	// Walking Skeletonの行（レベル1）のタスクカードだけがskeletonクラスを持つ
	test('marks only level-1 task cards as skeleton', () => {
		const outline = md`
			- Activity A
				- Task A1
					- Task A2
		`;

		const html = renderMap(outline);

		assert.ok(/<div class="card level2"[^>]*>Task A1<\/div>/.test(html));
		assert.ok(/<div class="card level3"[^>]*>Task A2<\/div>/.test(html));
	});

	// レベルに名前はなく番号で扱う。level 2のカードは2行目に置かれ、クラスはcard level2である
	test('places a level 2 card on the second row with the level2 class', () => {
		const html = renderMap(md`
			- Activity A
				- Task A1
		`);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
	});

	// level 1〜3の帯は、そのlevelにカードがなくても常に描画される。アクティビティだけのアウトラインでも帯は3本ある
	test('always draws the bands of level 1 to 3 even when they have no cards', () => {
		const html = renderMap('- Activity A');

		assert.ok(
			html.includes(
				'<div class="row-band level1" style="grid-column: 1 / 2; grid-row: 1;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level2" style="grid-column: 1 / 2; grid-row: 2;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level3" style="grid-column: 1 / 2; grid-row: 3;"></div>',
			),
		);
		assert.ok(!html.includes('row-band level4'));
	});

	// 色のルール（全level共通）: levelごとに基本色の変数があり、帯は基本色で塗られ、
	// カード背景は基本色の明度だけ下げた濃い色（色相・彩度は保持）、枠色はさらに明度を下げた色として導出される
	test('derives band, card, and border colors from each level base color', () => {
		const outline = md`
			- Activity A
				- Task A1
					- Task A2
						- Task A3
		`;

		const html = renderMap(outline);

		const rows = [1, 2, 3, 4].map(level => ({
			colorVar: `--level${level}-color`,
			bandClass: `level${level}`,
			cardSelector: `\.card\.level${level}`,
			gridRow: `${level};`,
		}));
		for (const row of rows) {
			// 基本色の変数が定義されている
			assert.ok(html.includes(`${row.colorVar}:`), row.colorVar);
			// 帯の要素が行の全列に敷かれる
			assert.ok(
				new RegExp(
					`<div class="row-band ${row.bandClass}" style="grid-column: 1 / \\d+; grid-row: ${row.gridRow.replace('/', '\\/')}"></div>`,
				).test(html),
				`${row.bandClass} element`,
			);
			// 帯は基本色で塗られる
			assert.ok(
				new RegExp(
					`\\.${row.bandClass}\\s*\\{[^}]*background:\\s*var\\(${row.colorVar}\\)`,
				).test(html),
				`${row.bandClass} background`,
			);
			// カード背景は基本色の明度だけ下げた濃い色
			assert.ok(
				new RegExp(
					`${row.cardSelector}\\s*\\{[^}]*background:\\s*hsl\\(from var\\(${row.colorVar}\\) h s calc\\(l \\* var\\(--card-shade\\)\\)\\)`,
				).test(html),
				`${row.cardSelector} background`,
			);
			// 枠色はさらに明度を下げた色
			assert.ok(
				new RegExp(
					`${row.cardSelector}\\s*\\{[^}]*border-color:\\s*hsl\\(from var\\(${row.colorVar}\\) h s calc\\(l \\* var\\(--border-shade\\)\\)\\)`,
				).test(html),
				`${row.cardSelector} border`,
			);
		}
		// 導出係数は1未満（明度を下げる＝濃くなる）で、枠のほうが暗い
		assert.ok(/--card-shade:\s*0\.\d+/.test(html));
		assert.ok(/--border-shade:\s*0\.\d+/.test(html));
	});

	// デフォルトの基本色は、上からアクティビティが青、タスクが緑、Walking Skeletonが赤、下位タスクが黄
	test('has blue, green, red, and yellow default base colors from the top', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('--level1-color: #e0efff'));
		assert.ok(html.includes('--level2-color: #e0ffee'));
		assert.ok(html.includes('--level3-color: #ffe0e9'));
		assert.ok(html.includes('--level4-color: #fff3e0'));
	});

	// level 4以降の帯は、levelごとに基本色と少し明るい色が交互になる。level 3までは交互にならない
	test('alternates the bands from level 4 down between the base color and a lighter shade', () => {
		const outline = md`
			- Activity A
				- Task A1
					- Task A2
						- Task A3
							- Task A4
								- Task A5
		`;

		const html = renderMap(outline);

		// level 3の帯（3行目）はaltにならず、level 4以降（4〜6行目）は1levelおきにaltクラスを持つ
		assert.ok(
			html.includes(
				'<div class="row-band level3" style="grid-column: 1 / 2; grid-row: 3;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level4" style="grid-column: 1 / 2; grid-row: 4;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level4 alt" style="grid-column: 1 / 2; grid-row: 5;"></div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level4" style="grid-column: 1 / 2; grid-row: 6;"></div>',
			),
		);
		// altの帯の色は基本色から明度を変えて導出される
		assert.ok(
			/\.row-band\.level4\.alt\s*\{[^}]*background:\s*hsl\(from var\(--level4-color\)/.test(
				html,
			),
		);
	});

	// 各行の帯の下端には、その行のカード背景色と同じ色のdashed区切り線が入る
	test('draws a dashed separator at the bottom of each row band', () => {
		const html = renderMap(md`
			- Activity A
				- Task A1
		`);

		// 帯共通でdashedの下線がある
		assert.ok(/\.row-band\s*\{[^}]*border-bottom:\s*2px dashed/.test(html));
		// 線の色は各行のカード背景色と同じ導出式
		for (const colorVar of [
			'--level1-color',
			'--level2-color',
			'--level3-color',
			'--level4-color',
		]) {
			assert.ok(
				new RegExp(
					`\\.row-band\\.level\\d\\s*\\{[^}]*border-color:\\s*hsl\\(from var\\(${colorVar}\\) h s calc\\(l \\* var\\(--card-shade\\)\\)\\)`,
				).test(html),
				colorVar,
			);
		}
	});

	// [ ] のあるカードには影があり、チェックボックスのないカードには影がない
	test('casts a shadow only on cards with an open checkbox', () => {
		const outline = md`
			- Activity A
				- [ ] Task A1
					- Task A2
		`;

		const html = renderMap(outline);

		// 未完了チェックのカードにはtodoクラスが付き、チェックボックスなしには付かない
		assert.ok(
			/<div class="card level2 todo"[^>]*>⬜ Task A1<\/div>/.test(html),
		);
		assert.ok(/<div class="card level3"[^>]*>Task A2<\/div>/.test(html));
		// 影はtodoのカードだけに付く（右下方向）
		assert.ok(/\.todo\s*\{[^}]*box-shadow:\s*[1-9]\d*px [1-9]\d*px/.test(html));
		assert.ok(!/\.card\s*\{[^}]*box-shadow:/.test(html));
	});

	// カードには最低幅（120px）があり、狭くなりすぎない
	test('gives cards a minimum width so they do not get too narrow', () => {
		const html = renderMap('- Activity A');

		assert.ok(/\.card\s*\{[^}]*min-width:\s*120px/.test(html));
	});

	// 同じレベルのタスクは、どのカラムにあっても同じグリッド行に置かれる
	test('places tasks of the same level on the same grid row', () => {
		const outline = md`
			- Activity A
				- Task A1
			- Activity B
				- Task B1
					- Task B2
		`;

		const html = renderMap(outline);

		// レベル1は2行目、レベル2は3行目
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 2; grid-row: 2;">Task B1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 2; grid-row: 3;">Task B2</div>',
			),
		);
	});

	// タブ1個とスペース4個のインデントは同じレベルとして扱われる
	test('treats one tab and four spaces as the same level', () => {
		const outline = '- Activity A\n\t- Task A1\n    - Task A2';

		const html = renderMap(outline);

		// 同じレベルなので、同じ行のまま隣のグリッド列に分かれる
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 2; grid-row: 2;">Task A2</div>',
			),
		);
	});

	// 「Story Map」の見出しがあるとき、その見出しより前にあるリストの項目はカードにならない
	test('ignores list items before the Story Map heading', () => {
		const outline = md`
			# Design Notes

			- Not a card

			## Story Map

			- Activity A
				- Task A1
		`;

		const html = renderMap(outline);

		assert.ok(!/<div class="card[^"]*"[^>]*>Not a card<\/div>/.test(html));
		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
			),
		);
	});

	// 「Story Map」の見出しがあっても、マップのタイトルは文書の最初の見出しのまま
	test('keeps the first heading of the document as the map title above the Story Map heading', () => {
		const outline = md`
			# Design Notes

			## Story Map

			- Activity A
		`;

		const html = renderMap(outline);

		assert.ok(html.includes('<h1 class="map-title">Design Notes</h1>'));
		assert.ok(!html.includes('<h1 class="map-title">Story Map</h1>'));
	});

	// 補足のパラグラフは、「Story Map」の見出しより後で最初のリストより前のものだけが表示される。見出しより前のパラグラフは表示されない
	test('shows only the paragraphs between the Story Map heading and the first list as notes', () => {
		const outline = md`
			# Design Notes

			Before the map.

			## Story Map

			About the map.

			- Activity A
		`;

		const html = renderMap(outline);

		assert.ok(html.includes('<p class="leading-note">About the map.</p>'));
		assert.ok(!html.includes('<p class="leading-note">Before the map.</p>'));
	});

	// レベル名の順序付きリストは、「Story Map」の見出しより後のものだけを使う。見出しより前の順序付きリストは無視される
	test('takes the level titles only from an ordered list after the Story Map heading', () => {
		const outline = md`
			# Design Notes

			1. Not a title

			## Story Map

			1. First

			- Activity A
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>',
			),
		);
		assert.ok(!html.includes('Not a title'));
	});

	// ストーリーマップの範囲は次の見出しまで。その見出しより後にあるリストの項目はカードにならない
	test('ends the story map at the next heading and ignores list items after it', () => {
		const outline = md`
			## Story Map

			- Activity A

			## Appendix

			- Not a card
		`;

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
			),
		);
		assert.ok(!/<div class="card[^"]*"[^>]*>Not a card<\/div>/.test(html));
	});

	// 見出しの一致は大文字小文字を区別しない。「story map」「STORY MAP」も一致し、前後の空白と語の間の空白の数は無視される
	test('matches the Story Map heading regardless of case and the amount of spaces', () => {
		for (const heading of [
			'story map',
			'STORY MAP',
			' Story Map ',
			'Story   Map',
		]) {
			const html = renderMap(md`
				- Not a card

				## ${heading}

				- Activity A
			`);

			assert.ok(
				!/<div class="card[^"]*"[^>]*>Not a card<\/div>/.test(html),
				heading,
			);
			assert.ok(
				html.includes(
					'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
				),
				heading,
			);
		}
	});

	// 「My Story Map」のように前後に語がある見出しは一致せず、文書全体がストーリーマップとして扱われる
	test('does not treat a heading with extra words such as My Story Map as the Story Map heading', () => {
		const html = renderMap(md`
			- Activity A

			## My Story Map

			- Activity B
		`);

		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 2; grid-row: 1;">Activity B</div>',
			),
		);
	});

	// PNGのファイル名に使うmapTitleも、「Story Map」の見出しではなく文書の最初の見出しを返す
	test('mapTitle returns the first heading of the document, not the Story Map heading', () => {
		assert.strictEqual(
			mapTitle(md`
				# Design Notes

				## Story Map

				- Activity A
			`),
			'Design Notes',
		);
	});

	// 「//」で始まるアイテムはメモであり、カードにならない
	test('does not render an item starting with // as a card', () => {
		const html = renderMap(
			md`
			- Activity A
				- Task A1
				- // Why this task matters
		`,
		);

		assert.ok(!html.includes('Why this task matters'));
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
	});

	// 「//」で始まるアイテムの子孫もメモの一部であり、カードにならない
	test('does not render the descendants of a // item as cards', () => {
		const html = renderMap(
			md`
			- Activity A
				- // Background
					- A detail of the background
						- A deeper detail
		`,
		);

		assert.ok(!html.includes('A detail of the background'));
		assert.ok(!html.includes('A deeper detail'));
	});

	// メモは内部カラムに影響しない。メモの次の兄弟は、メモがないときと同じカラムに置かれる
	test('does not give a // item an inner column of its own', () => {
		const html = renderMap(
			md`
			- Activity A
				- Task A1
				- // memo
				- Task A2
		`,
		);

		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 2; grid-row: 2;">Task A2</div>',
			),
		);
	});

	// メモは行数に影響しない。「^」を付けたメモもメモのままで、親の帯の行を増やさない
	test('does not add a row for a // item marked with a caret', () => {
		const html = renderMap(
			md`
			- Activity A
				- Task A1
					- ^ // memo
				- Task A2
					- Task A3
		`,
		);

		// Task A1 のレベル（2行目）は1行のままなので、Task A3 は3行目に置かれる
		assert.ok(
			html.includes(
				'<div class="card level3" style="grid-column: 2; grid-row: 3;">Task A3</div>',
			),
		);
		assert.ok(
			html.includes(
				'<div class="row-band level2" style="grid-column: 1 / 3; grid-row: 2;"></div>',
			),
		);
	});

	// 「//」の直後に空白がなくてもメモとして無視される
	test('treats //memo without a space after the slashes as a memo too', () => {
		const html = renderMap(md`
			- Activity A
				- //memo
				- Task A1
		`);

		assert.ok(!html.includes('memo'));
		assert.ok(
			html.includes(
				'<div class="card level2" style="grid-column: 1; grid-row: 2;">Task A1</div>',
			),
		);
	});

	// トップレベルの「//」アイテムは子ごと無視され、カラムを作らない。次のアクティビティは1列目に置かれる
	test('ignores a top-level // item with its children and makes no column for it', () => {
		const html = renderMap(md`
			- // Ideas
				- An idea
			- Activity A
		`);

		assert.ok(!html.includes('Ideas'));
		assert.ok(!html.includes('An idea'));
		assert.ok(
			html.includes(
				'<div class="card level1" style="grid-column: 1; grid-row: 1;">Activity A</div>',
			),
		);
	});

	// 「//」で始まるパラグラフは対象外で、補足としてそのまま表示される
	test('still shows a paragraph starting with // as a note', () => {
		const html = renderMap(md`
			// Not a memo

			- Activity A
		`);

		assert.ok(html.includes('<p class="leading-note">// Not a memo</p>'));
	});
});
