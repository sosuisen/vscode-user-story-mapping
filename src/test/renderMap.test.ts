import * as assert from 'assert';
import { renderMap } from '../renderMap';

// マップの描画
suite('renderMap', () => {
	// アクティビティが、アウトラインの順でグリッドの1行目に横一列に並ぶ
	test('renders activities in outline order on the first grid row', () => {
		const outline = '- Activity A\n- Activity B\n- Activity C';

		const html = renderMap(outline);

		// グリッドコンテナは1つだけ
		assert.strictEqual((html.match(/class="map-grid"/g) ?? []).length, 1);
		// アクティビティのカードが Activity A → Activity B → Activity C の順に並ぶ
		const cards = [...html.matchAll(/<div class="activity"[^>]*>([^<]*)<\/div>/g)].map(m => m[1]);
		assert.deepStrictEqual(cards, ['Activity A', 'Activity B', 'Activity C']);
		// すべてのアクティビティが1行目にある
		assert.strictEqual((html.match(/<div class="activity"[^>]*grid-row: 1;/g) ?? []).length, 3);
	});

	// マップ全体がグリッドとして配置される
	test('lays out the map as a grid', () => {
		const html = renderMap('- Activity A\n- Activity B');

		assert.ok(/\.map-grid\s*\{[^}]*display:\s*grid/.test(html));
	});

	// 各アクティビティの下に、そのタスクがアウトラインの順で縦に並ぶ
	test('renders tasks under their activity in outline order', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t- Task A2\n- Activity B\n\t- Task B1';

		const html = renderMap(outline);

		// カードが Activity A → Task A1 → Task A2 → Activity B → Task B1 の順に並ぶ
		const cards = [...html.matchAll(/<div class="(?:activity|task)(?: skeleton)?"[^>]*>([^<]*)<\/div>/g)].map(m => m[1]);
		assert.deepStrictEqual(cards, ['Activity A', 'Task A1', 'Task A2', 'Activity B', 'Task B1']);
		// タスクは自分のアクティビティと同じグリッド列に入る
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 1; grid-row: 3;">Task A2</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">Task B1</div>'));
	});

	// スペースでインデントされたタスクも、タブと同じくアクティビティの下に並ぶ
	test('renders space-indented tasks the same as tab-indented ones', () => {
		const outline = '- Activity A\n  - Task A1\n    - Task A2';

		const html = renderMap(outline);

		assert.ok(/<div class="task skeleton"[^>]*>Task A1<\/div>/.test(html));
		assert.ok(/<div class="task"[^>]*>Task A2<\/div>/.test(html));
	});

	// [ ] と [x] は、チェックボックス絵文字として表示される
	test('renders checkbox markers as emoji', () => {
		const outline = '- Activity A\n\t- [x] Task A1\n\t\t- [ ] Task A2';

		const html = renderMap(outline);

		assert.ok(/<div class="task skeleton done"[^>]*>✅ Task A1<\/div>/.test(html));
		assert.ok(/<div class="task todo"[^>]*>⬜ Task A2<\/div>/.test(html));
		// 生の [x] / [ ] は表示されない
		assert.ok(!html.includes('[x]'));
		assert.ok(!html.includes('[ ]'));
	});

	// 大文字の [X] も完了として絵文字になる
	test('renders an uppercase checkbox marker as emoji too', () => {
		const html = renderMap('- Activity A\n\t- [X] Task A1');

		assert.ok(/<div class="task skeleton done"[^>]*>✅ Task A1<\/div>/.test(html));
	});

	// 完了済み（[x]）のカードは枠なし・影なしになる
	test('removes the border and shadow from completed cards', () => {
		const outline = '- Activity A\n\t- [x] Task A1\n\t\t- [ ] Task A2';

		const html = renderMap(outline);

		// 完了カードにはdoneクラスが付き、未完了カードには付かない
		assert.ok(/<div class="task skeleton done"[^>]*>✅ Task A1<\/div>/.test(html));
		assert.ok(/<div class="task todo"[^>]*>⬜ Task A2<\/div>/.test(html));
		// doneのカードは枠なし・影なし
		assert.ok(/\.done\s*\{[^}]*border:\s*none/.test(html));
		assert.ok(/\.done\s*\{[^}]*box-shadow:\s*none/.test(html));
	});

	// 「_」だけのリスト項目は空白レベルとして扱われ、カードにはならない
	test('treats an underscore-only list item as a blank level without a card', () => {
		const outline = '- Activity A\n\t- _\n\t\t- Task A2';

		const html = renderMap(outline);

		// 空白レベルの下のタスクはレベル2（3行目）に置かれる
		assert.ok(/<div class="task" style="grid-column: 1; grid-row: 3;">Task A2<\/div>/.test(html));
		// 「_」のカードは作られない
		assert.ok(!/<div class="(?:activity|task)[^"]*"[^>]*>_<\/div>/.test(html));
	});

	// CRLF改行のアウトラインでも、「_」だけのリスト項目は空白レベルとして扱われ、その下のタスクが描画される
	test('treats an underscore-only list item as a blank level in a CRLF outline', () => {
		const outline = '- Activity A\r\n\t- _\r\n\t\t- Task A2\r\n';

		const html = renderMap(outline);

		// 空白レベルの下のタスクはレベル2（3行目）に置かれる
		assert.ok(/<div class="task" style="grid-column: 1; grid-row: 3;">Task A2<\/div>/.test(html));
		// 「_」のカードは作られない
		assert.ok(!/<div class="(?:activity|task)[^"]*"[^>]*>_<\/div>/.test(html));
	});

	// 内容のない「- 」だけの行は空白レベルにならない。その解釈はCommonMarkに任せる（ADR 003）
	test('does not treat an empty list item as a blank level', () => {
		const outline = '- Activity A\n\t- \n\t\t- Task A2';

		const html = renderMap(outline);

		// 空白レベルではないので、Task A2はレベル2（3行目）には置かれない
		assert.ok(!/<div class="task" style="grid-column: 1; grid-row: 3;">Task A2<\/div>/.test(html));
	});

	// 「_」の前後に半角スペースがあっても、空白レベルとして扱われる
	test('treats an underscore with surrounding spaces as a blank level', () => {
		const outline = '- Activity A\n\t-  _  \n\t\t- Task A2';

		const html = renderMap(outline);

		// 空白レベルの下のタスクはレベル2（3行目）に置かれる
		assert.ok(/<div class="task" style="grid-column: 1; grid-row: 3;">Task A2<\/div>/.test(html));
		// 「_」のカードは作られない
		assert.ok(!/<div class="(?:activity|task)[^"]*"[^>]*>_<\/div>/.test(html));
	});

	// テキストに「_」を含むだけのアイテムは、空白レベルではなく通常のカードになる
	test('renders an item that merely contains an underscore as a normal card', () => {
		const outline = '- Activity A\n\t- snake_case\n\t\t- Task A2';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">snake_case</div>'));
	});

	// リスト項目の末尾に複数のハッシュタグを付けられる。タグは本文から切り離され、「#」なしでカードの末尾に並ぶ
	test('renders trailing hashtags as tags at the end of the card', () => {
		const outline = '- Activity A\n\t- Task A1 #tag1 #tag2';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1<span class="tag">tag1</span><span class="tag">tag2</span></div>'));
	});

	// タグは白い背景で角丸に囲まれる
	test('draws tags with a white background and rounded corners', () => {
		const html = renderMap('- Activity A #tag1');

		assert.ok(/\.tag\s*\{[^}]*background:\s*white/.test(html));
		assert.ok(/\.tag\s*\{[^}]*border-radius:/.test(html));
	});

	// タグの後ろに「+」を付けられる。タグは表示され、子は同じレベルの1つ下の行に置かれる
	test('accepts a trailing plus after the tags', () => {
		const outline = '- Activity A\n\t- Task A1 #tag1 +\n\t\t- Task A1b';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1<span class="tag">tag1</span></div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 3;">Task A1b</div>'));
	});

	// 行末に「+」があるアイテムの子は、次のCSS行に置かれ、親と同じ帯のクラス（skeleton）を持つ。表示テキストから「+」は消える
	test('places the child of an item with a trailing plus on the next row in the same band', () => {
		const outline = '- Activity A\n\t- Task A1 +\n\t\t- Task A1b';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 3;">Task A1b</div>'));
	});

	// 「+」が連鎖すると、CSS行が1つずつ下がりながら同じ帯が続く
	test('keeps the band while trailing pluses chain down the rows', () => {
		const outline = '- Activity A\n\t- Task A1 +\n\t\t- Task A1b +\n\t\t\t- Task A1c';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 3;">Task A1b</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 4;">Task A1c</div>'));
	});

	// 帯の高さ（CSS行数）は全列でそろう。「+」で2行になったアクティビティ帯に合わせて、「+」のない列のskeletonも3行目に下がる
	test('aligns band heights across columns so a plain column moves down too', () => {
		const outline = '- Activity A +\n\t- Activity A2\n\t\t- Task A1\n- Activity B\n\t- Task B1';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 3;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 3;">Task B1</div>'));
	});

	// 帯（row-band）は、そのlevelの行数分の高さになる。2行になったアクティビティ帯は1〜2行目にまたがり、skeleton帯は3行目になる
	test('stretches a band over all the rows of its level', () => {
		const outline = '- Activity A +\n\t- Activity A2\n\t\t- Task A1';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-band activity-band" style="grid-column: 1 / 2; grid-row: 1 / 3;"></div>'));
		assert.ok(html.includes('<div class="row-band skeleton-band" style="grid-column: 1 / 2; grid-row: 3;"></div>'));
	});

	// レベルのタイトルは、各帯の先頭行に置かれる。最初の帯が2行なら、2番目のタイトルは3行目、3番目は4行目
	test('places each level title on the first row of its band', () => {
		const outline = '1. First\n2. Second\n3. Third\n\n- Activity A +\n\t- Activity A2\n\t\t- Task A1\n\t\t\t- Task A2';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 3;">Second</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 4;">Third</div>'));
	});

	// Next Goalの帯の明暗は、CSS行ではなくlevelごとに交互になる。2行にまたがるlevel 2の帯は1色で、次のlevel 3がalt
	test('alternates task bands per level, not per row', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t- Task A2 +\n\t\t\t- Task A2b\n\t\t\t\t- Task A3';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-band tasks-band" style="grid-column: 1 / 2; grid-row: 3 / 5;"></div>'));
		assert.ok(html.includes('<div class="row-band tasks-band alt" style="grid-column: 1 / 2; grid-row: 5;"></div>'));
	});

	// 「+」の子の兄弟は、タスクの兄弟と同じく横（隣の列）に並ぶ。帯は親と同じ
	test('places siblings under an item with a trailing plus side by side in the same band', () => {
		const outline = '- Activity A\n\t- Task A1 +\n\t\t- Task A1b\n\t\t- Task A1c';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 3;">Task A1b</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 3;">Task A1c</div>'));
	});

	// ワード区切りが空白でない言語を考慮して、「+」の直前に空白がなくても、行末の「+」は積む印として扱われる
	test('treats a trailing plus without a preceding space as the stack mark too', () => {
		const outline = '- Activity A\n\t- タスクA1+\n\t\t- タスクA1b';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">タスクA1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 3;">タスクA1b</div>'));
	});

	// アクティビティの「+」の子は、2行目に列ごとに並び、activityクラスを持つ。列いっぱいに伸びるのは1行目だけ
	test('places the children of an activity with a trailing plus on the second row as activities', () => {
		const outline = '- Activity A +\n\t- Activity A1\n\t- Activity A2';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="activity" style="grid-column: 1 / span 2; grid-row: 1;">Activity A</div>'));
		assert.ok(html.includes('<div class="activity" style="grid-column: 1; grid-row: 2;">Activity A1</div>'));
		assert.ok(html.includes('<div class="activity" style="grid-column: 2; grid-row: 2;">Activity A2</div>'));
	});

	// アクティビティの「+」の子の子は、次の帯（Walking Skeleton）に置かれる
	test('places the grandchild of an activity with a trailing plus in the skeleton band', () => {
		const outline = '- Activity A +\n\t- Activity A2\n\t\t- Task A1';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 3;">Task A1</div>'));
	});

	// 「+」のない子は、次のlevel（帯）に置かれる
	test('places the child of an item without a trailing plus in the next band', () => {
		const outline = '- Activity A\n\t- Task A1 +\n\t\t- Task A1b\n\t\t\t- Task A1c';

		const html = renderMap(outline);

		// Task A1b はskeleton帯のまま、Task A1c はNext Goal帯（taskクラス）に置かれる
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 3;">Task A1b</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 1; grid-row: 4;">Task A1c</div>'));
	});

	// アイテム行内のインライン記法（強調など）がカードに反映される
	test('renders inline markdown such as emphasis inside a card', () => {
		const html = renderMap('- Activity A\n\t- **Task 1**');

		assert.ok(/<div class="task skeleton"[^>]*><strong>Task 1<\/strong><\/div>/.test(html));
	});

	// アクティビティのカードにもインライン記法が反映される
	test('renders inline markdown inside an activity card too', () => {
		const html = renderMap('- **Activity A**');

		assert.ok(/<div class="activity"[^>]*><strong>Activity A<\/strong><\/div>/.test(html));
	});

	// 行内の生のHTMLタグは解釈されず、文字としてエスケープ表示される
	// （注: markdown-it の既定（html: false）で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('escapes raw html tags in an item instead of rendering them', () => {
		const html = renderMap('- Activity A\n\t- <b>Task 1</b>');

		assert.ok(/<div class="task skeleton"[^>]*>&lt;b&gt;Task 1&lt;\/b&gt;<\/div>/.test(html));
	});

	// ズームUIは画面の左下端にある
	test('places the zoom controls at the bottom-left corner of the screen', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('.zoom-controls { position: fixed; left: 16px; bottom: 16px;'));
	});

	// ズームコントロールは「－ボタン」「現在の倍率」「＋ボタン」の順に並ぶ
	test('orders the zoom controls as minus button, current zoom, plus button', () => {
		const html = renderMap('- Activity A');

		assert.ok(
			/<div class="zoom-controls"><button class="zoom-out">－<\/button><span class="zoom-level">[^<]*<\/span><button class="zoom-in">＋<\/button><\/div>/.test(
				html
			)
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

		assert.ok(html.includes('<div class="map-zoom" style="zoom: 1.44;">'));
	});

	// ズーム値を渡さないと、マップは等倍で描画される
	// （注: 既定値1はズーム値対応と同時に入ったため、このテストは仕様の記録としてRedを経ずに置いたもの）
	test('renders the map at zoom 1 when no zoom is given', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('<div class="map-zoom" style="zoom: 1;">'));
	});

	// フローティングの保存ボタンが表示される
	test('renders a floating save button', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('<button class="save-png">PNG</button>'));
	});

	// 画像保存ボタンは画面の右下端にある
	test('places the save button at the bottom-right corner of the screen', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('.save-png { position: fixed; right: 16px; bottom: 16px;'));
	});

	// マークダウンで最初に現れた見出しが、マップ冒頭にタイトルとして表示される
	test('renders the first heading as the map title at the top', () => {
		const outline = '# Map Title\n- Activity A';

		const html = renderMap(outline);

		const titlePosition = html.indexOf('<h1 class="map-title">Map Title</h1>');
		assert.ok(titlePosition !== -1);
		// タイトルはグリッドコンテナより前にある
		assert.ok(titlePosition < html.indexOf('class="map-grid"'));
	});

	// アウトラインより上のパラグラフは、タイトルの下・グリッドの上に段落（map-note）として表示される
	test('renders a paragraph above the outline as a note between the title and the grid', () => {
		const outline = '# Map Title\n\nThis map covers the first release.\n\n- Activity A';

		const html = renderMap(outline);

		const notePosition = html.indexOf('<p class="map-note">This map covers the first release.</p>');
		assert.ok(notePosition !== -1);
		assert.ok(html.indexOf('<h1 class="map-title">Map Title</h1>') < notePosition);
		assert.ok(notePosition < html.indexOf('class="map-grid"'));
	});

	// パラグラフが複数あれば、アウトラインの順に段落が並ぶ
	test('renders several paragraphs above the outline as notes in order', () => {
		const outline = '# Map Title\n\nFirst note.\n\nSecond note.\n\n- Activity A';

		const html = renderMap(outline);

		assert.ok(html.includes('<p class="map-note">First note.</p><p class="map-note">Second note.</p>'));
	});

	// 段落の中のインライン記法（強調など）が反映される
	test('renders inline markdown inside a note', () => {
		const html = renderMap('# Map Title\n\nRead **this** first.\n\n- Activity A');

		assert.ok(html.includes('<p class="map-note">Read <strong>this</strong> first.</p>'));
	});

	// 見出しがなくても、アウトラインより上のパラグラフは段落として表示される
	test('renders a note above the outline even when there is no heading', () => {
		const html = renderMap('A note without a heading.\n\n- Activity A');

		assert.ok(html.includes('<p class="map-note">A note without a heading.</p>'));
	});

	// アウトラインより下のパラグラフは、補足事項の段落にはならない
	test('does not render a paragraph below the outline as a note', () => {
		const html = renderMap('# Map Title\n\n- Activity A\n\nA paragraph below the outline.');

		assert.ok(!html.includes('<p class="map-note">A paragraph below the outline.</p>'));
	});

	// 見出しがない場合、空のタイトル領域が表示される
	test('renders an empty title area when there is no heading', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('<h1 class="map-title"></h1>'));
	});

	// ## の見出しでも、最初に現れたものがタイトルになる
	test('renders a level-2 heading as the map title too', () => {
		const html = renderMap('## Map Title\n- Activity A');

		assert.ok(html.includes('<h1 class="map-title">Map Title</h1>'));
	});

	// 同じアクティビティ内で同じレベルのタスクは、右どなりのグリッド列に分かれて並ぶ
	test('puts same-level tasks into adjacent grid columns', () => {
		const outline = '- Activity A\n\t- Task A1\n\t- Task A2';

		const html = renderMap(outline);

		// 同じレベルなので、同じ行のまま隣のグリッド列に分かれる
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">Task A2</div>'));
	});

	// Ordered listがないとき、レベルのタイトルは1つも描画されない（ADR 004）
	test('renders no level titles when there is no ordered list', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t- Task A2\n\t\t\t- Task A3';

		const html = renderMap(outline);

		assert.ok(!html.includes('class="row-label"'));
	});

	// Ordered listがないとき、レベルのタイトルの列は作られず、カードは1列目から始まる（ADR 004）
	test('starts the cards at the first column when there is no ordered list', () => {
		const outline = '- Activity A\n\t- Task A1\n- Activity B';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="activity" style="grid-column: 1 / span 1; grid-row: 1;">Activity A</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="activity" style="grid-column: 2 / span 1; grid-row: 1;">Activity B</div>'));
	});

	// Ordered listがないとき、帯も1列目から始まり、カードの列数ぶんの幅になる（ADR 004）
	test('starts the bands at the first column and spans only the card columns when there is no ordered list', () => {
		const outline = '- Activity A\n\t- Task A1\n- Activity B';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-band activity-band" style="grid-column: 1 / 3; grid-row: 1;"></div>'));
		assert.ok(html.includes('<div class="row-band skeleton-band" style="grid-column: 1 / 3; grid-row: 2;"></div>'));
	});

	// Ordered listがあれば、その項目が上のレベルから順にレベルのタイトルになる。番号は表示されない。Ordered listは補足事項にはならない
	test('uses the items of an ordered list as the level titles', () => {
		const outline = '1. First\n2. Second\n3. Third\n4. Fourth\n\n- Activity A\n\t- Task A1\n\t\t- Task A2\n\t\t\t- Task A3';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 3;">Third</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 4;">Fourth</div>'));
		assert.ok(!html.includes('<p class="map-note">First</p>'));
	});

	// Ordered listの項目数より深いレベルには、タイトルがない。タイトルの列は残り、カードは2列目から始まる
	test('leaves levels beyond the ordered list without a title but keeps the title column', () => {
		const outline = '1. First\n2. Second\n\n- Activity A\n\t- Task A1\n\t\t- Task A2';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>'));
		assert.strictEqual((html.match(/class="row-label"/g) ?? []).length, 2);
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 3;">Task A2</div>'));
	});

	// Ordered listはアウトラインより下に置いてもレベルのタイトルになる
	test('uses an ordered list below the outline as the level titles', () => {
		const outline = '- Activity A\n\t- Task A1\n\n1. First\n2. Second';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>'));
	});

	// 存在しないレベルのタイトルは描画されない。Ordered listがレベル数より長くても、余りは表示されない
	test('does not render titles for levels that do not exist', () => {
		const outline = '1. First\n2. Second\n3. Third\n4. Fourth\n\n- Activity A\n\t- Task A1';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>'));
		assert.strictEqual((html.match(/class="row-label"/g) ?? []).length, 2);
	});

	// Ordered listがあるとき、レベルのタイトルは一番左のカラムに表示され、カードは2列目から始まる
	test('renders level titles in the leftmost column and starts the cards at the second column', () => {
		const outline = '1. First\n2. Second\n3. Third\n\n- Activity A\n\t- Task A1\n\t\t- Task A2\n\t\t\t- Task A3';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 1;">First</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 2;">Second</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 3;">Third</div>'));
		// タイトルは3つだけ（4行目以降にはない）
		assert.strictEqual((html.match(/class="row-label"/g) ?? []).length, 3);
		// アクティビティのカードは2列目から始まる
		assert.ok(/<div class="activity" style="grid-column: 2[^"]*"/.test(html));
	});

	// Walking Skeletonの行（レベル1）のタスクカードだけがskeletonクラスを持つ
	test('marks only level-1 task cards as skeleton', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t- Task A2';

		const html = renderMap(outline);

		assert.ok(/<div class="task skeleton"[^>]*>Task A1<\/div>/.test(html));
		assert.ok(/<div class="task"[^>]*>Task A2<\/div>/.test(html));
	});

	// 色のルール（全行共通）: 横軸ごとに基本色の変数があり、帯は基本色で塗られ、
	// カード背景は基本色の明度だけ下げた濃い色（色相・彩度は保持）、枠色はさらに明度を下げた色として導出される
	test('derives band, card, and border colors from each row base color', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t- Task A2';

		const html = renderMap(outline);

		const rows = [
			{ colorVar: '--activity-color', bandClass: 'activity-band', cardSelector: '\\.activity', gridRow: '1;' },
			{ colorVar: '--skeleton-color', bandClass: 'skeleton-band', cardSelector: '\\.task\\.skeleton', gridRow: '2;' },
			{ colorVar: '--tasks-color', bandClass: 'tasks-band', cardSelector: '\\.task', gridRow: '3;' },
		];
		for (const row of rows) {
			// 基本色の変数が定義されている
			assert.ok(html.includes(`${row.colorVar}:`), row.colorVar);
			// 帯の要素が行の全列に敷かれる
			assert.ok(
				new RegExp(`<div class="row-band ${row.bandClass}" style="grid-column: 1 / \\d+; grid-row: ${row.gridRow.replace('/', '\\/')}"></div>`).test(html),
				`${row.bandClass} element`
			);
			// 帯は基本色で塗られる
			assert.ok(new RegExp(`\\.${row.bandClass}\\s*\\{[^}]*background:\\s*var\\(${row.colorVar}\\)`).test(html), `${row.bandClass} background`);
			// カード背景は基本色の明度だけ下げた濃い色
			assert.ok(
				new RegExp(`${row.cardSelector}\\s*\\{[^}]*background:\\s*hsl\\(from var\\(${row.colorVar}\\) h s calc\\(l \\* var\\(--card-shade\\)\\)\\)`).test(html),
				`${row.cardSelector} background`
			);
			// 枠色はさらに明度を下げた色
			assert.ok(
				new RegExp(`${row.cardSelector}\\s*\\{[^}]*border-color:\\s*hsl\\(from var\\(${row.colorVar}\\) h s calc\\(l \\* var\\(--border-shade\\)\\)\\)`).test(html),
				`${row.cardSelector} border`
			);
		}
		// 導出係数は1未満（明度を下げる＝濃くなる）で、枠のほうが暗い
		assert.ok(/--card-shade:\s*0\.\d+/.test(html));
		assert.ok(/--border-shade:\s*0\.\d+/.test(html));
	});

	// デフォルトの基本色は、Backboneが緑、Walking Skeletonが赤、Next Goalが黄
	test('has green, red, and yellow default base colors', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('--activity-color: #e0ffee'));
		assert.ok(html.includes('--skeleton-color: #ffe0e9'));
		assert.ok(html.includes('--tasks-color: #fff3e0'));
	});

	// Next Goalの帯は、1行ごとに基本色と少し明るい色が交互になる
	test('alternates task row bands between the base color and a lighter shade', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t- Task A2\n\t\t\t- Task A3\n\t\t\t\t- Task A4';

		const html = renderMap(outline);

		// タスク行（3〜5行目）に1行ずつ帯があり、偶数番目の行はaltクラスを持つ
		assert.ok(html.includes('<div class="row-band tasks-band" style="grid-column: 1 / 2; grid-row: 3;"></div>'));
		assert.ok(html.includes('<div class="row-band tasks-band alt" style="grid-column: 1 / 2; grid-row: 4;"></div>'));
		assert.ok(html.includes('<div class="row-band tasks-band" style="grid-column: 1 / 2; grid-row: 5;"></div>'));
		// altの帯の色は基本色から明度を変えて導出される
		assert.ok(/\.tasks-band\.alt\s*\{[^}]*background:\s*hsl\(from var\(--tasks-color\)/.test(html));
	});

	// 各行の帯の下端には、その行のカード背景色と同じ色のdashed区切り線が入る
	test('draws a dashed separator at the bottom of each row band', () => {
		const html = renderMap('- Activity A\n\t- Task A1');

		// 帯共通でdashedの下線がある
		assert.ok(/\.row-band\s*\{[^}]*border-bottom:\s*2px dashed/.test(html));
		// 線の色は各行のカード背景色と同じ導出式
		for (const colorVar of ['--activity-color', '--skeleton-color', '--tasks-color']) {
			assert.ok(
				new RegExp(`-band\\s*\\{[^}]*border-color:\\s*hsl\\(from var\\(${colorVar}\\) h s calc\\(l \\* var\\(--card-shade\\)\\)\\)`).test(html),
				colorVar
			);
		}
	});

	// [ ] のあるカードには影があり、チェックボックスのないカードには影がない
	test('casts a shadow only on cards with an open checkbox', () => {
		const outline = '- Activity A\n\t- [ ] Task A1\n\t\t- Task A2';

		const html = renderMap(outline);

		// 未完了チェックのカードにはtodoクラスが付き、チェックボックスなしには付かない
		assert.ok(/<div class="task skeleton todo"[^>]*>⬜ Task A1<\/div>/.test(html));
		assert.ok(/<div class="task"[^>]*>Task A2<\/div>/.test(html));
		// 影はtodoのカードだけに付く（右下方向）
		assert.ok(/\.todo\s*\{[^}]*box-shadow:\s*[1-9]\d*px [1-9]\d*px/.test(html));
		assert.ok(!/\.activity,\s*\.task\s*\{[^}]*box-shadow:/.test(html));
	});

	// カードには最低幅（120px）があり、狭くなりすぎない
	test('gives cards a minimum width so they do not get too narrow', () => {
		const html = renderMap('- Activity A');

		assert.ok(/\.activity,\s*\.task\s*\{[^}]*min-width:\s*120px/.test(html));
	});

	// 同じレベルのタスクは、どのカラムにあっても同じグリッド行に置かれる
	test('places tasks of the same level on the same grid row', () => {
		const outline = '- Activity A\n\t- Task A1\n- Activity B\n\t- Task B1\n\t\t- Task B2';

		const html = renderMap(outline);

		// レベル1は2行目、レベル2は3行目
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">Task B1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 3;">Task B2</div>'));
	});

	// タブ1個とスペース4個のインデントは同じレベルとして扱われる
	test('treats one tab and four spaces as the same level', () => {
		const outline = '- Activity A\n\t- Task A1\n    - Task A2';

		const html = renderMap(outline);

		// 同じレベルなので、同じ行のまま隣のグリッド列に分かれる
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 1; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">Task A2</div>'));
	});
});
