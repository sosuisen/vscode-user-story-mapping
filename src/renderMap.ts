import MarkdownIt = require('markdown-it');
import { formatZoomLevel } from './zoomLevel';

const markdown = new MarkdownIt();

type Card = { text: string; done: boolean; todo: boolean; tags: string[] };
// rowInLevel is the row inside the band of the level: 0 for the first row, 1 for a child placed under a trailing "+", and so on
type Cell = { card: Card; level: number; rowInLevel: number };

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

// Marker for a blank level: an item whose whole text is "_"
const blankMarker = '_';

// Trailing hashtags such as "#tag1 #tag2" are tags of the item, not part of its text
const trailingTagsPattern = /(?:\s+#\S+)+$/;

function trailingTagsOf(content: string): string[] {
	const match = trailingTagsPattern.exec(content);
	return match === null ? [] : match[0].trim().split(/\s+/).map(tag => tag.slice(1));
}

function withoutTrailingTags(content: string): string {
	return content.replace(trailingTagsPattern, '');
}

function cardOf(content: string): Card {
	const text = withoutTrailingTags(content);
	return { text: markdown.renderInline(withCheckboxEmoji(text)), done: isDone(text), todo: isTodo(text), tags: trailingTagsOf(content) };
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
	const tokens = markdown.parse(outline, {});
	const headingIndex = tokens.findIndex(token => token.type === 'heading_open');
	return headingIndex === -1 ? '' : (tokens[headingIndex + 1]?.content ?? '');
}

// Render one grid cell as a card
function renderCell(card: Card, kind: string, position: string): string {
	const classes = kind + (card.done ? ' done' : '') + (card.todo ? ' todo' : '');
	const tags = card.tags.map(tag => `<span class="tag">${markdown.utils.escapeHtml(tag)}</span>`).join('');
	return `<div class="${classes}" style="${position}">${card.text}${tags}</div>`;
}

// The card class for a level: level 0 is the activity band, level 1 is the skeleton band, the rest are task bands
function kindOf(level: number): string {
	if (level === 0) {
		return 'activity';
	}
	return level === 1 ? 'task skeleton' : 'task';
}

// The band class for a level. Every second task level is a bit lighter
function bandClassOf(level: number): string {
	if (level === 0) {
		return 'activity-band';
	}
	if (level === 1) {
		return 'skeleton-band';
	}
	return (level - 2) % 2 === 1 ? 'tasks-band alt' : 'tasks-band';
}

export type RenderMapOptions = { zoom?: number };

export function renderMap(outline: string, options: RenderMapOptions = {}): string {
	const zoom = options.zoom ?? 1;
	const tokens = markdown.parse(outline, {});
	let titleText = '';
	let titleFound = false;
	// Paragraphs above the outline, shown as notes under the title
	const notes: string[] = [];
	let listSeen = false;
	// Each activity column group: the top activity card, and the cells below it in sub-columns
	const columns: { activity: Card; subColumns: Cell[][]; lastIndentDepth: number }[] = [];
	let openLists = 0;
	// The number of rows each level needs, which is the largest rowInLevel + 1 over all columns
	// The activity band (level 0) and the skeleton band (level 1) are always drawn, so they start at one row each
	const rowsByLevel: number[] = [1, 1];
	// The latest item at each indent depth. Used to decide the level and the rowInLevel of a child
	// A child of an item with a trailing "+" stays on the same level as the parent, one row further down inside the band
	const itemByIndentDepth: { level: number; rowInLevel: number; stacksChildren?: boolean }[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === undefined) {
			continue;
		}
		if (token.type === 'bullet_list_open') {
			openLists++;
			listSeen = true;
		} else if (token.type === 'bullet_list_close') {
			openLists--;
		} else if (token.type === 'heading_open' && !titleFound) {
			titleText = tokens[i + 1]?.content ?? '';
			titleFound = true;
		} else if (token.type === 'paragraph_open' && !listSeen) {
			notes.push(`<p class="map-note">${markdown.renderInline(tokens[i + 1]?.content ?? '')}</p>`);
		} else if (token.type === 'inline' && openLists > 0) {
			const indentDepth = openLists - 1;
			const parent = itemByIndentDepth[indentDepth - 1];
			// A child goes one level below its parent. If the parent has a trailing "+",
			// the child stays on the parent level instead, one row further down inside the band
			let level = 0;
			let rowInLevel = 0;
			if (parent !== undefined && parent.stacksChildren === true) {
				level = parent.level;
				rowInLevel = parent.rowInLevel + 1;
			} else if (parent !== undefined) {
				level = parent.level + 1;
			}
			rowsByLevel[level] = Math.max(rowsByLevel[level] ?? 1, rowInLevel + 1);
			// A blank-level item makes no card. It only adds to the indent depth
			if (token.content === blankMarker) {
				itemByIndentDepth[indentDepth] = { level, rowInLevel };
				continue;
			}
			const stacksChildren = hasTrailingPlus(token.content);
			const card = cardOf(withoutTrailingPlus(token.content));
			itemByIndentDepth[indentDepth] = { level, rowInLevel, stacksChildren };
			if (indentDepth === 0) {
				columns.push({ activity: card, subColumns: [], lastIndentDepth: 0 });
			} else {
				const column = columns.at(-1);
				if (column !== undefined) {
					// A sibling (same or shallower indent depth) starts a new sub-column to the right
					if (column.subColumns.length === 0 || indentDepth <= column.lastIndentDepth) {
						column.subColumns.push([]);
					}
					column.subColumns.at(-1)?.push({ card, level, rowInLevel });
					column.lastIndentDepth = indentDepth;
				}
			}
		}
	}
	// The first CSS row of each band. Bands are stacked in level order, and each band is as tall as the level needs
	const firstRowByLevel: number[] = [];
	let nextRow = 1;
	for (let level = 0; level < rowsByLevel.length; level++) {
		firstRowByLevel[level] = nextRow;
		nextRow += rowsByLevel[level] ?? 1;
	}
	const maxRow = nextRow - 1;
	const title = `<h1 class="map-title">${titleText}</h1>`;
	const cells: string[] = [];
	// The first column holds the row labels. Data columns start at the second column
	let nextColumn = 2;
	for (const column of columns) {
		const width = Math.max(column.subColumns.length, 1);
		cells.push(renderCell(column.activity, 'activity', `grid-column: ${nextColumn} / span ${width}; grid-row: 1;`));
		column.subColumns.forEach((columnCells, columnOffset) => {
			for (const cell of columnCells) {
				const row = (firstRowByLevel[cell.level] ?? 1) + cell.rowInLevel;
				cells.push(renderCell(cell.card, kindOf(cell.level), `grid-column: ${nextColumn + columnOffset}; grid-row: ${row};`));
			}
		});
		nextColumn += width;
	}
	// Each label sits on the first row of its band. The Next Goal label goes right after the last band when there are no tasks
	const rowLabels = ['Backbone', 'Walking Skeleton', 'Next Goal'];
	rowLabels.forEach((label, level) => {
		const row = firstRowByLevel[level] ?? maxRow + 1;
		cells.unshift(`<div class="row-label" style="grid-column: 1; grid-row: ${row};">${label}</div>`);
	});
	// Bands go behind the cards, so they come first in DOM order. One band per level, as tall as the level needs
	const bands: string[] = [];
	for (let level = 0; level < rowsByLevel.length; level++) {
		const first = firstRowByLevel[level] ?? 1;
		const rows = rowsByLevel[level] ?? 1;
		const gridRow = rows === 1 ? `${first}` : `${first} / ${first + rows}`;
		bands.push(`<div class="row-band ${bandClassOf(level)}" style="grid-column: 1 / ${nextColumn}; grid-row: ${gridRow};"></div>`);
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
.tag { background: white; border-radius: 8px; padding: 0 6px; margin-left: 4px; font-size: 0.8em; white-space: nowrap; }
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
<div class="map-zoom" style="zoom: ${zoom};">${title}${notes.join('')}<div class="map-grid">${cells.join('')}</div></div>
<div class="zoom-controls"><button class="zoom-out">－</button><span class="zoom-level">${formatZoomLevel(zoom)}</span><button class="zoom-in">＋</button></div><button class="save-png">PNG</button>`;
}
