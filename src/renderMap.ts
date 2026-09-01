import MarkdownIt = require('markdown-it');

const markdown = new MarkdownIt();

export function renderMap(outline: string): string {
	const tokens = markdown.parse(outline, {});
	let titleText = '';
	let titleFound = false;
	const columns: { activity: string; taskColumns: string[][]; lastDepth: number }[] = [];
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
					column.taskColumns.at(-1)?.push(token.content);
					column.lastDepth = depth;
				}
			}
		}
	}
	const title = `<h1 class="map-title">${titleText}</h1>`;
	const cells = columns
		.map(column => {
			const taskColumns = column.taskColumns
				.map(tasks => `<div class="task-column">${tasks.map(task => `<div class="task">${task}</div>`).join('')}</div>`)
				.join('');
			return `<div class="activity-column"><div class="activity">${column.activity}</div><div class="task-row">${taskColumns}</div></div>`;
		})
		.join('');
	return `<style>
body { background: white; color: black; }
.activity-row { display: flex; gap: 8px; }
.activity-column { display: flex; flex-direction: column; gap: 8px; }
.task-row { display: flex; gap: 8px; align-items: flex-start; }
.task-column { display: flex; flex-direction: column; gap: 8px; }
.activity { border: 1px solid currentColor; padding: 4px 8px; }
.task { border: 1px solid currentColor; padding: 4px 8px; }
</style>
${title}<div class="activity-row">${cells}</div>`;
}
