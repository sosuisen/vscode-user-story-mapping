[README (日本語)](README.ja.md)

# Story Mapping Extension for VSCode

![Left: a story map written as an outline. Right: the preview of the same outline as a story map](images/outline-to-map-basic.png)

## What Is Story Mapping

[Story mapping](https://jpattonassociates.com/story-mapping/) is a method that makes it easier to discuss the features of a product and how much each one is needed. This extension draws a story map from a Markdown list (bullet list).

In story mapping, you place tasks from left to right in the order the user does them. Under each task, you place its low-level tasks from top to bottom, with the most needed ones at the top. The result is a two-dimensional map. The map helps users and developers see the whole product, decide where to start, and decide what to release when.

## Story Mapping for One Person

Story mapping was made for teams. A team gathers around sticky notes or cards, talks, and builds a shared understanding. I believe parts of the method are also useful for one person working with a digital tool.

This extension lets you practice story mapping with nothing but a Markdown bullet list. You write an outline (list items with parent-child relations), and the extension shows it as a two-dimensional map.

In a team, the main part of story mapping is conversation. Each card is a starting point for a conversation. For one person, story mapping is a practice of asking yourself questions. You look at the outline and rearrange it, much like organizing your thoughts in [Workflowy](https://workflowy.com/).

The main use of this tool is to help one person think more deeply about a product. It may also be useful for keeping a story map that a team made with sticky notes as a snapshot that can be edited digitally.

## How to Use

1. Open the Markdown file (.md) that you want to turn into a story map.
2. Write a list by following the "[Outline Format](#outline-format)" section.
   - Split what the user does with the product into big steps, and write each step as a list item.
     - These items are called "tasks". Write each task as a verb phrase, such as "Open the app".
   - Then add lower-level tasks under each task as child items.

   - For details of the method, see [Jeff Patton's article](https://jpattonassociates.com/the-new-backlog/) or the book [User Story Mapping](https://www.oreilly.com/library/view/user-story-mapping/9781491904893/).
3. Open the preview in one of these ways.
   - Click the map icon "Preview as Story Map" at the top right of the editor.
   - Right-click inside the editor and choose "Preview as Story Map" from the menu.
4. The map opens next to the editor.

## Outline Format

There are two basic ideas.

- **Time order**
  - On the story map, the time order of tasks runs horizontally, from left to right.
  - In the outline, the time order of tasks is the order of items at the same indent level.
- **Abstraction and necessity**
  - On the story map, the abstraction and the necessity of tasks run vertically, from top to bottom.
    - The top row holds "activities". An activity groups several tasks into one abstract step. The second row holds the tasks.
    - The third row and below hold lower-level tasks. The more a task is needed, the higher it goes.
  - In the outline, the abstraction and the necessity of a task are the depth of its indent.

For an example, see the figure at the top of this document. The outline is on the left, and the preview of it as a story map is on the right.

### Syntax Reference

The table below refers to this example.

![Left: the example outline for the table below. Right: the preview of the same outline](images/outline-to-map-syntax.png)

| You write | The map shows |
| --- | --- |
| `# ` The first heading | The title at the top of the map. Without a heading, the title area is empty. |
| Paragraphs above the first list | Notes under the title. Use them for remarks about the map or for descriptions of the user types that appear in it. |
| Paragraphs below the list | Notes under the map. Use them for remarks about the whole map or for open questions. |
| `- ` (a list item) | The deeper the indent, the lower the row on the map. |
| Two or more `- ` items at the same depth | The second and later items move to the next inner column on the right (Task 2 in the example). |
| An item starting with `^ ` | Moves up one slice. The item is placed on the slice of its parent, on the row below the parent (Task 2-1-1 in the example stays on the red slice with Task 2-1. Task 2-1-1-1 also has `^ `, so it stays on the red slice too). The `^` is not shown on the card. |
| An item starting with `v ` | Moves down. Each `v` moves the item one slice lower (Task 2-2-1 in the example skips the yellow slice and lands on the slice below it). `vv ` skips two slices. The `v` is not shown on the card. |
| An item starting with `//` | A memo. Use it for the background of a card or your thoughts about it. The item and its children are left out of the map completely, and they do not change the number of columns or rows. |
| An item starting with `- [ ] ` | An open task. The card shows ⬜ and has a drop shadow. |
| An item starting with `- [x] ` or `- [X] ` | A completed task. The card shows ✅ and has no border and no shadow. |
| `#tag` at the end of a line (one or more) | Shown at the end of the card as white rounded tags. The `#` is not shown. |
| `1. ` An ordered list | Adds labels to the slices. See [Slice Labels](#slice-labels). |

### Syntax Details

#### Indentation

- You can indent with tabs or spaces. Indentation follows Markdown (CommonMark) rules. One tab equals four spaces.
- We recommend using one indent style within a single file.

#### Slice Labels

When you cut the map with horizontal lines, each part is called a slice. In story mapping, the top slice is usually called activities, the second slice tasks, and the third slice the walking skeleton. The fourth slice and below get the names of individual goals.

Your map may be different. You can name the slices as you like and show the names as labels in this way.

Write an ordered list that starts with `1.`, with the slice names from the top. The labels appear at the left end of the map. For a slice without a label, write an empty item with only the number, such as `4.`.

![The items of the ordered list appear from the top as labels at the left end of the slices. The fourth item is empty, so the fourth slice has no label](images/outline-to-map-labels-blank.png)

#### Moving a Task Up with `^`

Normally, each extra indent level moves a task one slice lower. An item that starts with `^ ` is placed on the same slice as its parent. Inside the slice, it goes on the row below the parent.

![Task 1-1-1 and Task 1-1-2 are on the red slice, under Task 1-1, side by side](images/outline-to-map-caret.png)

Task 1-1-1 and Task 1-1-2 are on the red slice, on the row under Task 1-1. The slice grows to two rows for every column, so Task 2-1 under Activity B stays on the first row of the slice.

With a checkbox, put `^ ` after the checkbox, as in `- [ ] ^ `.

#### Moving a Task Down with `v`

An item that starts with `v ` goes two slices below its parent instead of one. The number of `v` is the number of slices to skip. `vv ` skips two slices, so the item goes three slices below its parent.

![Task 1-1-1 skips the yellow slice and lands on the slice below it. Task 2-1-1 has vv, so it skips two slices. The empty slices are still drawn](images/outline-to-map-v.png)

Task 1-1-1 skips the yellow slice and lands on the slice below it. Task 2-1-1 has `vv `, so it skips two slices. The skipped slices are still drawn.

### Writing the Story Map inside a Normal Markdown Document

This is an advanced use. When the document has a heading whose text is `Story Map`, only the part from that heading to the next heading is the story map. List items above the heading, and list items after the next heading, do not become cards. Use this when the story map is one part of a design note or a meeting note.

- The heading level does not matter. Both `## Story Map` and `### Story Map` work.
- The heading text must be `Story Map` and nothing else. Case does not matter (`story map` and `STORY MAP` also match). A heading with other words, such as `My Story Map`, does not match.
- The map title is the first heading of the document, not the `Story Map` heading. The PNG file name uses the same title.
- The note paragraphs and the ordered list for slice labels are also taken only from the part after the `Story Map` heading.
- Without a `Story Map` heading, the whole document is the story map, as before.

![Only the part under the Story Map heading becomes the map. The list items in the other sections do not](images/outline-to-map-in-doc.png)

## Recommended Setup

We recommend the following setup for comfortable outline editing.

- The VSCode extension "[Dynalist-Style Moves](https://marketplace.visualstudio.com/items?itemName=OneOffObject.dynalist-mover-vscode)"
  - Lets you move an item up and down together with its subtree.
- The VSCode extension "[Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)"
  - General helpers for Markdown.
- The VSCode extension "[markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint)"
  - A syntax checker for Markdown.
- Then change the key bindings to match your favorite outliner (moving items, changing indent, and so on).

## Requirements

- Works on VSCode for desktop (Windows, macOS, Linux).
- The web version (vscode.dev) is not supported.

## Install

Search for "Story Mapping" in the Extensions view of VSCode and install it from the VSCode Marketplace.

You can also download the `.vsix` file from the GitHub releases page and install it by hand.

