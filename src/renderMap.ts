// The map itself comes from the Rust library storymap through WebAssembly.
// The zoom wrapper and the controls belong to the preview, so they stay here
import {
	mapCss,
	renderMapContent,
} from '../crates/story-map-wasm/pkg/story_map_wasm';
import { formatZoomLevel } from './zoomLevel';

export { mapTitle } from '../crates/story-map-wasm/pkg/story_map_wasm';

export type ScrollPosition = { x: number; y: number };

export type RenderMapOptions = { zoom?: number; scroll?: ScrollPosition };

export function renderMap(
	outline: string,
	options: RenderMapOptions = {},
): string {
	const zoom = options.zoom ?? 1;
	const scroll = options.scroll ?? { x: 0, y: 0 };
	return `<style>
${mapCss()}
.zoom-controls { position: fixed; right: 16px; top: 16px; display: flex; align-items: center; gap: 8px; }
.zoom-controls button, .save-png { height: 32px; border: 2px solid #888; background: white; color: black; cursor: pointer; }
.zoom-controls button { width: 32px; border-radius: 50%; font-size: 16px; }
.save-png { position: fixed; right: 16px; bottom: 16px; padding: 0 12px; border-radius: 16px; font-size: 12px; font-weight: bold; }
</style>
<div class="map-zoom" style="zoom: ${zoom};" data-scroll-x="${scroll.x}" data-scroll-y="${scroll.y}">${renderMapContent(outline)}</div>
<div class="zoom-controls"><button class="zoom-out">－</button><span class="zoom-level">${formatZoomLevel(zoom)}</span><button class="zoom-in">＋</button></div><button class="save-png">PNG</button>`;
}
