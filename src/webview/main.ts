import { toPng } from 'html-to-image';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const vscodeApi = acquireVsCodeApi();

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
