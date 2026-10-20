import type { JSONContent } from "@tiptap/core";

/** The structured document contract persisted by authored-content repositories. */
export type RichTextDocument = JSONContent & { type: "doc" };

/** A serializable node or text mark within a rich-text document. */
export type RichTextNode = JSONContent;
