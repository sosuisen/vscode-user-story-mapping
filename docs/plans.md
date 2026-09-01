# Plans

現在TDDの対象としているtodo（作業用・使い捨て）。

## Feature: ストーリーマップをPNGで保存する

- [x] フローティングの保存ボタンを表示する
- [x] Webview側: html-to-imageでマップをPNG化し、postMessageで拡張機能側へ送る
- [x] 拡張機能側: 保存ダイアログを出してファイルに書き込む
- [x] 保存ダイアログの既定ファイル名はマップの見出しに基づく
- [x] ファイル名のサニタイズ（Windows/macOS/Linux対応）

## その他

- [ ] HTMLエスケープ
- [ ] アイテム行内のMarkdown対応
- [ ] 拡張機能のアイコン作成
- [ ] .mdファイルを右クリックで「Preview as User Story Map」を選択可能にする
