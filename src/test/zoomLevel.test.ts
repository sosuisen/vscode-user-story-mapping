import * as assert from 'assert';
import { zoomIn, zoomOut } from '../zoomLevel';

// ズームの段階（＋/－で、きりのよい倍率へ動く）
suite('zoom steps', () => {
	// 100%で＋を押すと 110% になる
	test('zooms in from 100% to 110%', () => {
		assert.strictEqual(zoomIn(1), 1.1);
	});

	// 190%で＋を押すと 200% になる
	test('zooms in from 190% to 200%', () => {
		assert.strictEqual(zoomIn(1.9), 2);
	});

	// 段階の間の倍率（115%）で＋を押すと、すぐ上の段階 120% になる
	// （注: 一般化した実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('zooms in from 115% to the next step 120%', () => {
		assert.strictEqual(zoomIn(1.15), 1.2);
	});

	// 最大の 200% で＋を押しても 200% のまま
	// （注: 一般化した実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('stays at 200% when zooming in from the largest step', () => {
		assert.strictEqual(zoomIn(2), 2);
	});

	// 100%で－を押すと 90% になる
	test('zooms out from 100% to 90%', () => {
		assert.strictEqual(zoomOut(1), 0.9);
	});

	// 段階の間の倍率（115%）で－を押すと、すぐ下の段階 110% になる
	// （注: ＋側と対の実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('zooms out from 115% to the previous step 110%', () => {
		assert.strictEqual(zoomOut(1.15), 1.1);
	});

	// 30%で－を押すと 20% になる
	// （注: 一般化した実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('zooms out from 30% to 20%', () => {
		assert.strictEqual(zoomOut(0.3), 0.2);
	});

	// 最小の 20% で－を押しても 20% のまま
	// （注: ＋側と対の実装で既に通るため、仕様の記録としてRedを経ずに置いたもの）
	test('stays at 20% when zooming out from the smallest step', () => {
		assert.strictEqual(zoomOut(0.2), 0.2);
	});
});
