import MarkdownIt = require('markdown-it');

const markdown = new MarkdownIt();

type Task = { text: string; depth: number };

export function renderMap(outline: string): string {
	const tokens = markdown.parse(outline, {});
	let titleText = '';
	let titleFound = false;
	const columns: { activity: string; taskColumns: Task[][]; lastDepth: number }[] = [];
	let listDepth = 0;
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
				}
			}
		}
	}
	const title = `<h1 class="map-title">${titleText}</h1>`;
	const cells: string[] = [];
	let nextColumn = 1;
	for (const column of columns) {
		const width = Math.max(column.taskColumns.length, 1);
		cells.push(`<div class="activity" style="grid-column: ${nextColumn} / span ${width}; grid-row: 1;">${column.activity}</div>`);
		column.taskColumns.forEach((tasks, columnOffset) => {
			for (const task of tasks) {
				cells.push(`<div class="task" style="grid-column: ${nextColumn + columnOffset}; grid-row: ${task.depth + 1};">${task.text}</div>`);
			}
		});
		nextColumn += width;
	}
	return `<style>
body { background: white; color: black; }
.map-grid { display: grid; gap: 8px; justify-content: start; align-items: start; }
.activity { border: 1px solid currentColor; padding: 4px 8px; }
.task { border: 1px solid currentColor; padding: 4px 8px; }
</style>
${title}<div class="map-grid">${cells.join('')}</div>`;
}
