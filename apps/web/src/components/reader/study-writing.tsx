import { splitScriptureReference } from "@berean-study/db/passage-key";
import type { StudyWriting as Writing } from "@berean-study/db/reader-study";
import type { RichTextNode } from "@berean-study/rich-text-editor/document";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/*
 * Staff writing in a study note, drawn for readers. Notes are stored as editor
 * documents; this draws only what readers need, without loading the editor. Each
 * citation becomes a small numbered button that opens its source card.
 */

const languageCodes = { greek: "grc", hebrew: "he" } as const;

type Context = {
	/** The citation number the next citation takes. */
	next: number;
	onCitation: (number: number) => void;
	openSource: number | null;
	sourceIdPrefix: string;
};

const linkClass =
	"reader-focus rounded-sm font-semibold text-primary underline underline-offset-3";

function attrs(node: RichTextNode) {
	return (node.attrs ?? {}) as Record<string, unknown>;
}

function withMarks(node: RichTextNode, content: ReactNode, key: number) {
	let result = content;
	for (const mark of node.marks ?? []) {
		switch (mark.type) {
			case "bold":
				result = <strong>{result}</strong>;
				break;
			case "italic":
				result = <em>{result}</em>;
				break;
			case "underline":
				result = <u>{result}</u>;
				break;
			case "strike":
				result = <s>{result}</s>;
				break;
			case "code":
				result = <code>{result}</code>;
				break;
			case "highlight":
				result = <mark className="bg-verse-highlight">{result}</mark>;
				break;
			default:
				// Links are left as words: readers stay on the page, and an outside
				// address in a note hasn't been checked for them.
				break;
		}
	}
	return <span key={key}>{result}</span>;
}

/** "Romans 8:28" in staff writing opens that verse, where the numbers can be read. */
function scriptureLink(bookSlug: string, label: string, key: number) {
	const range = splitScriptureReference(label)?.range;
	if (!range) return <span key={key}>{label}</span>;
	return (
		<Link
			className={linkClass}
			key={key}
			params={{ book: bookSlug, chapter: range.from.chapter }}
			search={range.from.verse ? { verse: range.from.verse } : {}}
			to="/bible/$book/$chapter"
		>
			{label}
		</Link>
	);
}

function inline(node: RichTextNode, context: Context, key: number): ReactNode {
	const a = attrs(node);
	switch (node.type) {
		case "text":
			return withMarks(node, node.text ?? "", key);
		case "hardBreak":
			return <br key={key} />;
		case "citation": {
			const number = context.next;
			context.next += 1;
			const open = context.openSource === number;
			return (
				<button
					aria-controls={`${context.sourceIdPrefix}-${number}`}
					aria-expanded={open}
					aria-label={`Source ${number}`}
					className={cn(
						"reader-focus mx-0.5 inline-flex size-[26px] -translate-y-0.5 items-center justify-center rounded-full align-middle font-bold font-sans text-[13px]",
						open
							? "bg-primary text-primary-foreground"
							: "bg-muted text-foreground",
					)}
					key={key}
					onClick={() => context.onCitation(number)}
					type="button"
				>
					{number}
				</button>
			);
		}
		case "originalTerm": {
			const language = a.language === "hebrew" ? "hebrew" : "greek";
			return (
				<span
					dir={language === "hebrew" ? "rtl" : undefined}
					key={key}
					lang={languageCodes[language]}
				>
					{String(a.word ?? "")}
				</span>
			);
		}
		case "scriptureReference":
			return typeof a.bookSlug === "string" && typeof a.label === "string"
				? scriptureLink(a.bookSlug, a.label, key)
				: null;
		case "bibleReference":
			return typeof a.passageId === "number" ? (
				<Link
					className={linkClass}
					key={key}
					search={{ passage: a.passageId }}
					to="/bible"
				>
					{String(a.label ?? "")}
				</Link>
			) : (
				<span key={key}>{String(a.label ?? "")}</span>
			);
		default:
			return null;
	}
}

function children(node: RichTextNode, context: Context, asInline: boolean) {
	return (node.content ?? []).map((child, index) =>
		asInline ? inline(child, context, index) : block(child, context, index),
	);
}

function block(node: RichTextNode, context: Context, key: number): ReactNode {
	const a = attrs(node);
	switch (node.type) {
		case "paragraph":
			return node.content?.length ? (
				<p key={key}>{children(node, context, true)}</p>
			) : null;
		case "heading":
			// Below the note's own title, so headings inside it stay small.
			return (
				<h5 className="font-bold text-[17px]" key={key}>
					{children(node, context, true)}
				</h5>
			);
		case "bulletList":
		case "taskList":
			return (
				<ul className="list-disc ps-6" key={key}>
					{children(node, context, false)}
				</ul>
			);
		case "orderedList":
			return (
				<ol className="list-decimal ps-6" key={key}>
					{children(node, context, false)}
				</ol>
			);
		case "listItem":
		case "taskItem":
			return <li key={key}>{children(node, context, false)}</li>;
		case "blockquote":
			return (
				<blockquote
					className="border-border-strong border-s-2 ps-3 text-muted-foreground"
					key={key}
				>
					{children(node, context, false)}
				</blockquote>
			);
		case "verseBlock":
			return typeof a.text === "string" && a.text ? (
				<blockquote
					className="rounded-xl bg-reader-notice px-3 py-2 font-serif text-reader-notice-foreground"
					key={key}
				>
					{a.text}
				</blockquote>
			) : null;
		case "horizontalRule":
			return <hr className="border-border" key={key} />;
		case "codeBlock":
			return <p key={key}>{children(node, context, true)}</p>;
		case "contentBlock":
			// Another reviewed note placed in this one; it shows in its own group.
			return null;
		default:
			// Tables and anything newer: keep their words in reading order.
			return node.content?.length ? (
				<div key={key}>{children(node, context, false)}</div>
			) : null;
	}
}

/** One piece of a note's writing, with its citations numbered from `firstCitation`. */
export function StudyWriting({
	className,
	onCitation,
	openSource,
	sourceIdPrefix,
	writing,
}: {
	className?: string;
	onCitation: (number: number) => void;
	openSource: number | null;
	/** Source cards' ids start with this, so citation buttons can point to them. */
	sourceIdPrefix: string;
	writing: Writing;
}) {
	const context: Context = {
		next: writing.firstCitation,
		onCitation,
		openSource,
		sourceIdPrefix,
	};
	return (
		<div
			className={cn(
				"flex flex-col gap-3 text-[17px] text-foreground leading-[1.65]",
				className,
			)}
		>
			{children(writing.document, context, false)}
		</div>
	);
}

/** How many citations a piece of writing has, to know which sources it shows. */
export function countCitations(node: RichTextNode): number {
	return (
		(node.type === "citation" ? 1 : 0) +
		(node.content ?? []).reduce(
			(total, child) => total + countCitations(child),
			0,
		)
	);
}
