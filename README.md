# User Story Mapping Extension for VSCode

Japanese version: [README.ja.md](README.ja.md)

A VSCode extension that turns your Markdown outline into a user story map.

Write your outline as a plain Markdown bullet list, and preview it as a user story map. You do not need a separate diagram tool to place cards one by one. The outline you already know how to write is all you need.

**Under active development.** Features will be added step by step.

## How to Use

1. Open the Markdown file (.md) you want to view as a story map.
2. Open the preview in either of these two ways:
   - Click the map icon "Preview as User Story Map" at the top right of the editor.
   - Right-click inside the editor and choose "Preview as User Story Map" from the menu.
3. The preview opens beside the editor.

### Outline Format

Two basic ideas:

- Time flows from left to right: list the user's main activities in the order they happen. On the map, they appear in one horizontal row.
- Importance is shown by nesting depth: put user tasks under each activity. More important tasks stay shallow; less important tasks go deeper. On the map, shallower tasks appear in higher rows.

```markdown
# Map Title

- Activity A
	- [ ] Task 1
		+ Task 1b
		- [x] Task 2
	- Task 3
- Activity B
	- 
		- Task 4
```

#### Syntax Reference

| You write | The map shows |
|---|---|
| The first heading (`#` to `######`) | The map title at the top. If there is no heading, the title area is empty |
| A top-level `- ` item | An activity. Activities appear in one row (User Activity, green band) |
| A `- ` item nested one level | A most important task. It appears in the second row (Walking Skeleton, red band) |
| A `- ` item nested two or more levels | A task. It appears in the third row or lower (User Tasks, yellow band); depth = row |
| Two or more `- ` items at the same depth | The second and later items move to the next inner column on the right (Task 3 in the example) |
| A `- ` line with no text | A blank level. No card is created; it only makes the level one step deeper (Task 4 starts at level 2) |
| A `+ ` item | The card is stacked in the same cell as its parent task, one level up (Task 1b sits under Task 1) |
| An item starting with `[ ] ` | An open task. The card shows ⬜ and has a drop shadow |
| An item starting with `[x] ` or `[X] ` | A completed task. The card shows ✅ and has no border and no shadow |
| An item with no checkbox | A card with a border only |

- You can indent with tabs or spaces. Indentation follows Markdown (CommonMark) rules; one tab equals four spaces.
- We recommend using one indent style within a single file.

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
