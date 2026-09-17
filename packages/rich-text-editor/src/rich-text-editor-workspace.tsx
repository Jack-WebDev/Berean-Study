import type { Editor } from "@tiptap/core";
import { BookOpenIcon, MinusIcon, QuoteIcon, Table2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDocumentReferences } from "./bible-reference-utils";
import {
	extractDocumentHeadings,
	getCharacterCount,
	getEstimatedReadingTime,
	getWordCount,
} from "./document-utils";
import {
	type EditorActionId,
	executeEditorAction,
	getAvailableEditorActions,
} from "./editor-actions";
import { RichTextEditor } from "./rich-text-editor";
import type { RichTextDocument, RichTextEditorWorkspaceProps } from "./types";

type InspectorTab = "insert" | "document" | "references";

/**
 * Optional writing shell around RichTextEditor. Resource-specific metadata is
 * supplied by the host, while document-derived information stays in sync with
 * the editor's structured JSON.
 */
export function RichTextEditorWorkspace({
	details,
	onChange,
	onEditorReady,
	onRequestBibleReference,
	onRequestCitation,
	organization,
	preset = "member",
	tags,
	value,
	...editorProps
}: RichTextEditorWorkspaceProps) {
	const [editor, setEditor] = useState<Editor | null>(null);
	const [document, setDocument] = useState(value);
	const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);

	useEffect(() => setDocument(value), [value]);

	const handleChange = useCallback(
		(nextDocument: RichTextDocument) => {
			setDocument(nextDocument);
			onChange(nextDocument);
		},
		[onChange],
	);
	const handleEditorReady = useCallback(
		(nextEditor: Editor | null) => {
			setEditor(nextEditor);
			onEditorReady?.(nextEditor);
		},
		[onEditorReady],
	);
	const actionContext = useMemo(
		() => ({ onRequestBibleReference, onRequestCitation, preset }),
		[onRequestBibleReference, onRequestCitation, preset],
	);

	return (
		<div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_17rem]">
			<div className="min-w-0">
				<div className="mb-2 flex justify-end md:hidden">
					<button
						aria-controls="rich-text-mobile-inspector"
						aria-expanded={mobileInspectorOpen}
						className="rounded-sm border border-border px-2 py-1 font-medium text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						onClick={() => setMobileInspectorOpen((open) => !open)}
						type="button"
					>
						Writing tools
					</button>
				</div>
				<RichTextEditor
					{...editorProps}
					onChange={handleChange}
					onEditorReady={handleEditorReady}
					onRequestBibleReference={onRequestBibleReference}
					onRequestCitation={onRequestCitation}
					preset={preset}
					value={value}
				/>
				{mobileInspectorOpen ? (
					<div
						className="mt-2 border border-border bg-card md:hidden"
						id="rich-text-mobile-inspector"
					>
						<WorkspaceInspector
							details={details}
							document={document}
							editor={editor}
							organization={organization}
							actionContext={actionContext}
							tags={tags}
						/>
					</div>
				) : null}
			</div>
			<aside className="hidden min-h-0 border border-border bg-card md:block">
				<WorkspaceInspector
					details={details}
					document={document}
					editor={editor}
					organization={organization}
					actionContext={actionContext}
					tags={tags}
				/>
			</aside>
		</div>
	);
}

function WorkspaceInspector({
	actionContext,
	details,
	document,
	editor,
	organization,
	tags,
}: {
	actionContext: Parameters<typeof getAvailableEditorActions>[0];
	details?: React.ReactNode;
	document: RichTextDocument;
	editor: Editor | null;
	organization?: React.ReactNode;
	tags?: React.ReactNode;
}) {
	const [tab, setTab] = useState<InspectorTab>("insert");
	const headings = useMemo(() => extractDocumentHeadings(document), [document]);
	const references = useMemo(() => getDocumentReferences(document), [document]);
	const actions = useMemo(
		() => getAvailableEditorActions(actionContext),
		[actionContext],
	);

	return (
		<div className="flex min-h-72 flex-col">
			<div
				aria-label="Writing tools"
				className="flex border-border border-b"
				role="tablist"
			>
				<TabButton active={tab === "insert"} id="insert" onClick={setTab}>
					Insert
				</TabButton>
				<TabButton active={tab === "document"} id="document" onClick={setTab}>
					Document
				</TabButton>
				<TabButton
					active={tab === "references"}
					id="references"
					onClick={setTab}
				>
					References
				</TabButton>
			</div>
			<div
				aria-labelledby={`${tab}-tab`}
				className="flex-1 p-3"
				id={`${tab}-panel`}
				role="tabpanel"
			>
				{tab === "insert" ? (
					<InsertPanel
						actions={actions}
						context={actionContext}
						editor={editor}
					/>
				) : null}
				{tab === "document" ? (
					<DocumentPanel
						details={details}
						document={document}
						editor={editor}
						headings={headings}
						organization={organization}
						tags={tags}
					/>
				) : null}
				{tab === "references" ? (
					<ReferencesPanel
						actions={actions}
						context={actionContext}
						editor={editor}
						references={references}
					/>
				) : null}
			</div>
		</div>
	);
}

function TabButton({
	active,
	children,
	id,
	onClick,
}: {
	active: boolean;
	children: React.ReactNode;
	id: InspectorTab;
	onClick: (tab: InspectorTab) => void;
}) {
	return (
		<button
			aria-controls={`${id}-panel`}
			aria-selected={active}
			className="flex-1 border-transparent border-b-2 px-1 py-2 font-medium text-muted-foreground text-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-selected:border-primary aria-selected:text-foreground"
			onClick={() => onClick(id)}
			id={`${id}-tab`}
			role="tab"
			type="button"
		>
			{children}
		</button>
	);
}

function InsertPanel({
	actions,
	context,
	editor,
}: {
	actions: ReturnType<typeof getAvailableEditorActions>;
	context: Parameters<typeof getAvailableEditorActions>[0];
	editor: Editor | null;
}) {
	const items: {
		id: EditorActionId;
		icon: typeof Table2Icon;
		label: string;
	}[] = [
		{ icon: Table2Icon, id: "table", label: "Table" },
		{ icon: MinusIcon, id: "divider", label: "Divider" },
		{ icon: BookOpenIcon, id: "bible", label: "Bible Passage" },
		{ icon: QuoteIcon, id: "citation", label: "Citation" },
	];
	const available = new Set(actions.map((action) => action.id));
	return (
		<div className="grid gap-1">
			{items
				.filter((item) => available.has(item.id))
				.map(({ icon: Icon, id, label }) => (
					<button
						className="flex items-center gap-2 rounded-sm px-2 py-2 text-left text-xs hover:bg-muted disabled:opacity-40"
						disabled={!editor}
						key={id}
						onClick={() =>
							editor && void executeEditorAction(editor, id, context)
						}
						type="button"
					>
						<Icon aria-hidden="true" className="size-4 text-muted-foreground" />
						{label}
					</button>
				))}
			<p className="px-2 py-2 text-muted-foreground text-xs">
				More insert options will appear here as they are enabled.
			</p>
		</div>
	);
}

function DocumentPanel({
	details,
	document,
	editor,
	headings,
	organization,
	tags,
}: {
	details?: React.ReactNode;
	document: RichTextDocument;
	editor: Editor | null;
	headings: ReturnType<typeof extractDocumentHeadings>;
	organization?: React.ReactNode;
	tags?: React.ReactNode;
}) {
	return (
		<div className="space-y-5 text-xs">
			<Section title="Outline">
				{headings.length ? (
					headings.map((heading, index) => (
						<button
							className="block w-full truncate rounded-sm py-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							key={heading.id}
							onClick={() => focusHeading(editor, index)}
							style={{ paddingLeft: `${(heading.level - 2) * 12}px` }}
							type="button"
						>
							{heading.text}
						</button>
					))
				) : (
					<Empty>Headings will appear here.</Empty>
				)}
			</Section>
			{tags ? <Section title="Tags">{tags}</Section> : null}
			{organization ? (
				<Section title="Organization">{organization}</Section>
			) : null}
			{details ? <Section title="Details">{details}</Section> : null}
			<Section title="Statistics">
				<dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
					<dt>Words</dt>
					<dd className="text-right text-foreground">
						{getWordCount(document)}
					</dd>
					<dt>Characters</dt>
					<dd className="text-right text-foreground">
						{getCharacterCount(document)}
					</dd>
					<dt>Reading time</dt>
					<dd className="text-right text-foreground">
						{getEstimatedReadingTime(document)} min
					</dd>
				</dl>
			</Section>
		</div>
	);
}

function ReferencesPanel({
	actions,
	context,
	editor,
	references,
}: {
	actions: ReturnType<typeof getAvailableEditorActions>;
	context: Parameters<typeof getAvailableEditorActions>[0];
	editor: Editor | null;
	references: ReturnType<typeof getDocumentReferences>;
}) {
	const available = new Set(actions.map((action) => action.id));
	return (
		<div className="space-y-5 text-xs">
			<Section title="Scripture">
				{references.bibleReferences.length ? (
					references.bibleReferences.map((reference, index) => (
						<ReferenceRow
							editor={editor}
							index={index}
							key={`${reference.passageId}-${index}`}
							label={reference.label}
							type="bibleReference"
						/>
					))
				) : (
					<Empty>No Scripture references.</Empty>
				)}
			</Section>
			{available.has("citation") ? (
				<Section title="Citations">
					{references.citations.length ? (
						references.citations.map((citation, index) => (
							<ReferenceRow
								editor={editor}
								index={index}
								key={`${citation.citationId}-${index}`}
								label={`[${citation.label}]`}
								type="citation"
							/>
						))
					) : (
						<Empty>No citations.</Empty>
					)}
				</Section>
			) : null}
			<div className="grid gap-1">
				{available.has("bible") ? (
					<ActionButton
						action="bible"
						context={context}
						editor={editor}
						label="Add Bible reference"
					/>
				) : null}
				{available.has("citation") ? (
					<ActionButton
						action="citation"
						context={context}
						editor={editor}
						label="Add citation"
					/>
				) : null}
			</div>
		</div>
	);
}

function Section({
	children,
	title,
}: {
	children: React.ReactNode;
	title: string;
}) {
	return (
		<section>
			<h3 className="mb-1 font-medium text-foreground">{title}</h3>
			{children}
		</section>
	);
}
function Empty({ children }: { children: React.ReactNode }) {
	return <p className="text-muted-foreground">{children}</p>;
}
function ActionButton({
	action,
	context,
	editor,
	label,
}: {
	action: EditorActionId;
	context: Parameters<typeof getAvailableEditorActions>[0];
	editor: Editor | null;
	label: string;
}) {
	return (
		<button
			className="rounded-sm px-2 py-1 text-left text-primary hover:bg-primary/10 disabled:opacity-40"
			disabled={!editor}
			onClick={() =>
				editor && void executeEditorAction(editor, action, context)
			}
			type="button"
		>
			{label}
		</button>
	);
}
function ReferenceRow({
	editor,
	index,
	label,
	type,
}: {
	editor: Editor | null;
	index: number;
	label: string;
	type: "bibleReference" | "citation";
}) {
	return (
		<div className="flex items-center gap-1 rounded-sm hover:bg-muted">
			<button
				className="min-w-0 flex-1 truncate px-2 py-1 text-left disabled:opacity-40"
				disabled={!editor}
				onClick={() => focusStructuredNode(editor, type, index)}
				type="button"
			>
				{label}
			</button>
			<button
				aria-label={`Remove ${label}`}
				className="px-2 py-1 text-destructive text-xs hover:bg-destructive/10 disabled:opacity-40"
				disabled={!editor}
				onClick={() => removeStructuredNode(editor, type, index)}
				type="button"
			>
				Remove
			</button>
		</div>
	);
}
function focusHeading(editor: Editor | null, index: number) {
	const position = findNodePosition(editor, "heading", index);
	if (position !== null) editor?.commands.focus(position);
}
function focusStructuredNode(
	editor: Editor | null,
	type: "bibleReference" | "citation",
	index: number,
) {
	const position = findNodePosition(editor, type, index);
	if (position !== null) editor?.commands.setNodeSelection(position);
}

function removeStructuredNode(
	editor: Editor | null,
	type: "bibleReference" | "citation",
	index: number,
) {
	const position = findNodePosition(editor, type, index);
	if (position !== null)
		editor?.chain().focus().setNodeSelection(position).deleteSelection().run();
}
function findNodePosition(editor: Editor | null, type: string, index: number) {
	if (!editor) return null;
	let found = 0;
	let position: number | null = null;
	editor.state.doc.descendants((node, pos) => {
		if (node.type.name !== type) return;
		if (found++ === index) {
			position = pos;
			return false;
		}
	});
	return position;
}
