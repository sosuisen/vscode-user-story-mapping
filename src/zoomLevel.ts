// Zoom steps (%): from MIN to MAX in STEP increments (20, 30, ..., 200).
// The real zoom value stays continuous. It moves to these steps only when + or - is pressed
// (Values between steps are allowed, so that the zoom can be typed in directly later)
const MIN_ZOOM_PERCENT = 20;
const MAX_ZOOM_PERCENT = 200;
const ZOOM_STEP_PERCENT = 10;
const ZOOM_STEPS = Array.from(
	{ length: (MAX_ZOOM_PERCENT - MIN_ZOOM_PERCENT) / ZOOM_STEP_PERCENT + 1 },
	(_, i) => MIN_ZOOM_PERCENT + i * ZOOM_STEP_PERCENT,
);

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
