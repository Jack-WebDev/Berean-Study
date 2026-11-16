import type { RichTextDocument } from "@berean-study/rich-text-editor/document";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
}));

import {
	countCitations,
	StudyWriting,
} from "../src/components/reader/study-writing";

afterEach(cleanup);

const citation = (excerptId?: number) => ({
	attrs: {
		excerptId,
		label: "Moo, Romans",
		locator: "p. 529",
		strength: "direct",
	},
	type: "citation",
});

// The middle citation points at no excerpt, so it has no source to show.
const document = {
	content: [
		{
			content: [
				{ text: "Called", type: "text" },
				citation(4),
				{ text: " and justified", type: "text" },
				citation(),
				{ text: " and glorified", type: "text" },
				citation(5),
			],
			type: "paragraph",
		},
	],
	type: "doc",
} as RichTextDocument;

describe("numbering a note's sources", () => {
	it("numbers only citations with a source, the way the server counts them", () => {
		render(
			<StudyWriting
				onCitation={vi.fn()}
				openSource={null}
				sourceIdPrefix="sources"
				writing={{ document, firstCitation: 3 }}
			/>,
		);

		expect(
			screen.getAllByRole("button").map((button) => button.textContent),
		).toEqual(["3", "4"]);
		expect(countCitations(document)).toBe(2);
	});
});
