# Berean Study Rich Text Editor

`@berean-study/rich-text-editor` is the reusable, structured writing primitive for Berean Study. It owns editing, schema validation, formatting controls, and document rendering. Features own titles, persistence, autosave, pickers, and surrounding layout.

## RichTextEditor: reusable editing primitive

```tsx
import { RichTextEditor, type RichTextDocument } from "@berean-study/rich-text-editor";

<RichTextEditor
  onChange={(document: RichTextDocument) => setContent(document)}
  placeholder="Write your reflection…"
  preset="member"
  value={content}
/>
```

Use `preset="member"` for member-authored writing. Use `preset="contributor"` for editorial writing; it additionally enables citations.

The editor document is Tiptap JSON (`RichTextDocument`). Store that structured JSON as appropriate for the consuming feature; do not flatten it to HTML or text for persistence.

Small consumers use `RichTextEditor` directly. It does not render an inspector, Focused Mode chrome, or resource metadata.

## RichTextEditorWorkspace: optional writing environment

Use `RichTextEditorWorkspace` for a larger writing surface. It wraps the same `RichTextEditor` instance and adds the `EditorInspector` (Insert, Document, and References), responsive inspector access, and temporary Focused Mode.

```tsx
import { RichTextEditorWorkspace } from "@berean-study/rich-text-editor";

<RichTextEditorWorkspace
  details={<DocumentDetails saveState={saveState} />}
  focusedModeStatus={saveState}
  focusedModeTitle={title}
  onChange={setContent}
  organization={<p>Romans study</p>}
  preset="member"
  tags={<TagEditor tags={tags} onChange={setTags} />}
  value={content}
/>
```

`tags`, `organization`, `details`, `focusedModeTitle`, and `focusedModeStatus` are host-rendered extension points. The workspace does not persist them, fetch their data, or know about the feature that supplied them.

Focused Mode is a temporary fixed-viewport presentation of the existing workspace. It does not use browser fullscreen, create another editor, or serialize/reconstruct the document. The inspector starts closed in Focused Mode; its active tab is retained when opened.

## Reuse examples

```tsx
<RichTextEditor
  onChange={setReflection}
  placeholder="Write your reflection…"
  preset="member"
  value={reflection}
/>

<RichTextEditor
  onChange={setJournalEntry}
  placeholder="Write your journal entry…"
  preset="member"
  value={journalEntry}
/>
```

## Bible references and citations

The package never queries passages or sources. A consumer supplies picker callbacks, and the editor inserts semantic nodes after a selection is returned:

```tsx
<RichTextEditor
  onChange={setContent}
  onRequestBibleReference={() => openPassagePicker()}
  onRequestCitation={() => openCitationPicker()}
  preset="contributor"
  value={content}
/>
```

`onRequestBibleReference` returns `{ passageId, label }`; `onRequestCitation` returns `{ citationId, label }`. Returning `null` or omitting a callback safely leaves the document unchanged.

## Read-only content and previews

Render persisted content with the shared schema, not a separate HTML renderer:

```tsx
<RichTextRenderer document={content} preset="contributor" />
```

Malformed root documents normalize to an empty document. Use `RichTextRenderer` for reader pages and previews. Its schema is shared with both `RichTextEditor` and `RichTextEditorWorkspace`, so preview is structured content—not a second model.

## Toolbar variants

`toolbar` picks how many formatting controls to show:

- `full` (default): every control, including tables, alignment and code.
- `simple`: text style (Paragraph / Heading / Quote), bold, italic, underline, highlight, lists, quote, link, Insert verse, undo and redo.
- `compact`: a short row for inline composers. Pass `onExpand` to add an "Open full-screen editor" button.
- `docked`: labelled buttons (icon and word) in a pill below the writing, pinned to the bottom of the screen while scrolling. Every button shows its state with `aria-pressed`. Choose the buttons with `toolbarItems`; the default is Bold, Italic, List and Add a verse (shown only when `onRequestVerse` is set).

On phones, the `simple`, `compact` and `docked` toolbars move to the top of the on-screen keyboard while the editor has focus.

```tsx
<RichTextEditor
  onRequestVerse={openVersePicker}
  toolbar="docked"
  toolbarItems={["bold", "italic", "bullet", "verse"]}
  …
/>
```

`DockedToolbar` is also exported for hosts that place it themselves (pass the session from `onSessionReady`).

```tsx
<RichTextEditor onExpand={openFullScreen} toolbar="compact" … />
```

## The `/` menu

Without `slashCommands`, the menu lists every available command. Pass a list to choose and order them, optionally with your own label and hint:

```tsx
import { journalSlashCommands } from "@berean-study/rich-text-editor";

<RichTextEditor
  onRequestPerson={askForName}
  onRequestVerse={openVersePicker}
  slashCommands={journalSlashCommands} // Verse, Person I'm praying for, Heading, Bulleted list
  …
/>
```

Commands that need a host picker ("Verse" needs `onRequestVerse`, "Person I'm praying for" needs `onRequestPerson`) are left out until the host provides it.

## Verse blocks (Scripture)

A verse block stores a structured reference (`book`, `chapter`, `verseStart`, `verseEnd`, `translation`, `passageId`) and, optionally, `text`: a copy of the words taken when it was inserted. The host loads the live text through `VerseBlockProvider`; the saved `text` is shown only when it can't. Give the provider `getHref` to make the reference a real link (for example to Browse Scripture), and `onOpen` to handle plain clicks inside the app.

`getDocumentVerseBlocks(document)` lists the verses a document quotes, so a feature can store them in its own table. `getDocumentVerseReferences(document)` lists each verse once, with a ready-made label ("James 1:5"), its translation and passage, for showing "verses in this entry".

## Templates and plain text

From `@berean-study/rich-text-editor/document` (no React needed):

- `createTestimonyTemplate()`: three headings, each followed by an empty line with its own hint.
- `createReflectionTemplate(question)`: the guiding question as a heading.
- `getPlainText(document, { skipHeadings })`: the writer's words, one line per block, without verse blocks. Store it beside the JSON for search and previews.
- `getExcerpt(document, maxLength, { skipHeadings })`: a one-line preview cut at a word boundary.
- `getDocumentSectionTexts(document)`: the text under each heading.

A template's hint lives on the paragraph as `prompt` and shows only while that line is empty. It is never part of the text.

## Adding a custom extension

Add the extension and its commands in this package, register it in `createRichTextExtensions`, include it in the shared reader path, and add schema/serialization tests. Keep data fetching, dialogs, and persistence in the feature that consumes the editor.
