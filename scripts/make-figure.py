"""READMEの図（アウトラインとそのプレビュー）を作る。

images/outline-to-map-*.md がアウトラインの正本である。
このスクリプトは、各 .md から同じ名前の .svg と .png を images/ に作る。
左側に .md の中身を、右側にそのプレビューを描く。
右側は本物の renderMap の出力から描くので、拡張機能の表示とずれない。

使い方（プロジェクトのルートで実行する）:

    npm run compile-tests
    python scripts/make-figure.py                 # images/outline-to-map-*.md をすべて
    python scripts/make-figure.py images/outline-to-map-v.md   # 1つだけ

前提:
- Node.js と、`npm run compile-tests` で作られる out/renderMap.js。
- PNG を作るには Google Chrome か Microsoft Edge が必要。
  見つからないときは SVG だけを作り、その旨を表示する。
  別の場所にあるときは環境変数 CHROME にブラウザの実行ファイルを指定する。

例を変えたいときは .md を直して、このスクリプトを実行し直すだけでよい。
"""
import glob
import html
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RENDER_JS = os.path.join(ROOT, 'scripts', 'render-map.js')
HUES = {1: 211, 2: 147, 3: 343, 4: 37}  # The base colors of the levels, as in renderMap.ts
ROW_H = 48
LINE_H = 24

BROWSER_CANDIDATES = [
    os.environ.get('CHROME', ''),
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'google-chrome',
    'chromium',
]


def find_browser():
    for c in BROWSER_CANDIDATES:
        if c and (os.path.isfile(c) or shutil.which(c)):
            return c
    return None


def text_width(t, size=14):
    """A rough width of text in the Segoe UI / Consolas fonts used in the figure."""
    w = 0
    for ch in t:
        if ch in '⬜✅':
            w += 20
        elif ord(ch) < 0x3000:
            w += 6 if size <= 12 else 7
        else:
            w += size
    return w


def esc(t):
    return html.escape(t, quote=False)


def parse_map(rendered):
    """Pick the title, notes, bands and cards out of the renderMap HTML."""
    unescape = html.unescape
    title = unescape(re.search(r'<h1 class="map-title">(.*?)</h1>', rendered, re.S).group(1))
    leading, trailing = [], []
    for m in re.finditer(r'<p class="leading-note">(.*?)</p>', rendered, re.S):
        leading += [unescape(x.strip()) for x in re.split(r'<br>\s*', m.group(1))]
    for m in re.finditer(r'<p class="trailing-note">(.*?)</p>', rendered, re.S):
        trailing += [unescape(x.strip()) for x in re.split(r'<br>\s*', m.group(1))]
    bands = []
    for m in re.finditer(r'<div class="row-band level(\d)( alt)?" style="grid-column: 1 / (\d+); grid-row: ([\d /]+);">', rendered):
        rows = m.group(4).split(' / ')
        first = int(rows[0])
        last = int(rows[1]) - 1 if len(rows) == 2 else first
        bands.append(dict(level=int(m.group(1)), alt=bool(m.group(2)), first=first, last=last))
    ncols = int(re.search(r'grid-column: 1 / (\d+)', rendered).group(1)) - 1
    cards = []
    for m in re.finditer(r'<div class="card level(\d)((?: done| todo)*)" style="grid-column: (\d+); grid-row: (\d+);">(.*?)</div>', rendered, re.S):
        inner = m.group(5)
        tags = [unescape(t) for t in re.findall(r'<span class="tag">(.*?)</span>', inner)]
        text = unescape(re.sub(r'<span class="tag">.*?</span>', '', inner).strip())
        cards.append(dict(level=int(m.group(1)), done='done' in m.group(2), todo='todo' in m.group(2),
                          col=int(m.group(3)), row=int(m.group(4)), text=text, tags=tags))
    return title, leading, trailing, bands, ncols, cards


def make_svg(md_path, svg_path):
    code = open(md_path, encoding='utf-8').read().rstrip('\n').split('\n')
    rendered = subprocess.run(['node', RENDER_JS, md_path], capture_output=True, text=True,
                              encoding='utf-8', check=True).stdout
    title, leading, trailing, bands, ncols, cards = parse_map(rendered)
    nrows = max(b['last'] for b in bands)

    # Card and column widths follow the text, with the same minimum width as the CSS (120px + 8px margins)
    for c in cards:
        w = 20 + text_width(c['text'])
        c['tagw'] = [text_width(t, 11) + 12 for t in c['tags']]
        w += sum(4 + tw for tw in c['tagw'])
        c['w'] = max(120, int(w + 4) // 4 * 4)
    col_w = [max([136] + [c['w'] + 16 for c in cards if c['col'] == i + 1]) for i in range(ncols)]

    # Left panel: the outline as code, one line every 24px. Its width follows the longest line
    code_top = 80
    left_w = int(max(text_width(l) * 1.1 for l in code) + 40) // 8 * 8
    left_h = len(code) * LINE_H + 32
    left_bottom = 48 + left_h
    left_right = 40 + left_w
    arrow_x = left_right + 14
    panel_x = left_right + 92

    # Right panel: title, leading notes, the grid of bands and cards, trailing notes
    gx = panel_x + 16
    band_w = sum(col_w)
    grid_right = gx + band_w
    panel_w = band_w + 32
    note_ys = [112 + 22 * i for i in range(len(leading))]
    grid_top = (note_ys[-1] + 14) if note_ys else 100
    row_y = [grid_top + ROW_H * i for i in range(nrows)]
    grid_bottom = grid_top + ROW_H * nrows
    trailing_ys = [grid_bottom + 24 + 22 * i for i in range(len(trailing))]
    right_bottom = (trailing_ys[-1] + 16) if trailing_ys else (grid_bottom + 16)
    right_h = right_bottom - 48
    col_x = [gx + sum(col_w[:i]) for i in range(ncols)]
    svg_w = panel_x + panel_w + 16
    svg_h = max(left_bottom, right_bottom) + 16

    mono = "font-family=\"Consolas, 'Courier New', monospace\" fill=\"#1f2328\" xml:space=\"preserve\""
    out = []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{svg_w}" height="{svg_h}" viewBox="0 0 {svg_w} {svg_h}" font-family="\'Segoe UI\', Helvetica, Arial, sans-serif" font-size="14">')
    out.append(f'<rect width="{svg_w}" height="{svg_h}" fill="white"/>')
    # Time runs down the outline
    out.append('<text x="24" y="20" text-anchor="middle" font-size="14" fill="#57606a">Time</text>')
    out.append(f'<line x1="24" y1="34" x2="24" y2="{left_bottom - 10}" stroke="#57606a" stroke-width="2"/>')
    out.append(f'<polygon points="18,{left_bottom - 10} 24,{left_bottom} 30,{left_bottom - 10}" fill="#57606a"/>')
    out.append(f'<text x="{40 + left_w // 2}" y="40" text-anchor="middle" font-size="16" fill="#57606a">outline.md</text>')
    out.append(f'<rect x="40" y="48" width="{left_w}" height="{left_h}" rx="6" fill="#f6f8fa" stroke="#d0d7de"/>')
    for i, line in enumerate(code):
        out.append(f'<text x="56" y="{code_top + LINE_H * i}" {mono}>{esc(line)}</text>')
    # Block arrow between the panels
    cy = (48 + left_bottom) // 2
    ax = arrow_x
    out.append(f'<polygon points="{ax},{cy - 6} {ax + 42},{cy - 6} {ax + 42},{cy - 14} {ax + 62},{cy} {ax + 42},{cy + 14} {ax + 42},{cy + 6} {ax},{cy + 6}" fill="#d0d7de" stroke="#57606a" stroke-width="2" stroke-linejoin="round"/>')
    # Time runs right across the map
    mid = (gx + grid_right) // 2
    out.append(f'<text x="{mid}" y="20" text-anchor="middle" font-size="14" fill="#57606a">Time</text>')
    out.append(f'<line x1="{gx}" y1="34" x2="{grid_right - 10}" y2="34" stroke="#57606a" stroke-width="2"/>')
    out.append(f'<polygon points="{grid_right - 10},28 {grid_right},34 {grid_right - 10},40" fill="#57606a"/>')
    out.append(f'<rect x="{panel_x}" y="48" width="{panel_w}" height="{right_h}" rx="6" fill="white" stroke="#d0d7de"/>')
    out.append(f'<text x="{gx}" y="86" font-size="22" font-weight="bold" fill="#1f2328">{esc(title)}</text>')
    for y, t in zip(note_ys, leading):
        out.append(f'<text x="{gx}" y="{y}" fill="#1f2328">{esc(t)}</text>')
    # Bands: the base color at 94% lightness, the alternate shade at 98%, a dashed line at the bottom (87%)
    for b in bands:
        hue = HUES[b['level']]
        light = 98 if b['alt'] else 94
        y = row_y[b['first'] - 1]
        h = ROW_H * (b['last'] - b['first'] + 1)
        out.append(f'<rect x="{gx}" y="{y}" width="{band_w}" height="{h}" fill="hsl({hue}, 100%, {light}%)"/>')
        out.append(f'<line x1="{gx}" y1="{y + h - 1}" x2="{grid_right}" y2="{y + h - 1}" stroke="hsl({hue}, 100%, 87%)" stroke-width="2" stroke-dasharray="6 4"/>')
    # Cards: fill at 87%, border at 56%. A todo card has a shadow, a done card has no border
    for c in cards:
        hue = HUES[c['level']]
        x, y, w = col_x[c['col'] - 1] + 8, row_y[c['row'] - 1] + 8, c['w']
        if c['todo']:
            out.append(f'<rect x="{x + 2}" y="{y + 2}" width="{w}" height="32" rx="6" fill="rgba(0, 0, 0, 0.2)"/>')
        stroke = '' if c['done'] else f' stroke="hsl({hue}, 100%, 56%)" stroke-width="2"'
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="32" rx="6" fill="hsl({hue}, 100%, 87%)"{stroke}/>')
        out.append(f'<text x="{x + 10}" y="{y + 21}" fill="#1f2328">{esc(c["text"])}</text>')
        tx = x + 10 + text_width(c['text']) + 4
        for t, tw in zip(c['tags'], c['tagw']):
            out.append(f'<rect x="{tx:g}" y="{y + 8}" width="{tw:g}" height="16" rx="8" fill="white"/>')
            out.append(f'<text x="{tx + tw / 2:g}" y="{y + 20}" text-anchor="middle" font-size="11" fill="#1f2328">{esc(t)}</text>')
            tx += tw + 4
    for y, t in zip(trailing_ys, trailing):
        out.append(f'<text x="{gx}" y="{y}" fill="#1f2328">{esc(t)}</text>')
    out.append('</svg>')
    open(svg_path, 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
    return svg_w, svg_h


def make_png(browser, svg_path, png_path, w, h):
    """Screenshot the SVG at 2x with a headless browser."""
    url = 'file:///' + os.path.abspath(svg_path).replace(os.sep, '/')
    subprocess.run([browser, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                    '--force-device-scale-factor=2', f'--window-size={w},{h}',
                    f'--screenshot={os.path.abspath(png_path)}', url],
                   capture_output=True, check=True)


def main(args):
    if not os.path.isfile(os.path.join(ROOT, 'out', 'renderMap.js')):
        sys.exit('out/renderMap.js がありません。先に `npm run compile-tests` を実行してください。')
    paths = args or sorted(glob.glob(os.path.join(ROOT, 'images', 'outline-to-map-*.md')))
    browser = find_browser()
    if browser is None:
        print('ブラウザが見つからないので、SVGだけを作ります。PNGが必要なら環境変数 CHROME を設定してください。')
    for md_path in paths:
        base = os.path.splitext(md_path)[0]
        w, h = make_svg(md_path, base + '.svg')
        line = f'{os.path.relpath(base, ROOT)}.svg ({w}x{h})'
        if browser is not None:
            make_png(browser, base + '.svg', base + '.png', w, h)
            line += f' -> .png ({2 * w}x{2 * h})'
        print(line)


if __name__ == '__main__':
    main(sys.argv[1:])
