// Zoom steps (%). The real zoom value stays continuous. It moves to these steps only when + or - is pressed
// (Values between steps are allowed, so that the zoom can be typed in directly later)
const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200];

// Turn a zoom value (1 = 100%) into a whole-number percent
function toPercent(zoom: number): number {
	return Math.round(zoom * 100);
}

// Turn a zoom value (1 = 100%) into the whole-number percent string shown in the zoom UI
export function formatZoomLevel(zoom: number): string {
	return `${toPercent(zoom)}%`;
}

// + button: move from the current zoom value to the next step above
export function zoomIn(zoom: number): number {
	const percent = toPercent(zoom);
	const next = ZOOM_STEPS.find(step => step > percent);
	return (next ?? percent) / 100;
}

// - button: move from the current zoom value to the next step below
export function zoomOut(zoom: number): number {
	const percent = toPercent(zoom);
	const previous = [...ZOOM_STEPS].reverse().find(step => step < percent);
	return (previous ?? percent) / 100;
}
