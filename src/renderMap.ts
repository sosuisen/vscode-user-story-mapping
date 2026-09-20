import MarkdownIt = require('markdown-it');
import { formatZoomLevel } from './zoomLevel';

const markdown = new MarkdownIt();

type Card = { text: string; done: boolean; todo: boolean };
type Cell = { cards: Card[]; level: number };

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
// 改行はCRLFも受け付け、LFに正規化する
const blankMarker = '​';
const blankItemPattern = /^([ \t]*)-[ \t]*$/;

function fillBlankItems(outline: string): string {
	return outline
		.split(/\r?\n/)
		.map(line => line.replace(blankItemPattern, `$1- ${blankMarker}`))
		.join('\n');
}

function cardOf(content: string): Card {
	return { text: markdown.renderInline(withCheckboxEmoji(content)), done: isDone(content), todo: isTodo(content) };
}

// 行末の「^」は、親のセルに積む印
// 日本語では「^」の直前に空白がないことが多いので、空白は必須にしない。空白があれば「^」と一緒に取り除く
const trailingCaretPattern = /\s*\^$/;

function hasTrailingCaret(content: string): boolean {
	return trailingCaretPattern.test(content);
}

function withoutTrailingCaret(content: string): string {
	return content.replace(trailingCaretPattern, '');
}

// アウトラインの最初の見出しをマップのタイトルとして返す（なければ空文字）
export function mapTitle(outline: string): string {
	const tokens = markdown.parse(fillBlankItems(outline), {});
	const headingIndex = tokens.findIndex(token => token.type === 'heading_open');
	return headingIndex === -1 ? '' : (tokens[headingIndex + 1]?.content ?? '');
}

// グリッドの1セルを描画する。カードが1枚ならそのまま、2枚以上なら「<kindの先頭語>-stack」で包んで縦に積む
function renderCell(cards: Card[], kind: string, position: string): string {
	const classesOf = (card: Card) => kind + (card.done ? ' done' : '') + (card.todo ? ' todo' : '');
	const first = cards[0];
	if (cards.length === 1 && first !== undefined) {
		return `<div class="${classesOf(first)}" style="${position}">${first.text}</div>`;
	}
	const stacked = cards.map(card => `<div class="${classesOf(card)}">${card.text}</div>`).join('');
	const stackClass = `${kind.split(' ')[0]}-stack`;
	return `<div class="${stackClass}" style="${position}">${stacked}</div>`;
}

export type RenderMapOptions = { zoom?: number };

export function renderMap(outline: string, options: RenderMapOptions = {}): string {
	const zoom = options.zoom ?? 1;
	const tokens = markdown.parse(fillBlankItems(outline), {});
	let titleText = '';
	let titleFound = false;
	const columns: { activity: Cell; taskColumns: Cell[][]; lastLevel: number }[] = [];
	let openLists = 0;
	let maxLevel = 0;
	let itemMarkup = '-';
	// インデントの段数ごとの、直近のアイテム。子のレベルの決定と、「^」で積む先のセルの特定に使う
	// 親に積まれたアイテムは、親と同じレベル・同じCellになる
	const itemByIndentDepth: { level: number; cell?: Cell }[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === undefined) {
			continue;
		}
		if (token.type === 'bullet_list_open') {
			openLists++;
		} else if (token.type === 'list_item_open') {
			itemMarkup = token.markup;
		} else if (token.type === 'bullet_list_close') {
			openLists--;
		} else if (token.type === 'heading_open' && !titleFound) {
			titleText = tokens[i + 1]?.content ?? '';
			titleFound = true;
		} else if (token.type === 'inline' && openLists > 0) {
			const indentDepth = openLists - 1;
			const parent = itemByIndentDepth[indentDepth - 1];
			// 子のレベルは親のレベルの1つ下
			const level = (parent?.level ?? -1) + 1;
			// 空白レベルの項目はカードにしない（インデントの段数だけに寄与する）
			if (token.content === blankMarker) {
				itemByIndentDepth[indentDepth] = { level };
				continue;
			}
			const caret = hasTrailingCaret(token.content);
			const card = cardOf(withoutTrailingCaret(token.content));
			itemByIndentDepth[indentDepth] = { level };
			// 行末に「^」があるアイテムは、親のカードが入ったセルに積む（アクティビティもタスクも同じ）
			if (caret && parent?.cell !== undefined) {
				parent.cell.cards.push(card);
				itemByIndentDepth[indentDepth] = { level: parent.level, cell: parent.cell };
				continue;
			}
			if (level === 0) {
				const activity = { cards: [card], level };
				columns.push({ activity, taskColumns: [], lastLevel: 0 });
				itemByIndentDepth[indentDepth] = { level, cell: activity };
			} else {
				const column = columns.at(-1);
				if (column !== undefined) {
					// 「+」のアイテムは、1つ上のレベル（親タスクのセル）にカードとして積む
					const parentCell = column.taskColumns.at(-1)?.at(-1);
					if (itemMarkup === '+' && parentCell !== undefined) {
						parentCell.cards.push(card);
						continue;
					}
					if (column.taskColumns.length === 0 || level <= column.lastLevel) {
						column.taskColumns.push([]);
					}
					const cell = { cards: [card], level };
					column.taskColumns.at(-1)?.push(cell);
					itemByIndentDepth[indentDepth] = { level, cell };
					column.lastLevel = level;
					maxLevel = Math.max(maxLevel, level);
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
		cells.push(renderCell(column.activity.cards, 'activity', `grid-column: ${nextColumn} / span ${width}; grid-row: 1;`));
		column.taskColumns.forEach((columnCells, columnOffset) => {
			for (const cell of columnCells) {
				const kind = cell.level === 1 ? 'task skeleton' : 'task';
				cells.push(renderCell(cell.cards, kind, `grid-column: ${nextColumn + columnOffset}; grid-row: ${cell.level + 1};`));
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
	for (let row = 3; row <= maxLevel + 1; row++) {
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
.zoom-controls { position: fixed; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 8px; }
.zoom-controls button, .save-png { height: 32px; border: 2px solid #888; background: white; color: black; cursor: pointer; }
.zoom-controls button { width: 32px; border-radius: 50%; font-size: 16px; }
.save-png { position: fixed; right: 16px; bottom: 16px; padding: 0 12px; border-radius: 16px; font-size: 12px; font-weight: bold; }
</style>
<div class="map-zoom" style="zoom: ${zoom};">${title}<div class="map-grid">${cells.join('')}</div></div>
<div class="zoom-controls"><button class="zoom-out">－</button><span class="zoom-level">${formatZoomLevel(zoom)}</span><button class="zoom-in">＋</button></div><button class="save-png">PNG</button>`;
}
