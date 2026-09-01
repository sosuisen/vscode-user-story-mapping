# User Story Mapping

English version: [README.md](README.md)

VSCode上のアウトライン編集でユーザーストーリーマップを作成・編集できる拡張機能。

Markdownの箇条書きで書いたアウトラインを、ユーザーストーリーマップとしてプレビュー表示する。専用の作図ツールでカードを1枚ずつ並べる必要はなく、書き慣れたアウトラインだけでマップが完成する。

**現在開発中**。機能は順次追加していく。

## 使い方

1. ストーリーマップにしたいMarkdownファイル（.md）を開く。
2. エディタ右上の地図アイコン「Preview as User Story Map」を押す。
3. プレビューがエディタの横に表示される。

### アウトラインの書式

- 時系列は上から下: ユーザーの大きな活動（アクティビティ）を、行動の流れの順に箇条書きする。
- 重要度はネストの深さ: アクティビティの下にユーザータスクをぶら下げ、重要なタスクほど浅く、そうでないタスクほど深くネストする。

```markdown
- アクティビティA
	- タスク1（最重要）
		- タスク2
- アクティビティB
	- タスク3（最重要）
```

## 推奨環境

快適なアウトライン編集のため、次の併用を推奨する。

- 拡張機能「[Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)」をインストールする。
- キーバインディングをアウトライナー風に変更する（項目の入れ替え・インデント操作など）。

## 動作環境

- VSCodeデスクトップ版（Windows/macOS/Linux）。
- Web版（vscode.dev）は対象外。

## インストール

当面はGitHubのリリースページから `.vsix` ファイルをダウンロードし、手動でインストールする。安定したら、VSCode Marketplaceへの公開を目指す。

## 開発

```powershell
npm install
```

- **実行**: VSCodeでこのフォルダを開き、F5で拡張機能開発ホストを起動する。
- **watchビルド**: `npm run watch`
- **テスト**: `npm test`（Mocha + `@vscode/test-cli`。テスト用VSCodeが起動する）
- **パッケージング**: `npm run package` で本番ビルドを生成する。

### ドキュメント

- `docs/storymap.md` — 本プロダクト自身のストーリーマップ（拡張機能が完成するまでの暫定運用）
- `docs/adr/` — アーキテクチャ上の決定の記録（ADR）
- `docs/plans.md` — 現在TDDの対象としている作業用todo
- `test/test.md` — 動作確認用のテストマップ
