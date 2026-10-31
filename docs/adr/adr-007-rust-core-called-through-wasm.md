# ADR 007: コアをRustライブラリにしてWebAssemblyで呼ぶ

## Status

Accepted

## Context

この拡張機能のロジックは、`src/renderMap.ts`の1ファイルに集まっている。アウトラインのMarkdownを読み、カードを格子に配置し、HTML文字列を返す純関数である。VS CodeのAPIを使うのは、Webviewの生成、保存ダイアログ、ズーム、PNG化の部分だけである。そのため、コアとVS Code固有の部分の境界は、はっきり引ける。

このコアを、VS Code拡張機能の外でも使えるようにしたい。中心に置く言語はRustである。Rustのアプリからは、ライブラリとして直接使えるようにする。ほかの言語からは、Rustのライブラリを包んで使えるようにする。使う側は、HTMLではなく自分の方法でマップを描くことがある。そのため、コアはHTMLだけでなく、配置済みのデータモデルも返す必要がある。

一方で、拡張機能はこれまでどおり、Windows・macOS・Linuxのすべてで動き続けなければならない。OSごとにビルドを分けて配布する手間は増やしたくない。

これまでのMarkdownの読み取りは、markdown-itのトークン列に頼っていた。`renderMap.test.ts`の約1900行は、このHTML出力のゴールデンテストになっている。移植後も、同じ入力から同じHTMLを出す必要がある。

## Decision

コアをRustのライブラリにする。拡張機能からは、WebAssembly経由で呼ぶ。

Cargoのワークスペースに、2つのクレートを置く。

- `story-map-core`: 純粋なRustライブラリである。wasm-bindgenには依存しない。Rustのアプリは、このクレートを直接使う。
- `story-map-wasm`: `story-map-core`を`#[wasm_bindgen]`で包むだけの、薄いクレートである。拡張機能はこれを使う。ほかの言語向けのバインディングも、同じ形で別のクレートとして足す。

コアのAPIは2段に分ける。`parse`は、アウトラインを`StoryMap`に変換する。`StoryMap`は配置済みのデータだけを持ち、テキストは生のMarkdownのまま残す。HTMLへの描画は`html` featureに分け、既定で有効にする。HTMLが要らないアプリは、このfeatureを外せる。ズームの枠と操作ボタンは、プレビュー固有のものなので、拡張機能のTypeScript側に残す。

Markdownの読み取りには、comrakを使う。comrakの構文木を平らにして、markdown-itと同じ形のトークン列を作る。配置のルールは、そのトークン列の上にTypeScript版から素直に移植する。インラインのMarkdownも、markdown-itの既定の出力と同じHTMLになるように、自前で描画する。生のHTMLはエスケープし、`<br>`と`<img>`には閉じのスラッシュを付けない。

wasm-packの`--target nodejs`で生成したパッケージを、拡張ホストで読み込む。esbuildは、`.wasm`ファイルを`dist/`にコピーする。WebAssemblyはOSに依存しないので、1つの`.vsix`がすべてのOSで動く。

## Alternatives

### Alternative 1: TypeScriptのまま残す

変更が要らず、ビルドに必要なツールも増えない。しかし、Rustのアプリからはコアを使えない。ほかの言語から使うにも、Node.jsの実行環境が要る。コアを広く使えるようにする目的を満たさないため、採用しなかった。

### Alternative 2: napi-rsによるネイティブバイナリ

Node.jsのネイティブアドオンとして、Rustを直接呼べる。WebAssemblyより速い。しかし、OSとCPUの組み合わせごとにビルドと配布が要る。この規模のマップでは速さの差は体感できないので、手間に見合わない。

### Alternative 3: LSPサーバー

エディタに依存しない形で、機能を提供できる。しかし、この拡張機能は、診断・補完・シンボルといったLSPの機能を何も使わない。欲しいのはHTML1枚であり、LSPは遠回りになる。

### Alternative 4: pulldown-cmark

軽く、広く使われているMarkdownパーサーである。しかし、詰めたリスト（tight list）の項目では、段落のイベントを出さない。そのため、項目の生テキストを取り出すのに手間がかかり、markdown-itのトークン列を再現しにくい。comrakは、どのリストでも段落のノードを作り、元の位置（sourcepos）も持つ。

### Alternative 5: markdown-itのRust移植（`markdown-it`クレート）

markdown-itと同じ出力を得やすい。しかし、2024年7月を最後に更新されていない。保守されていない依存に、コアを預けるのは避けた。

## Confidence Level

確信度は高い。移植後のコアは、既存のゴールデンテスト97件をすべて通った。旧実装とも出力を比べた。テストの入力、リポジトリ内のMarkdown、ランダムに作った33,000件のアウトラインで、HTMLは1文字も違わなかった。VS Code上のテスト133件も通った。`.vsix`の中身と、本番バンドルからwasmを読み込めることも確かめた。

ただし、markdown-itと完全には同じでない部分が残る。国際化ドメイン名をpunycodeに変換しない。`javascript:`などの危険なリンクを文字として出す形は、近似である。どちらも、アウトラインにはまず現れない入力である。

次の状況になったら見直す。

- comrakの保守が止まったとき、または出力の形が大きく変わったとき。
- wasmの大きさ（約1.2MB）や読み込みの時間が、拡張機能の起動の妨げになったとき。
- ほかの言語のバインディングで、WebAssemblyでは足りない場面が出たとき。たとえば、C ABIが必要になったときである。

## Consequences

良い結果。Rustのアプリは、`story-map-core`を依存に書くだけで、コアを使える。`StoryMap`はデータだけを持つので、使う側はHTML以外の方法でもマップを描ける。WebAssemblyはOSに依存しないので、`.vsix`は1つのままで済む。Node.jsへの依存がコアから消えたので、Web版のVS Code（vscode.dev）に対応する道も開けた。依存から`markdown-it`が消えた。

悪い結果。ビルドに必要なツールが増えた。Node.jsのほかに、Rust、`wasm32-unknown-unknown`ターゲット、wasm-packが要る。開発者もCIも、これらを揃える必要がある。`.vsix`は、wasmの分（約1.2MB）だけ大きくなった。インラインのMarkdownの描画を自前で持つので、markdown-itとの差が見つかったら、自分で直す必要がある。

中立的な結果。テストは2か所に分かれた。HTMLの出力は、これまでどおりTypeScriptのゴールデンテストで確かめる。データモデルの振る舞いは、Rustのテストで確かめる。Rustのテストは`cargo test`で、拡張機能のテストは`npm test`で実行する。ズームの枠、操作ボタン、PNG化は、拡張機能のTypeScript側に残る。
