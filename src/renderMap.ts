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

// A heading whose text is exactly "story map" (any case) starts the story map section
const storyMapHeadingPattern = /^story\s+map$/i;

// Return the first heading of the outline as the map title (empty string if none)
export function mapTitle(outline: string): string {
	const tokens = markdown.parse(outline, {});
	const headingIndex = tokens.findIndex(token => token.type === 'heading_open');
	return headingIndex === -1 ? '' : (tokens[headingIndex + 1]?.content ?? '');
}

// The CSS rules that give each level its colors. The band is painted in the base color of the level.
// The card background is the base color with a lower lightness, and the card border is darker still
const levelColorRules = [1, 2, 3, 4]
	.flatMap(level => [
		`.card.level${level} { background: hsl(from var(--level${level}-color) h s calc(l * var(--card-shade))); border-color: hsl(from var(--level${level}-color) h s calc(l * var(--border-shade))); }`,
		`.row-band.level${level} { background: var(--level${level}-color); border-color: hsl(from var(--level${level}-color) h s calc(l * var(--card-shade))); }`,
	])
	.join('\n');

// Render one grid cell as a card
function renderCell(card: Card, kind: string, position: string): string {
	const classes = kind + (card.done ? ' done' : '') + (card.todo ? ' todo' : '');
	const tags = card.tags.map(tag => `<span class="tag">${markdown.utils.escapeHtml(tag)}</span>`).join('');
	return `<div class="${classes}" style="${position}">${card.text}${tags}</div>`;
}

// Levels have no names. They are numbered from 1 at the top, and level 4 and below all count as level 4
function levelNumberOf(level: number): number {
	return Math.min(level + 1, 4);
}

// The card class for a level
function kindOf(level: number): string {
	return `card level${levelNumberOf(level)}`;
}

// The band class for a level. From level 4 down, every second level is a bit lighter
function bandClassOf(level: number): string {
	const base = `level${levelNumberOf(level)}`;
	return level >= 3 && (level - 3) % 2 === 1 ? `${base} alt` : base;
}

// With a "Story Map" heading, only the content from that heading up to the next heading is the story map.
// Without it, the whole document is the story map
function storyMapTokens(tokens: MarkdownIt.Token[]): MarkdownIt.Token[] {
	const headingIndex = tokens.findIndex(
		(token, index) => token.type === 'heading_open' && storyMapHeadingPattern.test((tokens[index + 1]?.content ?? '').trim())
	);
	if (headingIndex === -1) {
		return tokens;
	}
	// A heading is three tokens: heading_open, inline, heading_close
	const start = headingIndex + 3;
	const nextHeadingIndex = tokens.findIndex((token, index) => index >= start && token.type === 'heading_open');
	return tokens.slice(start, nextHeadingIndex === -1 ? undefined : nextHeadingIndex);
}

export type RenderMapOptions = { zoom?: number };

export function renderMap(outline: string, options: RenderMapOptions = {}): string {
	const zoom = options.zoom ?? 1;
	const allTokens = markdown.parse(outline, {});
	const tokens = storyMapTokens(allTokens);
	// The map title is the first heading of the whole document, even when it is above the "Story Map" heading
	const titleText = mapTitle(outline);
	// Paragraphs above the outline, shown as notes under the title
	const notes: string[] = [];
	let listSeen = false;
	// The items of the first top-level ordered list, used as the level titles from the top
	const levelTitles: string[] = [];
	let inOrderedList = false;
	let orderedListSeen = false;
	// Each activity column group: the top activity card, and the cells below it in sub-columns
	const columns: { activity: Card; subColumns: Cell[][]; lastIndentDepth: number }[] = [];
	let openLists = 0;
	// The number of rows each level needs, which is the largest rowInLevel + 1 over all columns
	// The bands of level 1 to 3 (0-based 0 to 2) are always drawn, so they start at one row each
	const rowsByLevel: number[] = [1, 1, 1];
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
		} else if (token.type === 'ordered_list_open' && openLists === 0 && !orderedListSeen) {
			inOrderedList = true;
			orderedListSeen = true;
		} else if (token.type === 'ordered_list_close' && inOrderedList) {
			inOrderedList = false;
		} else if (token.type === 'inline' && inOrderedList) {
			levelTitles.push(markdown.renderInline(token.content));
		} else if (token.type === 'paragraph_open' && !listSeen && !inOrderedList) {
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
	const title = `<h1 class="map-title">${titleText}</h1>`;
	const cells: string[] = [];
	// With level titles, the first column holds them and the cards start at the second column.
	// Without level titles there is no title column, and the cards start at the first column (ADR 004)
	let nextColumn = levelTitles.length > 0 ? 2 : 1;
	for (const column of columns) {
		const width = Math.max(column.subColumns.length, 1);
		cells.push(renderCell(column.activity, kindOf(0), `grid-column: ${nextColumn}; grid-row: 1;`));
		column.subColumns.forEach((columnCells, columnOffset) => {
			for (const cell of columnCells) {
				const row = (firstRowByLevel[cell.level] ?? 1) + cell.rowInLevel;
				cells.push(renderCell(cell.card, kindOf(cell.level), `grid-column: ${nextColumn + columnOffset}; grid-row: ${row};`));
			}
		});
		nextColumn += width;
	}
	// Each label sits on the first row of its band. Levels that do not exist get no label.
	// Without an ordered list there are no labels at all (ADR 004)
	levelTitles.forEach((label, level) => {
		const row = firstRowByLevel[level];
		if (row !== undefined) {
			cells.unshift(`<div class="row-label" style="grid-column: 1; grid-row: ${row};">${label}</div>`);
		}
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
:root { --level1-color: #e0efff; --level2-color: #e0ffee; --level3-color: #ffe0e9; --level4-color: #fff3e0; --card-shade: 0.93; --border-shade: 0.6; --alt-shade: 1.04; }
body { background: white; color: black; }
.map-zoom { width: fit-content; display: flow-root; padding: 16px; }
.map-grid { display: grid; gap: 0; justify-content: start; align-items: start; }
.card { border: 2px solid; padding: 4px 8px; margin: 8px; border-radius: 6px; min-width: 120px; box-sizing: border-box; }
.todo { box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2); }
${levelColorRules}
.done { border: none; box-shadow: none; }
.tag { background: white; border-radius: 8px; padding: 0 6px; margin-left: 4px; font-size: 0.8em; white-space: nowrap; }
.row-label { padding: 4px 8px; margin: 8px; color: #888; white-space: nowrap; }
.row-band { align-self: stretch; justify-self: stretch; border-bottom: 2px dashed; }
.row-band.level4.alt { background: hsl(from var(--level4-color) h s calc(l * var(--alt-shade))); }
.zoom-controls { position: fixed; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 8px; }
.zoom-controls button, .save-png { height: 32px; border: 2px solid #888; background: white; color: black; cursor: pointer; }
.zoom-controls button { width: 32px; border-radius: 50%; font-size: 16px; }
.save-png { position: fixed; right: 16px; bottom: 16px; padding: 0 12px; border-radius: 16px; font-size: 12px; font-weight: bold; }
</style>
<div class="map-zoom" style="zoom: ${zoom};">${title}${notes.join('')}<div class="map-grid">${cells.join('')}</div></div>
<div class="zoom-controls"><button class="zoom-out">－</button><span class="zoom-level">${formatZoomLevel(zoom)}</span><button class="zoom-in">＋</button></div><button class="save-png">PNG</button>`;
}
