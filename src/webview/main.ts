import { toPng } from 'html-to-image';
import { formatZoomLevel, zoomIn, zoomOut } from '../zoomLevel';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const vscodeApi = acquireVsCodeApi();

// Zoom: start from the rendered zoom value (style.zoom) and notify the extension on every change
const mapZoom = document.querySelector('.map-zoom');
const zoomLevel = document.querySelector('.zoom-level');
if (mapZoom instanceof HTMLElement) {
	let zoom = parseFloat(mapZoom.style.zoom) || 1;
	const setZoom = (newZoom: number) => {
		zoom = newZoom;
		mapZoom.style.zoom = String(zoom);
		if (zoomLevel !== null) {
			zoomLevel.textContent = formatZoomLevel(zoom);
		}
		vscodeApi.postMessage({ type: 'zoom', zoom });
	};
	document
		.querySelector('.zoom-in')
		?.addEventListener('click', () => setZoom(zoomIn(zoom)));
	document
		.querySelector('.zoom-out')
		?.addEventListener('click', () => setZoom(zoomOut(zoom)));
}

// Scroll: go back to the position carried on the map element, then report every scroll to the extension
// (the extension puts the position into the next render, so that it survives a redraw)
if (mapZoom instanceof HTMLElement) {
	const restoreScroll = () => {
		window.scrollTo(
			parseFloat(mapZoom.dataset.scrollX ?? '0') || 0,
			parseFloat(mapZoom.dataset.scrollY ?? '0') || 0,
		);
	};
	// Restore right away so that the map does not flash at the top.
	// Restore again on load, because the VS Code webview host resets the scroll position
	// before load when the vertical position is 0 (that reset also drops the horizontal position)
	restoreScroll();
	window.addEventListener('load', restoreScroll);
}
window.addEventListener('scroll', () => {
	vscodeApi.postMessage({
		type: 'scroll',
		x: window.scrollX,
		y: window.scrollY,
	});
});

document.querySelector('.save-png')?.addEventListener('click', () => {
	const map = document.querySelector('.map-zoom');
	if (!(map instanceof HTMLElement)) {
		return;
	}
	toPng(map, {
		backgroundColor: 'white',
		width: map.scrollWidth,
		height: map.scrollHeight,
		pixelRatio: 2,
	}).then(dataUrl => {
		vscodeApi.postMessage({ type: 'savePng', dataUrl });
	});
});
