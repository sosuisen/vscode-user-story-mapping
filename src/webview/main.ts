import { toPng } from 'html-to-image';
import { formatZoomLevel } from '../zoomLevel';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const vscodeApi = acquireVsCodeApi();

// ズーム: 描画時のズーム値（style.zoom）から始め、変更のたびに拡張機能へ通知する
const mapZoom = document.querySelector('.map-zoom');
const zoomLevel = document.querySelector('.zoom-level');
if (mapZoom instanceof HTMLElement) {
	let zoom = parseFloat(mapZoom.style.zoom) || 1;
	const changeZoom = (factor: number) => {
		zoom *= factor;
		mapZoom.style.zoom = String(zoom);
		if (zoomLevel !== null) {
			zoomLevel.textContent = formatZoomLevel(zoom);
		}
		vscodeApi.postMessage({ type: 'zoom', zoom });
	};
	document.querySelector('.zoom-in')?.addEventListener('click', () => changeZoom(1.2));
	document.querySelector('.zoom-out')?.addEventListener('click', () => changeZoom(1 / 1.2));
}

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
