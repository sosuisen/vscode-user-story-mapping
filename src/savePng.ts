// PNGのdataURL（data:image/png;base64,...）をデコードしてバイナリにする
export function dataUrlToPngBuffer(dataUrl: string): Uint8Array {
	const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
	return Buffer.from(base64, 'base64');
}
