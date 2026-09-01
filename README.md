# User Story Mapping

Japanese version: [README.ja.md](README.ja.md)

A VSCode extension that turns your Markdown outline into a user story map.

Write your outline as a plain Markdown bullet list, and preview it as a user story map. You do not need a separate diagram tool to place cards one by one. The outline you already know how to write is all you need.

**Under active development.** Features will be added step by step.

## How to Use

1. Open the Markdown file (.md) you want to view as a story map.
2. Click the map icon "Preview as User Story Map" at the top right of the editor.
3. The preview opens beside the editor.

### Outline Format

- Time flows from top to bottom: list the user's main activities in the order they happen.
- Importance is shown by nesting depth: put user tasks under each activity. More important tasks stay shallow; less important tasks go deeper.

```markdown
- Activity A
	- Task 1 (most important)
		- Task 2
- Activity B
	- Task 3 (most important)
```

## Recommended Setup

For comfortable outline editing, we recommend:

- Install the "[Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)" extension.
- Change your key bindings to outliner-style operations (move items up and down, change indent, and so on).

## Requirements

- VSCode for desktop (Windows/macOS/Linux).
- vscode.dev (the web version) is not supported.

## Install

For now, download the `.vsix` file from the GitHub releases page and install it by hand. Publishing to the VSCode Marketplace is planned once the extension is stable.

## Development

```powershell
npm install
```

- **Run**: Open this folder in VSCode and press F5 to start the Extension Development Host.
- **Watch build**: `npm run watch`
- **Test**: `npm test` (Mocha + `@vscode/test-cli`; a test instance of VSCode will start)
- **Packaging**: `npm run package` creates a production build.

### Documents

- `docs/storymap.md` — the story map of this product itself (a temporary format until the extension is complete)
- `docs/adr/` — Architecture Decision Records
- `docs/plans.md` — the working todo list for the current TDD session
- `test/test.md` — a test map for manual checks
