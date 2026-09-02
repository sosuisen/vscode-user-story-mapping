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
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 2; grid-row: 3;">Task A2</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 3; grid-row: 2;">Task B1</div>'));
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

	// 空のリスト項目は空白レベルとして扱われ、カードにはならない
	test('treats an empty list item as a blank level without a card', () => {
		const outline = '- Activity A\n\t- \n\t\t- Task A2';

		const html = renderMap(outline);

		// 空白レベルの下のタスクはレベル2（3行目）に置かれる
		assert.ok(/<div class="task" style="grid-column: 2; grid-row: 3;">Task A2<\/div>/.test(html));
		// 空のカードは作られない
		assert.ok(!/<div class="(?:activity|task)[^"]*"[^>]*><\/div>/.test(html));
	});

	// 「+」のアイテムは、1つ上のレベル（親タスクのセル）に縦に積まれる
	test('stacks plus-marked items into the parent task cell', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t+ Task A1b\n\t\t+ [ ] Task A1c';

		const html = renderMap(outline);

		assert.ok(
			html.includes(
				'<div class="task-stack" style="grid-column: 2; grid-row: 2;">' +
					'<div class="task skeleton">Task A1</div>' +
					'<div class="task skeleton">Task A1b</div>' +
					'<div class="task skeleton todo">⬜ Task A1c</div>' +
					'</div>'
			)
		);
	});

	// フローティングの＋/−ボタンが表示される（クリック時の動作はWebviewスクリプト側が担う）
	test('renders floating zoom buttons', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('<div class="zoom-controls">'));
		assert.ok(html.includes('<button class="zoom-in">＋</button>'));
		assert.ok(html.includes('<button class="zoom-out">－</button>'));
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

	// マークダウンで最初に現れた見出しが、マップ冒頭にタイトルとして表示される
	test('renders the first heading as the map title at the top', () => {
		const outline = '# Map Title\n- Activity A';

		const html = renderMap(outline);

		const titlePosition = html.indexOf('<h1 class="map-title">Map Title</h1>');
		assert.ok(titlePosition !== -1);
		// タイトルはグリッドコンテナより前にある
		assert.ok(titlePosition < html.indexOf('class="map-grid"'));
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
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 3; grid-row: 2;">Task A2</div>'));
	});

	// 一番左のカラムに、行の説明（User Activity / Walking Skeleton / User Tasks）が表示される。4行目以降にラベルはない
	test('renders row labels in the leftmost column', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t- Task A2\n\t\t\t- Task A3';

		const html = renderMap(outline);

		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 1;">User Activity</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 2;">Walking Skeleton</div>'));
		assert.ok(html.includes('<div class="row-label" style="grid-column: 1; grid-row: 3;">User Tasks</div>'));
		// ラベルは3つだけ（4行目以降にはない）
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

	// デフォルトの基本色は、User Activityが緑、Walking Skeletonが赤、User Tasksが黄
	test('has green, red, and yellow default base colors', () => {
		const html = renderMap('- Activity A');

		assert.ok(html.includes('--activity-color: #e0ffee'));
		assert.ok(html.includes('--skeleton-color: #ffe0e9'));
		assert.ok(html.includes('--tasks-color: #fff3e0'));
	});

	// User Tasksの帯は、1行ごとに基本色と少し明るい色が交互になる
	test('alternates task row bands between the base color and a lighter shade', () => {
		const outline = '- Activity A\n\t- Task A1\n\t\t- Task A2\n\t\t\t- Task A3\n\t\t\t\t- Task A4';

		const html = renderMap(outline);

		// タスク行（3〜5行目）に1行ずつ帯があり、偶数番目の行はaltクラスを持つ
		assert.ok(html.includes('<div class="row-band tasks-band" style="grid-column: 1 / 3; grid-row: 3;"></div>'));
		assert.ok(html.includes('<div class="row-band tasks-band alt" style="grid-column: 1 / 3; grid-row: 4;"></div>'));
		assert.ok(html.includes('<div class="row-band tasks-band" style="grid-column: 1 / 3; grid-row: 5;"></div>'));
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
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 3; grid-row: 2;">Task B1</div>'));
		assert.ok(html.includes('<div class="task" style="grid-column: 3; grid-row: 3;">Task B2</div>'));
	});

	// タブ1個とスペース4個のインデントは同じレベルとして扱われる
	test('treats one tab and four spaces as the same level', () => {
		const outline = '- Activity A\n\t- Task A1\n    - Task A2';

		const html = renderMap(outline);

		// 同じレベルなので、同じ行のまま隣のグリッド列に分かれる
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 2; grid-row: 2;">Task A1</div>'));
		assert.ok(html.includes('<div class="task skeleton" style="grid-column: 3; grid-row: 2;">Task A2</div>'));
	});
});
