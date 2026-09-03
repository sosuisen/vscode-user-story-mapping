// ズーム値（1 = 等倍）を、ズームUIに表示する整数パーセントの文字列にする
export function formatZoomLevel(zoom: number): string {
	return `${Math.round(zoom * 100)}%`;
}
