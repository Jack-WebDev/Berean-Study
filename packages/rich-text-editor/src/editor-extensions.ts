import type { Extensions } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";

const allowedProtocols = new Set(["http:", "https:", "mailto:"]);

function isAllowedLinkUri(uri: string | undefined) {
	if (!uri) return false;
	try {
		return allowedProtocols.has(new URL(uri, "https://berean.study").protocol);
	} catch {
		return false;
	}
}

/** Returns the deliberately constrained schema shared by edit and read-only use. */
export function createRichTextExtensions(
	placeholder = "Start writing…",
): Extensions {
	return [
		StarterKit.configure({
			heading: { levels: [2, 3] },
			link: {
				autolink: false,
				isAllowedUri: isAllowedLinkUri,
				linkOnPaste: false,
				openOnClick: false,
			},
		}),
		TextAlign.configure({
			alignments: ["left", "center", "right"],
			types: ["heading", "paragraph"],
		}),
		Placeholder.configure({ placeholder }),
	];
}
