const taskLinePattern = /^[ \t]+- /;
const headingLinePattern = /^#+ /;

export function renderMap(outline: string): string {
	const headingLine = outline.split('\n').find(line => headingLinePattern.test(line));
	const titleText = headingLine === undefined ? '' : headingLine.replace(headingLinePattern, '');
	const title = `<h1 class="map-title">${titleText}</h1>`;
	const columns: { activity: string; taskColumns: string[][]; lastIndent: number }[] = [];
	for (const line of outline.split('\n')) {
		if (line.startsWith('- ')) {
			columns.push({ activity: line.slice(2), taskColumns: [], lastIndent: 0 });
		} else if (taskLinePattern.test(line)) {
			const column = columns.at(-1);
			if (column !== undefined) {
				const indent = (line.match(/^[ \t]+/) ?? [''])[0].length;
				if (column.taskColumns.length === 0 || indent <= column.lastIndent) {
					column.taskColumns.push([]);
				}
				column.taskColumns.at(-1)?.push(line.replace(taskLinePattern, ''));
				column.lastIndent = indent;
			}
		}
	}
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
