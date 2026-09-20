# User Story Mapping Extension for VSCode

Japanese version: [README.ja.md](README.ja.md)

[User Story Mapping](https://jpattonassociates.com/story-mapping/) is a method by Jeff Patton for seeing the whole product from the user's point of view and deciding what to build first. User stories are arranged along the user's activities from left to right, with the stories to build first at the top.

This VSCode extension lets you use that method with a plain Markdown outline. Write your outline as a bullet list, and preview it as a user story map. You do not need a separate diagram tool to place cards one by one. The outline you already know how to write is all you need.

## How to Use

1. Open the Markdown file (.md) you want to view as a story map.
2. Open the preview in either of these two ways:
   - Click the map icon "Preview as User Story Map" at the top right of the editor.
   - Right-click inside the editor and choose "Preview as User Story Map" from the menu.
3. The preview opens beside the editor.

### Outline Format

Two basic ideas:

- Time flows from left to right: list the user's main activities in the order they happen. On the map, they appear in one horizontal row. The same rule applies inside an activity: tasks at the same depth are placed left to right in the order you write them.
- Priority is shown by nesting depth: put user tasks under each activity. Tasks you need to start first stay shallow; tasks that can wait go deeper. On the map, shallower tasks appear in higher rows.

For example, write this outline:

```markdown
# Map Title

- Activity A
	- Task 1
		- Task 2
			- Task 3
	- Task 4
- Activity B
	- Task 5
```

It renders as this map:

![The outline on the left and the story map it renders on the right](images/outline-to-map-basic.png)

#### Syntax Reference

The table below refers to this example:

```markdown
# Map Title

This map covers the first release.

- Activity A
	- [ ] Task 1 +
		- Task 1b
	- [x] Task 2
		- Task 3
- Activity B
	- 
		- Task 4
```

| You write | The map shows |
|---|---|
| The first heading (`#` to `######`) | The map title at the top. If there is no heading, the title area is empty |
| A paragraph above the first list item | A note under the title. Use it for remarks about the map |
| A top-level `- ` item | An activity. Activities appear in one row (User Activity, green band) |
| A `- ` item nested one level | A task to start first. It appears in the second band (Walking Skeleton, red) |
| A `- ` item nested two or more levels | A task. It appears in the third band or lower (User Tasks, yellow). Each extra level of nesting is one band lower |
| Two or more `- ` items at the same depth | The second and later items move to the next inner column on the right (Task 2 in the example). Inner columns also follow time order, left to right |
| A `- ` line with no text | A blank level. No card is created; it only makes the level one step deeper (Task 4 starts at level 2) |
| An item ending with `+` | Its children stay in the same band as the item, on the row below it (Task 1b stays in the red band, under Task 1). The `+` is not shown on the card |
| An item starting with `[ ] ` | An open task. The card shows ⬜ and has a drop shadow |
| An item starting with `[x] ` or `[X] ` | A completed task. The card shows ✅ and has no border and no shadow |
| An item with no checkbox | A card with a border only |

Notes on indentation:

- You can indent with tabs or spaces. Indentation follows Markdown (CommonMark) rules; one tab equals four spaces.
- We recommend using one indent style within a single file.

The next two sections show, with figures, the two rules in the table that are easiest to misread: keeping children in the same band with `+`, and blank levels.

#### Keeping Children in the Same Band with `+`

Normally, each level of nesting moves a task one band lower. When an item ends with `+`, its children stay in the same band as the item. They are placed on the row below it inside that band, side by side from left to right. Use it when several tasks share the same priority but you want to write them under one parent.

```markdown
# Map Title

- Activity A
	- Task 1 +
		- Task 1b
		- Task 1c
	- Task 2
- Activity B
	- Task 3
```

It renders as this map:

![Task 1b and Task 1c placed in the red band under Task 1, side by side, while Task 2 starts a new column](images/outline-to-map-plus.png)

Task 1b and Task 1c are in the red Walking Skeleton band, on the row under Task 1. The band grows to two rows for every column, so Task 3 under Activity B stays on the first row of the band.

The same rule works for activities. When an activity ends with `+`, its children are sub-activities in the green band, each with its own column:

```markdown
- Activity A +
	- Activity A1
		- Task 1
	- Activity A2
		- Task 2
```

#### Blank Levels

A `- ` line with no text creates no card. It only makes the level one step deeper. Use it to push a task that can wait down to a lower row. In the example, Task 2 goes one row lower than Task 4 because of the blank level above it.

```markdown
# Map Title

- Activity A
	- Task 1
		- 
			- Task 2
- Activity B
	- Task 3
		- Task 4
```

It renders as this map:

![Task 2 placed one row below Task 4 because of the blank level above it](images/outline-to-map-blank.png)

## Recommended Setup

For comfortable outline editing, we recommend:

- Install the "[Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)" extension.
- Change your key bindings to outliner-style operations (move items up and down, change indent, and so on).

## Requirements

- VSCode for desktop (Windows/macOS/Linux).
- vscode.dev (the web version) is not supported.

## Install

Search for "User Story Mapping" in the Extensions view of VSCode and install it from the VSCode Marketplace.

You can also download the `.vsix` file from the GitHub releases page and install it by hand.

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
