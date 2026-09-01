export function renderMap(outline: string): string {
	const activities = outline
		.split('\n')
		.filter(line => line.startsWith('- '))
		.map(line => line.slice(2));
	const cells = activities.map(name => `<div class="activity">${name}</div>`).join('');
	return `<div class="activity-row">${cells}</div>`;
}
