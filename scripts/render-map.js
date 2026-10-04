// Print the map HTML that renderMap produces for an outline file.
// Used by scripts/make-figure.py. Run `npm run compile-tests` first so that out/renderMap.js exists.
//
// Usage: node scripts/render-map.js <outline.md>
const fs = require('fs');
const path = require('path');

const { renderMap } = require(path.join(__dirname, '..', 'out', 'renderMap.js'));
const html = renderMap(fs.readFileSync(process.argv[2], 'utf8'));
const body = html.slice(html.indexOf('<div class="map-zoom"'));
process.stdout.write(body.replace(/></g, '>\n<') + '\n');
