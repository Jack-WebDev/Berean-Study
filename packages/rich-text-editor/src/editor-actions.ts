import type { EditorSession } from "./editor-session";
import type {
	BibleReferenceAttributes,
	CitationAttributes,
	RichTextEditorPreset,
} from "./types";

export type EditorCommandId =
	| "paragraph"
	| "heading2"
	| "heading3"
	| "bullet"
	| "numbered"
	| "quote"
	| "divider"
	| "table"
	| "bible"
	| "citation";

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

export type EditorCommandContext = {
	onRequestBibleReference?: ReferenceRequest;
	onRequestCitation?: CitationRequest;
	preset: RichTextEditorPreset;
};

export type EditorCommandGroup = "block" | "structure" | "insert";

/** A command ready for a UI adapter to present and invoke. */
export type EditorCommand = {
	description: string;
	execute: (session: EditorSession) => Promise<boolean>;
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
		session: EditorSession,
		context: EditorCommandContext,
	) => boolean | Promise<boolean>;
	isAvailable?: (context: EditorCommandContext) => boolean;
};

const commandDefinitions: readonly EditorCommandDefinition[] = [
	{
		description: "Start a standard paragraph.",
		execute: (session) => session.applyCommand("paragraph"),
		group: "block",
		id: "paragraph",
		keywords: ["text"],
		label: "Body text",
	},
	{
		description: "Add a section heading.",
		execute: (session) => session.applyCommand("heading2"),
		group: "block",
		id: "heading2",
		keywords: ["heading", "h2"],
		label: "Heading",
	},
	{
		description: "Add a subsection heading.",
		execute: (session) => session.applyCommand("heading3"),
		group: "block",
		id: "heading3",
		keywords: ["heading", "h3"],
		label: "Subheading",
	},
	{
		description: "Create an unordered list.",
		execute: (session) => session.applyCommand("bullet"),
		group: "structure",
		id: "bullet",
		keywords: ["list", "unordered"],
		label: "Bulleted list",
	},
	{
		description: "Create an ordered list.",
		execute: (session) => session.applyCommand("numbered"),
		group: "structure",
		id: "numbered",
		keywords: ["list", "ordered"],
		label: "Numbered list",
	},
	{
		description: "Set the selected text apart as a quotation.",
		execute: (session) => session.applyCommand("quote"),
		group: "structure",
		id: "quote",
		keywords: ["blockquote"],
		label: "Quote",
	},
	{
		description: "Add a visual section divider.",
		execute: (session) => session.applyCommand("divider"),
		group: "insert",
		id: "divider",
		keywords: ["horizontal", "rule"],
		label: "Divider",
	},
	{
		description: "Insert a table into your document.",
		execute: (session) => session.applyCommand("table"),
		group: "insert",
		id: "table",
		keywords: ["grid"],
		label: "Table",
	},
	{
		description: "Insert a Scripture reference.",
		execute: async (session, context) => {
			const reference = await context.onRequestBibleReference?.();
			return reference ? session.insertBibleReference(reference) : false;
		},
		group: "insert",
		id: "bible",
		isAvailable: (context) => Boolean(context.onRequestBibleReference),
		keywords: ["reference", "passage"],
		label: "Bible reference",
	},
	{
		description: "Add a citation or source.",
		execute: async (session, context) => {
			const citation = await context.onRequestCitation?.();
			return citation ? session.insertCitation(citation) : false;
		},
		group: "insert",
		id: "citation",
		isAvailable: (context) =>
			context.preset === "contributor" && Boolean(context.onRequestCitation),
		keywords: ["source", "footnote"],
		label: "Citation",
	},
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
				execute: async (editor) => execute(editor, context),
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
	session: EditorSession,
	actionId: EditorCommandId,
	context: EditorCommandContext,
) {
	const command = createEditorCommandCatalog(context).find(actionId);
	return command ? command.execute(session) : false;
}
