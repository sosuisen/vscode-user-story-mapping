import MarkdownIt = require('markdown-it');

const markdown = new MarkdownIt();

type Card = { text: string; done: boolean; todo: boolean };
type Task = { cards: Card[]; depth: number };

// 行頭の [x] / [ ] をチェックボックス絵文字にする
function withCheckboxEmoji(text: string): string {
	return text.replace(/^\[[xX]\] /, '✅ ').replace(/^\[ \] /, '⬜ ');
}

// 行頭に完了チェック [x] があるか
function isDone(text: string): boolean {
	return /^\[[xX]\] /.test(text);
}

// 行頭に未完了チェック [ ] があるか
function isTodo(text: string): boolean {
	return /^\[ \] /.test(text);
}

// 空白レベルの印（CommonMarkでは空のリスト項目が段落に割り込めないため、
// パース前にゼロ幅スペースを補ってリストとして成立させる）
const blankMarker = '​';
const blankItemPattern = /^([ \t]*)-[ \t]*$/;

function fillBlankItems(outline: string): string {
	return outline
		.split('\n')
		.map(line => line.replace(blankItemPattern, `$1- ${blankMarker}`))
		.join('\n');
}

function cardOf(content: string): Card {
	return { text: withCheckboxEmoji(content), done: isDone(content), todo: isTodo(content) };
}

// アウトラインの最初の見出しをマップのタイトルとして返す（なければ空文字）
export function mapTitle(outline: string): string {
	const tokens = markdown.parse(fillBlankItems(outline), {});
	const headingIndex = tokens.findIndex(token => token.type === 'heading_open');
	return headingIndex === -1 ? '' : (tokens[headingIndex + 1]?.content ?? '');
}

export function renderMap(outline: string): string {
	const tokens = markdown.parse(fillBlankItems(outline), {});
	let titleText = '';
	let titleFound = false;
	const columns: { activity: string; done: boolean; todo: boolean; taskColumns: Task[][]; lastDepth: number }[] = [];
	let listDepth = 0;
	let maxDepth = 0;
	let itemMarkup = '-';
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === undefined) {
			continue;
		}
		if (token.type === 'bullet_list_open') {
			listDepth++;
		} else if (token.type === 'list_item_open') {
			itemMarkup = token.markup;
		} else if (token.type === 'bullet_list_close') {
			listDepth--;
		} else if (token.type === 'heading_open' && !titleFound) {
			titleText = tokens[i + 1]?.content ?? '';
			titleFound = true;
		} else if (token.type === 'inline' && listDepth > 0) {
			// 空白レベルの項目はカードにしない（ネストの深さだけに寄与する）
			if (token.content === blankMarker) {
				continue;
			}
			const depth = listDepth - 1;
			if (depth === 0) {
				columns.push({ activity: withCheckboxEmoji(token.content), done: isDone(token.content), todo: isTodo(token.content), taskColumns: [], lastDepth: 0 });
			} else {
				const column = columns.at(-1);
				if (column !== undefined) {
					// 「+」のアイテムは、1つ上のレベル（親タスクのセル）にカードとして積む
					const parentTask = column.taskColumns.at(-1)?.at(-1);
					if (itemMarkup === '+' && parentTask !== undefined) {
						parentTask.cards.push(cardOf(token.content));
						continue;
					}
					if (column.taskColumns.length === 0 || depth <= column.lastDepth) {
						column.taskColumns.push([]);
					}
					column.taskColumns.at(-1)?.push({ cards: [cardOf(token.content)], depth });
					column.lastDepth = depth;
					maxDepth = Math.max(maxDepth, depth);
				}
			}
		}
	}
	const title = `<h1 class="map-title">${titleText}</h1>`;
	const cells: string[] = [];
	// 1列目は行の説明ラベル。データのカラムは2列目から始まる
	let nextColumn = 2;
	for (const column of columns) {
		const width = Math.max(column.taskColumns.length, 1);
		const activityClasses = 'activity' + (column.done ? ' done' : '') + (column.todo ? ' todo' : '');
		cells.push(`<div class="${activityClasses}" style="grid-column: ${nextColumn} / span ${width}; grid-row: 1;">${column.activity}</div>`);
		column.taskColumns.forEach((tasks, columnOffset) => {
			for (const task of tasks) {
				const classesOf = (card: Card) =>
					(task.depth === 1 ? 'task skeleton' : 'task') + (card.done ? ' done' : '') + (card.todo ? ' todo' : '');
				const position = `grid-column: ${nextColumn + columnOffset}; grid-row: ${task.depth + 1};`;
				const first = task.cards[0];
				if (task.cards.length === 1 && first !== undefined) {
					cells.push(`<div class="${classesOf(first)}" style="${position}">${first.text}</div>`);
				} else {
					const stacked = task.cards.map(card => `<div class="${classesOf(card)}">${card.text}</div>`).join('');
					cells.push(`<div class="task-stack" style="${position}">${stacked}</div>`);
				}
			}
		});
		nextColumn += width;
	}
	const rowLabels = ['User Activity', 'Walking Skeleton', 'User Tasks'];
	rowLabels.forEach((label, index) => {
		cells.unshift(`<div class="row-label" style="grid-column: 1; grid-row: ${index + 1};">${label}</div>`);
	});
	// 帯は背面に敷くため、カードより先（DOM順で前）に置く
	const bands = [
		`<div class="row-band activity-band" style="grid-column: 1 / ${nextColumn}; grid-row: 1;"></div>`,
		`<div class="row-band skeleton-band" style="grid-column: 1 / ${nextColumn}; grid-row: 2;"></div>`,
	];
	// User Tasksの帯は1行ずつ敷き、偶数番目の行を少し明るくする
	for (let row = 3; row <= maxDepth + 1; row++) {
		const alt = (row - 3) % 2 === 1 ? ' alt' : '';
		bands.push(`<div class="row-band tasks-band${alt}" style="grid-column: 1 / ${nextColumn}; grid-row: ${row};"></div>`);
	}
	cells.unshift(...bands);
	return `<style>
:root { --activity-color: #e0ffee; --skeleton-color: #ffe0e9; --tasks-color: #fff3e0; --card-shade: 0.93; --border-shade: 0.6; --alt-shade: 1.04; }
body { background: white; color: black; }
.map-zoom { width: fit-content; display: flow-root; padding: 16px; }
.map-grid { display: grid; gap: 0; justify-content: start; align-items: start; }
.activity, .task { border: 2px solid; padding: 4px 8px; margin: 8px; border-radius: 6px; min-width: 120px; box-sizing: border-box; }
.todo { box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2); }
.activity { background: hsl(from var(--activity-color) h s calc(l * var(--card-shade))); border-color: hsl(from var(--activity-color) h s calc(l * var(--border-shade))); }
.task { background: hsl(from var(--tasks-color) h s calc(l * var(--card-shade))); border-color: hsl(from var(--tasks-color) h s calc(l * var(--border-shade))); }
.task.skeleton { background: hsl(from var(--skeleton-color) h s calc(l * var(--card-shade))); border-color: hsl(from var(--skeleton-color) h s calc(l * var(--border-shade))); }
.done { border: none; box-shadow: none; }
.row-label { padding: 4px 8px; margin: 8px; color: #888; white-space: nowrap; }
.row-band { align-self: stretch; justify-self: stretch; border-bottom: 2px dashed; }
.activity-band { background: var(--activity-color); border-color: hsl(from var(--activity-color) h s calc(l * var(--card-shade))); }
.skeleton-band { background: var(--skeleton-color); border-color: hsl(from var(--skeleton-color) h s calc(l * var(--card-shade))); }
.tasks-band { background: var(--tasks-color); border-color: hsl(from var(--tasks-color) h s calc(l * var(--card-shade))); }
.tasks-band.alt { background: hsl(from var(--tasks-color) h s calc(l * var(--alt-shade))); }
.zoom-controls { position: fixed; right: 16px; bottom: 16px; display: flex; gap: 8px; }
.zoom-controls button { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #888; background: white; color: black; font-size: 16px; cursor: pointer; }
</style>
<div class="map-zoom">${title}<div class="map-grid">${cells.join('')}</div></div>
<div class="zoom-controls"><button class="zoom-in">＋</button><button class="zoom-out">－</button><button class="save-png">📷</button></div>
<script>
let zoom = 1;
const mapZoom = document.querySelector('.map-zoom');
const applyZoom = () => { mapZoom.style.zoom = zoom; };
document.querySelector('.zoom-in').addEventListener('click', () => { zoom *= 1.2; applyZoom(); });
document.querySelector('.zoom-out').addEventListener('click', () => { zoom /= 1.2; applyZoom(); });
</script>`;
}
