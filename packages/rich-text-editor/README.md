# Berean Study Rich Text Editor

`@berean-study/rich-text-editor` is the reusable, structured writing primitive for Berean Study. It owns editing, schema validation, formatting controls, and document rendering. Features own titles, persistence, autosave, pickers, and surrounding layout.

## Use the editor

```tsx
import { RichTextEditor, type RichTextDocument } from "@berean-study/rich-text-editor";

<RichTextEditor
  onChange={(document: RichTextDocument) => setContent(document)}
  placeholder="Write your prayer…"
  preset="member"
  value={content}
/>
```

Use `preset="member"` for prayers, testimonies, and notes. Use `preset="contributor"` for editorial writing; it additionally enables citations.

The editor document is Tiptap JSON (`RichTextDocument`). Store that structured JSON as appropriate for the consuming feature; do not flatten it to HTML or text for persistence.

## Reuse examples

```tsx
<RichTextEditor
  onChange={setPrayer}
  placeholder="Write your prayer…"
  preset="member"
  value={prayer}
/>

<RichTextEditor
  onChange={setTestimony}
  placeholder="Tell your story…"
  preset="member"
  value={testimony}
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

Malformed root documents normalize to an empty document. Use `RichTextRenderer` for reader pages and previews. `RichTextEditor` is the focused editing primitive; `RichTextEditorWorkspace` is an optional writing shell with an outline, references, statistics, and host-provided organization/details panels.

Notes use `RichTextEditor` with the member preset and serialize the JSON document at the existing Note persistence boundary. Their Write/Preview control uses `RichTextRenderer`, so preview is the same structured content—not a second model.

## Adding a custom extension

Add the extension and its commands in this package, register it in `createRichTextExtensions`, include it in the shared reader path, and add schema/serialization tests. Keep data fetching, dialogs, and persistence in the feature that consumes the editor.
