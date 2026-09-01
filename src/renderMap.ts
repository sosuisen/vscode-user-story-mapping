import MarkdownIt = require('markdown-it');

const markdown = new MarkdownIt();

type Task = { text: string; depth: number };

export function renderMap(outline: string): string {
	const tokens = markdown.parse(outline, {});
	let titleText = '';
	let titleFound = false;
	const columns: { activity: string; taskColumns: Task[][]; lastDepth: number }[] = [];
	let listDepth = 0;
	let maxDepth = 0;
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token === undefined) {
			continue;
		}
		if (token.type === 'bullet_list_open') {
			listDepth++;
		} else if (token.type === 'bullet_list_close') {
			listDepth--;
		} else if (token.type === 'heading_open' && !titleFound) {
			titleText = tokens[i + 1]?.content ?? '';
			titleFound = true;
		} else if (token.type === 'inline' && listDepth > 0) {
			const depth = listDepth - 1;
			if (depth === 0) {
				columns.push({ activity: token.content, taskColumns: [], lastDepth: 0 });
			} else {
				const column = columns.at(-1);
				if (column !== undefined) {
					if (column.taskColumns.length === 0 || depth <= column.lastDepth) {
						column.taskColumns.push([]);
					}
					column.taskColumns.at(-1)?.push({ text: token.content, depth });
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
		cells.push(`<div class="activity" style="grid-column: ${nextColumn} / span ${width}; grid-row: 1;">${column.activity}</div>`);
		column.taskColumns.forEach((tasks, columnOffset) => {
			for (const task of tasks) {
				const classes = task.depth === 1 ? 'task skeleton' : 'task';
				cells.push(`<div class="${classes}" style="grid-column: ${nextColumn + columnOffset}; grid-row: ${task.depth + 1};">${task.text}</div>`);
			}
		});
		nextColumn += width;
	}
	const rowLabels = ['User Activity', 'Walking Skeleton', 'User Tasks'];
	rowLabels.forEach((label, index) => {
		cells.unshift(`<div class="row-label" style="grid-column: 1; grid-row: ${index + 1};">${label}</div>`);
	});
	// 帯は背面に敷くため、カードより先（DOM順で前）に置く
	if (maxDepth >= 2) {
		cells.unshift(`<div class="row-band tasks-band" style="grid-column: 1 / ${nextColumn}; grid-row: 3 / ${maxDepth + 2};"></div>`);
	}
	cells.unshift(`<div class="row-band skeleton-band" style="grid-column: 1 / ${nextColumn}; grid-row: 2;"></div>`);
	cells.unshift(`<div class="row-band activity-band" style="grid-column: 1 / ${nextColumn}; grid-row: 1;"></div>`);
	return `<style>
:root { --activity-color: #e0ffee; --skeleton-color: #ffe0e9; --tasks-color: #fff3e0; --card-shade: 0.93; --border-shade: 0.6; }
body { background: white; color: black; }
.map-grid { display: grid; gap: 0; justify-content: start; align-items: start; }
.activity, .task { border: 1px solid; padding: 4px 8px; margin: 8px; border-radius: 6px; min-width: 120px; box-sizing: border-box; box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2); }
.activity { background: hsl(from var(--activity-color) h s calc(l * var(--card-shade))); border-color: hsl(from var(--activity-color) h s calc(l * var(--border-shade))); }
.task { background: hsl(from var(--tasks-color) h s calc(l * var(--card-shade))); border-color: hsl(from var(--tasks-color) h s calc(l * var(--border-shade))); }
.task.skeleton { background: hsl(from var(--skeleton-color) h s calc(l * var(--card-shade))); border-color: hsl(from var(--skeleton-color) h s calc(l * var(--border-shade))); }
.row-label { padding: 4px 8px; margin: 8px; color: #888; white-space: nowrap; }
.row-band { align-self: stretch; justify-self: stretch; }
.activity-band { background: var(--activity-color); }
.skeleton-band { background: var(--skeleton-color); }
.tasks-band { background: var(--tasks-color); }
</style>
${title}<div class="map-grid">${cells.join('')}</div>`;
}
