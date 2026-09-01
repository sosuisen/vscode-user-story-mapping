import * as assert from 'assert';
import { dataUrlToPngBuffer } from '../savePng';

// PNG保存
suite('dataUrlToPngBuffer', () => {
	// PNGのdataURLをデコードしてバイナリにする
	test('decodes a png data url into binary', () => {
		// 'iVBORw0KGgo=' はPNGシグネチャ8バイトのbase64
		const buffer = dataUrlToPngBuffer('data:image/png;base64,iVBORw0KGgo=');

		assert.deepStrictEqual([...buffer], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	});
});
