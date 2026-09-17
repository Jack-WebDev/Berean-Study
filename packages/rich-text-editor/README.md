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

## Adding a custom extension

Add the extension and its commands in this package, register it in `createRichTextExtensions`, include it in the shared reader path, and add schema/serialization tests. Keep data fetching, dialogs, and persistence in the feature that consumes the editor.
