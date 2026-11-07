import type { EditorCommandTarget } from "./editor-session";
import type {
	BibleReferenceAttributes,
	CitationAttributes,
	CommentaryTools,
	RichTextEditorPreset,
	VerseBlockAttributes,
} from "./types";

export type EditorCommandId =
	| "paragraph"
	| "heading1"
	| "heading2"
	| "heading3"
	| "bullet"
	| "numbered"
	| "checklist"
	| "quote"
	| "divider"
	| "table"
	| "verse"
	| "person"
	| "bible"
	| "citation"
	| "scriptureReference"
	| "crossReference"
	| "originalTerm"
	| "questionBlock"
	| "textualNoteBlock"
	| "crossReferenceBlock";

export type ReferenceRequest = () =>
	| BibleReferenceAttributes
	| null
	| undefined
	| Promise<BibleReferenceAttributes | null | undefined>;
export type CitationRequest = () =>
	| CitationAttributes
	| null
	| undefined
	| Promise<CitationAttributes | null | undefined>;

export type VerseRequest = () =>
	| VerseBlockAttributes
	| null
	| undefined
	| Promise<VerseBlockAttributes | null | undefined>;

/** Asks the host for a name, such as someone the writer is praying for. */
export type PersonRequest = () =>
	| string
	| null
	| undefined
	| Promise<string | null | undefined>;

export type EditorCommandContext = {
	onRequestBibleReference?: ReferenceRequest;
	onRequestCitation?: CitationRequest;
	commentaryTools?: CommentaryTools;
	onRequestPerson?: PersonRequest;
	onRequestVerse?: VerseRequest;
	preset: RichTextEditorPreset;
};

export type EditorCommandGroup = "block" | "structure" | "insert";

/** A command ready for a UI adapter to present and invoke. */
export type EditorCommand = {
	description: string;
	execute: (target: EditorCommandTarget) => Promise<boolean>;
	group: EditorCommandGroup;
	id: EditorCommandId;
	keywords: readonly string[];
	label: string;
};

export type EditorCommandCatalog = {
	commands: (group?: EditorCommandGroup) => readonly EditorCommand[];
	find: (id: string) => EditorCommand | undefined;
	has: (id: EditorCommandId) => boolean;
};

type EditorCommandDefinition = Omit<EditorCommand, "execute"> & {
	execute: (
		target: EditorCommandTarget,
		context: EditorCommandContext,
	) => boolean | Promise<boolean>;
	isAvailable?: (context: EditorCommandContext) => boolean;
};

function isCommentary(context: EditorCommandContext) {
	return context.preset === "contributor" && Boolean(context.commentaryTools);
}

const commandDefinitions: readonly EditorCommandDefinition[] = [
	{
		description: "Start a standard paragraph.",
		execute: (target) => target.applyCommand("paragraph"),
		group: "block",
		id: "paragraph",
		keywords: ["text", "body"],
		label: "Paragraph",
	},
	{
		description: "Add a large heading.",
		execute: (target) => target.applyCommand("heading1"),
		group: "block",
		id: "heading1",
		keywords: ["heading", "h1", "title"],
		label: "Heading 1",
	},
	{
		description: "Add a section heading.",
		execute: (target) => target.applyCommand("heading2"),
		group: "block",
		id: "heading2",
		keywords: ["heading", "h2"],
		label: "Heading 2",
	},
	{
		description: "Add a subsection heading.",
		execute: (target) => target.applyCommand("heading3"),
		group: "block",
		id: "heading3",
		keywords: ["heading", "h3", "subheading"],
		label: "Heading 3",
	},
	{
		description: "Create an unordered list.",
		execute: (target) => target.applyCommand("bullet"),
		group: "structure",
		id: "bullet",
		keywords: ["list", "unordered"],
		label: "Bulleted list",
	},
	{
		description: "Create an ordered list.",
		execute: (target) => target.applyCommand("numbered"),
		group: "structure",
		id: "numbered",
		keywords: ["list", "ordered"],
		label: "Numbered list",
	},
	{
		description: "Track tasks you can tick off.",
		execute: (target) => target.applyCommand("checklist"),
		group: "structure",
		id: "checklist",
		keywords: ["list", "task", "todo", "checkbox"],
		label: "Checklist",
	},
	{
		description: "Set the selected text apart as a quotation.",
		execute: (target) => target.applyCommand("quote"),
		group: "structure",
		id: "quote",
		keywords: ["blockquote"],
		label: "Quote",
	},
	{
		description: "Add a visual section divider.",
		execute: (target) => target.applyCommand("divider"),
		group: "insert",
		id: "divider",
		keywords: ["horizontal", "rule"],
		label: "Divider",
	},
	{
		description: "Insert a table into your document.",
		execute: (target) => target.applyCommand("table"),
		group: "insert",
		id: "table",
		keywords: ["grid"],
		label: "Table",
	},
	{
		description: "Quote Scripture as a linked Verse block.",
		execute: async (target, context) => {
			const verse = await context.onRequestVerse?.();
			return verse ? target.insertVerseBlock(verse) : false;
		},
		group: "insert",
		id: "verse",
		isAvailable: (context) => Boolean(context.onRequestVerse),
		keywords: ["scripture", "quote", "passage", "bible"],
		label: "Verse",
	},
	{
		description: "Name someone you're praying for.",
		execute: async (target, context) => {
			const name = (await context.onRequestPerson?.())?.trim();
			return name && target.insertText ? target.insertText(name) : false;
		},
		group: "insert",
		id: "person",
		isAvailable: (context) => Boolean(context.onRequestPerson),
		keywords: ["name", "someone", "praying", "for"],
		label: "Person I’m praying for",
	},
	{
		description: "Insert a Scripture reference.",
		execute: async (target, context) => {
			const reference = await context.onRequestBibleReference?.();
			return reference ? target.insertBibleReference(reference) : false;
		},
		group: "insert",
		id: "bible",
		isAvailable: (context) => Boolean(context.onRequestBibleReference),
		keywords: ["reference", "passage"],
		label: "Bible reference",
	},
	{
		description: "Add a citation or source.",
		execute: async (target, context) => {
			const citation = await context.onRequestCitation?.();
			return citation ? target.insertCitation(citation) : false;
		},
		group: "insert",
		id: "citation",
		isAvailable: (context) =>
			context.preset === "contributor" && Boolean(context.onRequestCitation),
		keywords: ["source", "footnote"],
		label: "Citation",
	},
	{
		description: "Link to a passage of Scripture.",
		execute: async (target, context) => {
			const reference =
				await context.commentaryTools?.onRequestScriptureReference();
			return reference
				? (target.insertScriptureReference?.(reference) ?? false)
				: false;
		},
		group: "insert",
		id: "scriptureReference",
		isAvailable: isCommentary,
		keywords: ["reference", "passage", "verse"],
		label: "Scripture ref",
	},
	{
		description: "Add a Greek or Hebrew word.",
		execute: async (target, context) => {
			const term = await context.commentaryTools?.onRequestOriginalTerm();
			return term ? (target.insertOriginalTerm?.(term) ?? false) : false;
		},
		group: "insert",
		id: "originalTerm",
		isAvailable: isCommentary,
		keywords: ["greek", "hebrew", "word", "language"],
		label: "Greek / Hebrew",
	},
	{
		description: "Point readers to a related passage.",
		execute: async (target, context) => {
			const reference =
				await context.commentaryTools?.onRequestCrossReference();
			return reference
				? (target.insertScriptureReference?.(reference) ?? false)
				: false;
		},
		group: "insert",
		id: "crossReference",
		isAvailable: isCommentary,
		keywords: ["see also", "related"],
		label: "Cross-reference",
	},
	...(
		[
			{
				description: "Place an interpretive question and its views here.",
				id: "questionBlock",
				kind: "interpretive_question",
				label: "Interpretive question",
			},
			{
				description: "Place a textual note here.",
				id: "textualNoteBlock",
				kind: "textual_note",
				label: "Textual note",
			},
			{
				description: "Place a reviewed cross-reference here.",
				id: "crossReferenceBlock",
				kind: "cross_reference",
				label: "Cross-reference",
			},
		] as const
	).map(
		({ description, id, kind, label }): EditorCommandDefinition => ({
			description,
			execute: async (target, context) => {
				const block =
					await context.commentaryTools?.onRequestContentBlock?.(kind);
				return block ? (target.insertContentBlock?.(block) ?? false) : false;
			},
			group: "insert",
			id,
			isAvailable: (context) =>
				isCommentary(context) &&
				Boolean(context.commentaryTools?.onRequestContentBlock),
			keywords: ["block", "embed"],
			label,
		}),
	),
];

/**
 * Supplies every available command for an editor context. UI adapters choose
 * where and how to render commands, while this module owns command policy.
 */
export function createEditorCommandCatalog(
	context: EditorCommandContext,
): EditorCommandCatalog {
	const commands = commandDefinitions
		.filter((command) => command.isAvailable?.(context) ?? true)
		.map<EditorCommand>(
			({ execute, isAvailable: _isAvailable, ...command }) => ({
				...command,
				execute: async (target) => execute(target, context),
			}),
		);

	return {
		commands: (group) =>
			group ? commands.filter((command) => command.group === group) : commands,
		find: (id) => commands.find((command) => command.id === id),
		has: (id) => commands.some((command) => command.id === id),
	};
}

export function filterEditorCommands<T extends EditorCommand>(
	commands: readonly T[],
	query: string,
): T[] {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return [...commands];
	return commands.filter((command) =>
		[command.id, command.label, ...command.keywords].some((value) =>
			value.toLowerCase().includes(normalizedQuery),
		),
	);
}

/** @deprecated Prefer createEditorCommandCatalog(context).commands(). */
export function getAvailableEditorActions(context: EditorCommandContext) {
	return createEditorCommandCatalog(context).commands();
}

/** @deprecated Prefer filterEditorCommands(commands, query). */
export function filterEditorActions<T extends EditorCommand>(
	commands: readonly T[],
	query: string,
) {
	return filterEditorCommands(commands, query);
}

/** @deprecated Prefer catalog.find(actionId)?.execute(session). */
export async function executeEditorAction(
	target: EditorCommandTarget,
	actionId: EditorCommandId,
	context: EditorCommandContext,
) {
	const command = createEditorCommandCatalog(context).find(actionId);
	return command ? command.execute(target) : false;
}
