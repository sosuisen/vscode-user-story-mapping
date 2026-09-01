export function renderMap(outline: string): string {
	const activities = outline
		.split('\n')
		.filter(line => line.startsWith('- '))
		.map(line => line.slice(2));
	const cells = activities.map(name => `<div class="activity">${name}</div>`).join('');
	return `<style>
.activity-row { display: flex; gap: 8px; }
.activity { border: 1px solid currentColor; padding: 4px 8px; }
</style>
<div class="activity-row">${cells}</div>`;
}
