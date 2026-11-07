import { describe, expect, it } from "vitest";

import {
	getCommentaryReviewText,
	getDocumentCommentaryNodes,
} from "../src/commentary-nodes";
import type { RichTextDocument } from "../src/document-types";
import { hasRichTextContent } from "../src/document-validation";
import { createEditorCommandCatalog } from "../src/editor-actions";

const block = {
	attrs: {
		kind: "interpretive_question",
		label: "Who is the I?",
		scopeKey: "a-key",
	},
	type: "contentBlock",
};
const documentWith = (...content: unknown[]) =>
	({ content, type: "doc" }) as RichTextDocument;

describe("content blocks", () => {
	it("are found in a document, in order, and count as writing", () => {
		const document = documentWith(block);
		expect(getDocumentCommentaryNodes(document).contentBlocks).toEqual([
			block.attrs,
		]);
		expect(hasRichTextContent(document)).toBe(true);
	});

	it("are ignored when they can't be read", () => {
		const document = documentWith({
			attrs: { kind: "something_else", label: "No", scopeKey: "a-key" },
			type: "contentBlock",
		});
		expect(getDocumentCommentaryNodes(document).contentBlocks).toEqual([]);
	});

	it("show up in what reviewers compare", () => {
		expect(getCommentaryReviewText(documentWith(block))).toBe(
			"[Interpretive question: Who is the I?]",
		);
	});

	it("are only offered where the host can answer", () => {
		const tools = {
			onRequestCrossReference: async () => null,
			onRequestOriginalTerm: async () => null,
			onRequestScriptureReference: async () => null,
		};
		const catalog = (onRequestContentBlock?: () => Promise<null>) =>
			createEditorCommandCatalog({
				commentaryTools: { ...tools, onRequestContentBlock },
				preset: "contributor",
			});
		expect(catalog().find("questionBlock")).toBeUndefined();
		expect(catalog(async () => null).find("questionBlock")).toBeDefined();
	});
});

describe("Greek and Hebrew words", () => {
	it("can open a note, and still read without one", () => {
		const word = (attrs: object) =>
			documentWith({
				content: [
					{
						attrs: { gloss: "", language: "greek", word: "ἀγάπη", ...attrs },
						type: "originalTerm",
					},
				],
				type: "paragraph",
			});
		expect(
			getDocumentCommentaryNodes(word({ noteScopeKey: "a-note" }))
				.originalTerms[0]?.noteScopeKey,
		).toBe("a-note");
		expect(
			getDocumentCommentaryNodes(word({ noteScopeKey: null })).originalTerms,
		).toHaveLength(1);
		expect(getDocumentCommentaryNodes(word({})).originalTerms).toHaveLength(1);
	});
});
