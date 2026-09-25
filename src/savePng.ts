import { mapTitle } from './renderMap';

// Replace characters that are not allowed in file names on Windows, macOS, or Linux (symbols and control characters) with _
function sanitizeFileName(name: string): string {
	// eslint-disable-next-line no-control-regex
	const replaced = name
		.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
		.replace(/[. ]+$/, '');
	// Reserved device names on Windows cannot be used as file names as they are
	return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(replaced)
		? `${replaced}_`
		: replaced;
}

// Build the default PNG file name from the map heading
export function defaultPngFileName(outline: string): string {
	const title = sanitizeFileName(mapTitle(outline));
	return `${title === '' ? 'storymap' : title}.png`;
}

// Decode a PNG data URL (data:image/png;base64,...) into binary
export function dataUrlToPngBuffer(dataUrl: string): Uint8Array {
	const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
	return Buffer.from(base64, 'base64');
}
