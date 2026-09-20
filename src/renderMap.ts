import MarkdownIt = require('markdown-it');
import { formatZoomLevel } from './zoomLevel';

const markdown = new MarkdownIt();

type Card = { text: string; done: boolean; todo: boolean };
type Cell = { cards: Card[]; level: number };

// Turn a leading [x] / [ ] into a checkbox emoji
function withCheckboxEmoji(text: string): string {
	return text.replace(/^\[[xX]\] /, '✅ ').replace(/^\[ \] /, '⬜ ');
}

// Whether the text starts with a done check [x]
function isDone(text: string): boolean {
	return /^\[[xX]\] /.test(text);
}

// Whether the text starts with an open check [ ]
function isTodo(text: string): boolean {
	return /^\[ \] /.test(text);
}

// Marker for a blank level. In CommonMark an empty list item cannot break into a paragraph,
// so a zero-width space is added before parsing to keep the item as part of the list.
// CRLF line breaks are accepted and normalized to LF
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

// A trailing "+" marks an item whose children are stacked into its own cell
// The space before "+" is optional, for languages that do not separate words with spaces. If present, it is removed together with the "+"
const trailingPlusPattern = /\s*\+$/;

function hasTrailingPlus(content: string): boolean {
	return trailingPlusPattern.test(content);
}

function withoutTrailingPlus(content: string): string {
	return content.replace(trailingPlusPattern, '');
}

// Return the first heading of the outline as the map title (empty string if none)
export function mapTitle(outline: string): string {
	const tokens = markdown.parse(fillBlankItems(outline), {});
	const headingIndex = tokens.findIndex(token => token.type === 'heading_open');
	return headingIndex === -1 ? '' : (tokens[headingIndex + 1]?.content ?? '');
}

// Render one grid cell. A single card is rendered as is. Two or more cards are wrapped in "<first word of kind>-stack" and stacked vertically
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
	// The latest item at each indent depth. Used to decide the level of a child and to find the cell to stack into with "+"
	// An item stacked into its parent gets the same level and the same Cell as the parent
	const itemByIndentDepth: { level: number; cell?: Cell; stacksChildren?: boolean }[] = [];
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
			// The level of a child is one below the level of its parent
			const level = (parent?.level ?? -1) + 1;
			// A blank-level item makes no card. It only adds to the indent depth
			if (token.content === blankMarker) {
				itemByIndentDepth[indentDepth] = { level };
				continue;
			}
			const stacksChildren = hasTrailingPlus(token.content);
			const card = cardOf(withoutTrailingPlus(token.content));
			itemByIndentDepth[indentDepth] = { level, stacksChildren };
			// If the parent has a trailing "+", stack into the cell that holds the parent card (same for activities and tasks)
			if (parent?.stacksChildren === true && parent.cell !== undefined) {
				parent.cell.cards.push(card);
				itemByIndentDepth[indentDepth] = { level: parent.level, cell: parent.cell, stacksChildren };
				continue;
			}
			if (level === 0) {
				const activity = { cards: [card], level };
				columns.push({ activity, taskColumns: [], lastLevel: 0 });
				itemByIndentDepth[indentDepth] = { level, cell: activity, stacksChildren };
			} else {
				const column = columns.at(-1);
				if (column !== undefined) {
					// An item with the "+" list marker is stacked as a card into the level above (the parent task cell)
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
					itemByIndentDepth[indentDepth] = { level, cell, stacksChildren };
					column.lastLevel = level;
					maxLevel = Math.max(maxLevel, level);
				}
			}
		}
	}
	const title = `<h1 class="map-title">${titleText}</h1>`;
	const cells: string[] = [];
	// The first column holds the row labels. Data columns start at the second column
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
	// Bands go behind the cards, so they come first in DOM order
	const bands = [
		`<div class="row-band activity-band" style="grid-column: 1 / ${nextColumn}; grid-row: 1;"></div>`,
		`<div class="row-band skeleton-band" style="grid-column: 1 / ${nextColumn}; grid-row: 2;"></div>`,
	];
	// The User Tasks bands are laid one per row, and every second row is a bit lighter
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
