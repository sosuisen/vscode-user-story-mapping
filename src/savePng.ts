import { mapTitle } from './renderMap';

// Windows/macOS/Linuxのいずれでもファイル名に使えない文字（記号と制御文字）を _ に置換する
function sanitizeFileName(name: string): string {
	// eslint-disable-next-line no-control-regex
	const replaced = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/[. ]+$/, '');
	// Windowsの予約デバイス名はそのままではファイル名にできない
	return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(replaced) ? `${replaced}_` : replaced;
}

// マップの見出しを元に、PNGの既定ファイル名を組み立てる
export function defaultPngFileName(outline: string): string {
	const title = sanitizeFileName(mapTitle(outline));
	return `${title === '' ? 'storymap' : title}.png`;
}

// PNGのdataURL（data:image/png;base64,...）をデコードしてバイナリにする
export function dataUrlToPngBuffer(dataUrl: string): Uint8Array {
	const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
	return Buffer.from(base64, 'base64');
}
