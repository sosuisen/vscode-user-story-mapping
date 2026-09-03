import * as assert from 'assert';
import { zoomIn, zoomOut } from '../zoomLevel';

// ズームの段階（＋/－で、きりのよい倍率へ動く）
suite('zoom steps', () => {
	// 100%で＋を押すと 125% になる
	test('zooms in from 100% to 125%', () => {
		assert.strictEqual(zoomIn(1), 1.25);
	});

	// 150%で＋を押すと 200% になる（175%という段階はない）
	test('zooms in from 150% to 200% because there is no 175% step', () => {
		assert.strictEqual(zoomIn(1.5), 2);
	});

	// 段階の間の倍率（110%）で＋を押すと、すぐ上の段階 125% になる
	// （注: 一般化した実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('zooms in from 110% to the next step 125%', () => {
		assert.strictEqual(zoomIn(1.1), 1.25);
	});

	// 最大の 200% で＋を押しても 200% のまま
	// （注: 一般化した実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('stays at 200% when zooming in from the largest step', () => {
		assert.strictEqual(zoomIn(2), 2);
	});

	// 100%で－を押すと 75% になる
	test('zooms out from 100% to 75%', () => {
		assert.strictEqual(zoomOut(1), 0.75);
	});

	// 段階の間の倍率（110%）で－を押すと、すぐ下の段階 100% になる
	// （注: ＋側と対の実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('zooms out from 110% to the previous step 100%', () => {
		assert.strictEqual(zoomOut(1.1), 1);
	});

	// 最小の 25% で－を押しても 25% のまま
	// （注: ＋側と対の実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('stays at 25% when zooming out from the smallest step', () => {
		assert.strictEqual(zoomOut(0.25), 0.25);
	});
});
