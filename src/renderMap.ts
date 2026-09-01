const taskLinePattern = /^[ \t]+- /;

export function renderMap(outline: string): string {
	const columns: { activity: string; tasks: string[] }[] = [];
	for (const line of outline.split('\n')) {
		if (line.startsWith('- ')) {
			columns.push({ activity: line.slice(2), tasks: [] });
		} else if (taskLinePattern.test(line)) {
			columns.at(-1)?.tasks.push(line.replace(taskLinePattern, ''));
		}
	}
	const cells = columns
		.map(column => {
			const tasks = column.tasks.map(task => `<div class="task">${task}</div>`).join('');
			return `<div class="activity-column"><div class="activity">${column.activity}</div>${tasks}</div>`;
		})
		.join('');
	return `<style>
body { background: white; color: black; }
.activity-row { display: flex; gap: 8px; }
.activity-column { display: flex; flex-direction: column; gap: 8px; }
.activity { border: 1px solid currentColor; padding: 4px 8px; }
.task { border: 1px solid currentColor; padding: 4px 8px; }
</style>
<div class="activity-row">${cells}</div>`;
}
