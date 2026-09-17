import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@berean-study/ui/components/sheet";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@berean-study/ui/components/tabs";
import type { Editor } from "@tiptap/core";
import {
	BookOpenIcon,
	Maximize2Icon,
	Minimize2Icon,
	MinusIcon,
	PanelRightCloseIcon,
	PanelRightOpenIcon,
	QuoteIcon,
	Table2Icon,
} from "lucide-react";
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
	focusedModeStatus,
	focusedModeTitle,
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
	const [inspectorTab, setInspectorTab] = useState<InspectorTab>("insert");
	const [isFocused, setIsFocused] = useState(false);
	const [focusedInspectorOpen, setFocusedInspectorOpen] = useState(false);
	const [inspectorSheetOpen, setInspectorSheetOpen] = useState(false);
	const isWideLayout = useMediaQuery("(min-width: 1024px)");

	useEffect(() => setDocument(value), [value]);

	useEffect(() => {
		if (!isFocused) return;
		const previousOverflow = window.document.body.style.overflow;
		window.document.body.style.overflow = "hidden";
		return () => {
			window.document.body.style.overflow = previousOverflow;
		};
	}, [isFocused]);

	useEffect(() => {
		if (!isFocused) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || event.defaultPrevented) return;
			if (focusedInspectorOpen || inspectorSheetOpen) {
				event.preventDefault();
				setFocusedInspectorOpen(false);
				setInspectorSheetOpen(false);
				return;
			}
			setIsFocused(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [focusedInspectorOpen, inspectorSheetOpen, isFocused]);

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
	const enterFocus = useCallback(() => {
		setFocusedInspectorOpen(false);
		setInspectorSheetOpen(false);
		setIsFocused(true);
	}, []);
	const exitFocus = useCallback(() => {
		setFocusedInspectorOpen(false);
		setInspectorSheetOpen(false);
		setIsFocused(false);
	}, []);
	const toggleFocusedInspector = useCallback(() => {
		if (isWideLayout) {
			setFocusedInspectorOpen((open) => !open);
			return;
		}
		setInspectorSheetOpen((open) => !open);
	}, [isWideLayout]);
	const isFocusedInspectorOpen = isWideLayout
		? focusedInspectorOpen
		: inspectorSheetOpen;

	return (
		<section
			aria-label="Editor workspace"
			className={
				isFocused
					? "fixed inset-0 z-50 flex min-h-dvh flex-col overflow-hidden bg-background text-foreground"
					: "min-w-0"
			}
			data-focused={isFocused || undefined}
		>
			<header
				className={
					isFocused
						? "flex h-12 shrink-0 items-center gap-3 border-border border-b bg-card px-4"
						: "hidden"
				}
			>
				<button
					aria-label="Exit Focus"
					className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-medium text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					onClick={exitFocus}
					type="button"
				>
					<Minimize2Icon aria-hidden="true" className="size-3.5" />
					Exit Focus
				</button>
				<div className="min-w-0 flex-1 truncate text-center font-medium text-sm">
					{focusedModeTitle}
				</div>
				<div className="flex items-center gap-2">
					{focusedModeStatus ? (
						<div className="text-muted-foreground text-xs">
							{focusedModeStatus}
						</div>
					) : null}
					<button
						aria-expanded={isFocusedInspectorOpen}
						aria-label={
							isFocusedInspectorOpen
								? "Close writing tools"
								: "Open writing tools"
						}
						className="inline-flex size-7 items-center justify-center rounded-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						onClick={toggleFocusedInspector}
						type="button"
					>
						{isFocusedInspectorOpen ? (
							<PanelRightCloseIcon aria-hidden="true" className="size-4" />
						) : (
							<PanelRightOpenIcon aria-hidden="true" className="size-4" />
						)}
					</button>
				</div>
			</header>
			<div
				className={
					isFocused
						? "flex min-h-0 flex-1"
						: "grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_17rem]"
				}
			>
				<div
					className={
						isFocused
							? "mx-auto w-full min-w-0 max-w-[52rem] overflow-y-auto px-4 py-6 sm:px-6"
							: "min-w-0"
					}
				>
					<div className={isFocused ? "hidden" : "mb-2 flex justify-end"}>
						<button
							aria-label="Focus editor"
							className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 font-medium text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							onClick={enterFocus}
							type="button"
						>
							<Maximize2Icon aria-hidden="true" className="size-3.5" />
							Focus editor
						</button>
					</div>
					<div
						className={
							isFocused || isWideLayout ? "hidden" : "mb-2 flex justify-end"
						}
					>
						<button
							aria-expanded={inspectorSheetOpen}
							aria-label="Open writing tools"
							className="rounded-sm border border-border px-2 py-1 font-medium text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							onClick={() => setInspectorSheetOpen(true)}
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
				</div>
				<aside
					className={
						isFocused
							? isWideLayout && focusedInspectorOpen
								? "w-72 shrink-0 overflow-y-auto border-border border-l bg-card"
								: "hidden"
							: "hidden min-h-0 border border-border bg-card lg:block"
					}
				>
					<WorkspaceInspector
						details={details}
						document={document}
						editor={editor}
						organization={organization}
						actionContext={actionContext}
						onTabChange={setInspectorTab}
						tab={inspectorTab}
						tags={tags}
					/>
				</aside>
			</div>
			<Sheet
				onOpenChange={setInspectorSheetOpen}
				open={!isWideLayout && inspectorSheetOpen}
			>
				<SheetContent side="right">
					<SheetHeader>
						<SheetTitle>Writing tools</SheetTitle>
					</SheetHeader>
					<div className="min-h-0 overflow-y-auto">
						<WorkspaceInspector
							actionContext={actionContext}
							details={details}
							document={document}
							editor={editor}
							onTabChange={setInspectorTab}
							organization={organization}
							tab={inspectorTab}
							tags={tags}
						/>
					</div>
				</SheetContent>
			</Sheet>
		</section>
	);
}

function useMediaQuery(query: string) {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		if (!window.matchMedia) return;
		const mediaQuery = window.matchMedia(query);
		const updateMatches = () => setMatches(mediaQuery.matches);
		updateMatches();
		mediaQuery.addEventListener("change", updateMatches);
		return () => mediaQuery.removeEventListener("change", updateMatches);
	}, [query]);

	return matches;
}

function WorkspaceInspector({
	actionContext,
	details,
	document,
	editor,
	onTabChange,
	organization,
	tags,
	tab,
}: {
	actionContext: Parameters<typeof getAvailableEditorActions>[0];
	details?: React.ReactNode;
	document: RichTextDocument;
	editor: Editor | null;
	onTabChange: (tab: InspectorTab) => void;
	organization?: React.ReactNode;
	tags?: React.ReactNode;
	tab: InspectorTab;
}) {
	const headings = useMemo(() => extractDocumentHeadings(document), [document]);
	const references = useMemo(() => getDocumentReferences(document), [document]);
	const actions = useMemo(
		() => getAvailableEditorActions(actionContext),
		[actionContext],
	);

	return (
		<div className="flex min-h-72 flex-col">
			<Tabs
				aria-label="Writing tools"
				className="min-h-72 gap-0"
				onValueChange={(value) => onTabChange(value as InspectorTab)}
				value={tab}
			>
				<TabsList
					className="w-full rounded-none border-border border-b p-0"
					variant="line"
				>
					<TabsTrigger value="insert">Insert</TabsTrigger>
					<TabsTrigger value="document">Document</TabsTrigger>
					<TabsTrigger value="references">References</TabsTrigger>
				</TabsList>
				<TabsContent className="p-3" value="insert">
					<InsertPanel
						actions={actions}
						context={actionContext}
						editor={editor}
					/>
				</TabsContent>
				<TabsContent className="p-3" value="document">
					<DocumentPanel
						details={details}
						document={document}
						editor={editor}
						headings={headings}
						organization={organization}
						tags={tags}
					/>
				</TabsContent>
				<TabsContent className="p-3" value="references">
					<ReferencesPanel
						actions={actions}
						context={actionContext}
						editor={editor}
						references={references}
					/>
				</TabsContent>
			</Tabs>
		</div>
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
		description: string;
		id: EditorActionId;
		icon: typeof Table2Icon;
		label: string;
	}[] = [
		{
			description: "Insert a table into your document",
			icon: Table2Icon,
			id: "table",
			label: "Table",
		},
		{
			description: "Add a visual section divider",
			icon: MinusIcon,
			id: "divider",
			label: "Divider",
		},
		{
			description: "Insert a Scripture reference",
			icon: BookOpenIcon,
			id: "bible",
			label: "Bible Passage",
		},
		{
			description: "Add a citation or source",
			icon: QuoteIcon,
			id: "citation",
			label: "Citation",
		},
	];
	const available = new Set(actions.map((action) => action.id));
	return (
		<div className="grid gap-1">
			{items
				.filter((item) => available.has(item.id))
				.map(({ description, icon: Icon, id, label }) => (
					<button
						className="flex items-start gap-2 rounded-sm px-2 py-2 text-left hover:bg-muted disabled:opacity-40"
						disabled={!editor}
						key={id}
						onClick={() =>
							editor && void executeEditorAction(editor, id, context)
						}
						type="button"
					>
						<Icon
							aria-hidden="true"
							className="mt-0.5 size-4 text-muted-foreground"
						/>
						<span className="grid gap-0.5">
							<span className="font-medium text-foreground text-xs">
								{label}
							</span>
							<span className="text-muted-foreground text-xs">
								{description}
							</span>
						</span>
					</button>
				))}
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
	if (position !== null)
		editor
			?.chain()
			.focus()
			.setTextSelection(position + 1)
			.scrollIntoView()
			.run();
}
function focusStructuredNode(
	editor: Editor | null,
	type: "bibleReference" | "citation",
	index: number,
) {
	const position = findNodePosition(editor, type, index);
	if (position !== null)
		editor?.chain().focus().setNodeSelection(position).scrollIntoView().run();
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
