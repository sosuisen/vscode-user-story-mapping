//! The functions of story-map-core that the VS Code extension calls through WebAssembly

use story_map_core::html;
use wasm_bindgen::prelude::wasm_bindgen;

/// The CSS rules that give the map its look
#[wasm_bindgen(js_name = mapCss)]
pub fn map_css() -> String {
    html::map_css()
}

/// The HTML of the map that the outline describes: the title, the notes, and the grid of cards
#[wasm_bindgen(js_name = renderMapContent)]
pub fn render_map_content(outline: &str) -> String {
    html::render_map_content(&story_map_core::parse(outline))
}

/// The raw text of the first heading of the outline (empty string if none)
#[wasm_bindgen(js_name = mapTitle)]
pub fn map_title(outline: &str) -> String {
    story_map_core::parse(outline).title
}
