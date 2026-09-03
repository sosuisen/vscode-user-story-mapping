// ズームの段階（%）。正本のズーム値は連続値のまま持ち、＋/－を押したときだけこの段階へ動く
// （後で倍率を直接入力できるようにするため、段階以外の値も取りうる）
const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200];

// ズーム値（1 = 等倍）を整数のパーセントにする
function toPercent(zoom: number): number {
	return Math.round(zoom * 100);
}

// ズーム値（1 = 等倍）を、ズームUIに表示する整数パーセントの文字列にする
export function formatZoomLevel(zoom: number): string {
	return `${toPercent(zoom)}%`;
}

// ＋ボタン: 現在のズーム値から、すぐ上の段階のズーム値へ
export function zoomIn(zoom: number): number {
	const percent = toPercent(zoom);
	const next = ZOOM_STEPS.find(step => step > percent);
	return (next ?? percent) / 100;
}

// －ボタン: 現在のズーム値から、すぐ下の段階のズーム値へ
export function zoomOut(zoom: number): number {
	const percent = toPercent(zoom);
	const previous = [...ZOOM_STEPS].reverse().find(step => step < percent);
	return (previous ?? percent) / 100;
}
