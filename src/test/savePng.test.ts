import * as assert from 'assert';
import { dataUrlToPngBuffer, defaultPngFileName } from '../savePng';

// PNG保存
suite('dataUrlToPngBuffer', () => {
	// PNGのdataURLをデコードしてバイナリにする
	test('decodes a png data url into binary', () => {
		// 'iVBORw0KGgo=' はPNGシグネチャ8バイトのbase64
		const buffer = dataUrlToPngBuffer('data:image/png;base64,iVBORw0KGgo=');

		assert.deepStrictEqual([...buffer], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	});
});

// PNGの既定ファイル名
suite('defaultPngFileName', () => {
	// 最初の見出しが既定ファイル名になる
	test('builds the default file name from the first heading', () => {
		assert.strictEqual(defaultPngFileName('# マイマップ\n- 活動A'), 'マイマップ.png');
	});

	// 見出しがないときは storymap.png になる
	test('falls back to storymap when there is no heading', () => {
		assert.strictEqual(defaultPngFileName('- 活動A'), 'storymap.png');
	});

	// ファイル名に使えない文字（Windows/macOS/Linux）は _ に置換される
	test('replaces characters not allowed in file names', () => {
		assert.strictEqual(defaultPngFileName('# a\\b/c:d*e?f"g<h>i|j\n- 活動A'), 'a_b_c_d_e_f_g_h_i_j.png');
	});

	// Windowsで不正になる末尾のドットは取り除かれる
	test('trims trailing dots from the file name', () => {
		assert.strictEqual(defaultPngFileName('# マップ..\n- 活動A'), 'マップ.png');
	});

	// Windowsの予約名（CONなど）は末尾に _ を付けて回避する
	test('escapes Windows reserved device names', () => {
		assert.strictEqual(defaultPngFileName('# CON\n- 活動A'), 'CON_.png');
	});
});
