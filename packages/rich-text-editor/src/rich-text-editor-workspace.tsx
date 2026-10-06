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
	createEditorCommandCatalog,
	type EditorCommand,
	type EditorCommandCatalog,
	type EditorCommandContext,
} from "./editor-actions";
import type { EditorSession } from "./editor-session";
import { RichTextEditor } from "./rich-text-editor";
import type { RichTextDocument, RichTextEditorWorkspaceProps } from "./types";

type InspectorTab = "insert" | "document" | "references";
type InspectorSlots = NonNullable<
	RichTextEditorWorkspaceProps["slots"]
>["inspector"];

/**
 * Optional writing shell around RichTextEditor. Resource-specific metadata is
 * supplied by the host, while document-derived information stays in sync with
 * the editor's structured JSON.
 */
export function RichTextEditorWorkspace({
	onChange,
	onSessionReady,
	onRequestBibleReference,
	onRequestCitation,
	presentation = "default",
	preset = "member",
	slots,
	value,
	...editorProps
}: RichTextEditorWorkspaceProps) {
	const [session, setSession] = useState<EditorSession | null>(null);
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
	const handleSessionReady = useCallback(
		(nextSession: EditorSession | null) => {
			setSession(nextSession);
			onSessionReady?.(nextSession);
		},
		[onSessionReady],
	);
	const commandContext = useMemo(
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
	const inspectorPlacement = getInspectorPlacement({
		isFocused,
		isFocusedInspectorOpen,
		isWideLayout,
	});
	const inspector = (
		<WorkspaceInspector
			commandContext={commandContext}
			document={document}
			session={session}
			onTabChange={setInspectorTab}
			slots={slots?.inspector}
			tab={inspectorTab}
		/>
	);

	return (
		<section
			aria-label="Editor workspace"
			className={
				isFocused
					? "fixed inset-0 z-50 flex min-h-dvh flex-col overflow-hidden bg-background text-foreground"
					: "min-w-0"
			}
			data-focused={isFocused || undefined}
			data-presentation={presentation}
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
					{slots?.focusedHeader?.title}
				</div>
				<div className="flex items-center gap-2">
					{slots?.focusedHeader?.status ? (
						<div className="text-muted-foreground text-xs">
							{slots.focusedHeader.status}
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
						: "grid min-w-0 gap-2.5 lg:grid-cols-[minmax(0,1fr)_16.5rem]"
				}
			>
				<div
					className={
						isFocused
							? "mx-auto w-full min-w-0 max-w-208 overflow-y-auto px-4 py-6 sm:px-6"
							: presentation === "composer"
								? "min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
								: "min-w-0"
					}
				>
					{!isFocused && slots?.editorHeader ? (
						<div className="p-4 pb-3">{slots.editorHeader}</div>
					) : null}
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
						className={
							presentation === "composer"
								? "rounded-none border-x-0 border-b-0"
								: undefined
						}
						onChange={handleChange}
						onSessionReady={handleSessionReady}
						onRequestBibleReference={onRequestBibleReference}
						onRequestCitation={onRequestCitation}
						preset={preset}
						value={value}
					/>
				</div>
				{inspectorPlacement === "inline-rail" ? (
					<InlineInspectorRail footer={slots?.inspector?.footer}>
						{inspector}
					</InlineInspectorRail>
				) : null}
				{inspectorPlacement === "focused-rail" ? (
					<FocusedInspectorRail>{inspector}</FocusedInspectorRail>
				) : null}
			</div>
			{inspectorPlacement === "sheet" ? (
				<InspectorSheet
					onOpenChange={setInspectorSheetOpen}
					open={inspectorSheetOpen}
				>
					{inspector}
				</InspectorSheet>
			) : null}
		</section>
	);
}

type InspectorPlacement = "focused-rail" | "inline-rail" | "sheet" | null;

function getInspectorPlacement({
	isFocused,
	isFocusedInspectorOpen,
	isWideLayout,
}: {
	isFocused: boolean;
	isFocusedInspectorOpen: boolean;
	isWideLayout: boolean;
}): InspectorPlacement {
	if (!isWideLayout) return "sheet";
	if (!isFocused) return "inline-rail";
	return isFocusedInspectorOpen ? "focused-rail" : null;
}

function InlineInspectorRail({
	children,
	footer,
}: {
	children: React.ReactNode;
	footer?: React.ReactNode;
}) {
	return (
		<aside className="hidden min-h-0 flex-col gap-2.5 lg:flex">
			<div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
				{children}
			</div>
			{footer}
		</aside>
	);
}

function FocusedInspectorRail({ children }: { children: React.ReactNode }) {
	return (
		<aside className="w-72 shrink-0 overflow-y-auto border-border border-l bg-card">
			{children}
		</aside>
	);
}

function InspectorSheet({
	children,
	onOpenChange,
	open,
}: {
	children: React.ReactNode;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle>Writing tools</SheetTitle>
				</SheetHeader>
				<div className="min-h-0 overflow-y-auto">{children}</div>
			</SheetContent>
		</Sheet>
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
	commandContext,
	document,
	session,
	onTabChange,
	slots,
	tab,
}: {
	commandContext: EditorCommandContext;
	document: RichTextDocument;
	session: EditorSession | null;
	onTabChange: (tab: InspectorTab) => void;
	slots?: InspectorSlots;
	tab: InspectorTab;
}) {
	const headings = useMemo(() => extractDocumentHeadings(document), [document]);
	const references = useMemo(() => getDocumentReferences(document), [document]);
	const catalog = useMemo(
		() => createEditorCommandCatalog(commandContext),
		[commandContext],
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
						commands={catalog.commands("insert")}
						session={session}
					/>
				</TabsContent>
				<TabsContent className="p-3" value="document">
					<DocumentPanel
						document={document}
						session={session}
						headings={headings}
						slots={slots}
					/>
				</TabsContent>
				<TabsContent className="p-3" value="references">
					<ReferencesPanel
						catalog={catalog}
						session={session}
						references={references}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function InsertPanel({
	commands,
	session,
}: {
	commands: readonly EditorCommand[];
	session: EditorSession | null;
}) {
	return (
		<div className="grid gap-1.5">
			{commands.map((command) => {
				const Icon = insertCommandIcon(command.id);
				return (
					<button
						className="flex items-start gap-2 rounded-sm border border-border/70 bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40"
						disabled={!session}
						key={command.id}
						onClick={() => session && void command.execute(session)}
						type="button"
					>
						<Icon
							aria-hidden="true"
							className="mt-0.5 size-4 text-muted-foreground"
						/>
						<span className="grid flex-1 gap-0.5">
							<span className="font-medium text-foreground text-sm">
								{command.label}
							</span>
							<span className="text-muted-foreground text-xs">
								{command.description}
							</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}

function insertCommandIcon(id: EditorCommand["id"]) {
	switch (id) {
		case "table":
			return Table2Icon;
		case "divider":
			return MinusIcon;
		case "bible":
			return BookOpenIcon;
		case "citation":
			return QuoteIcon;
		default:
			return Table2Icon;
	}
}

function DocumentPanel({
	document,
	session,
	headings,
	slots,
}: {
	document: RichTextDocument;
	session: EditorSession | null;
	headings: ReturnType<typeof extractDocumentHeadings>;
	slots?: InspectorSlots;
}) {
	return (
		<div className="space-y-5 text-xs">
			<Section title="Outline">
				{headings.length ? (
					headings.map((heading, index) => (
						<button
							className="block w-full truncate rounded-sm py-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							key={heading.id}
							onClick={() => session?.focusHeading(index)}
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
			{slots?.tags ? <Section title="Tags">{slots.tags}</Section> : null}
			{slots?.organization ? (
				<Section title="Organization">{slots.organization}</Section>
			) : null}
			{slots?.details ? (
				<Section title="Details">{slots.details}</Section>
			) : null}
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
	catalog,
	session,
	references,
}: {
	catalog: EditorCommandCatalog;
	session: EditorSession | null;
	references: ReturnType<typeof getDocumentReferences>;
}) {
	const bibleCommand = catalog.find("bible");
	const citationCommand = catalog.find("citation");
	return (
		<div className="space-y-5 text-xs">
			<Section title="Scripture">
				{references.bibleReferences.length ? (
					references.bibleReferences.map((reference, index) => (
						<ReferenceRow
							session={session}
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
			{citationCommand ? (
				<Section title="Citations">
					{references.citations.length ? (
						references.citations.map((citation, index) => (
							<ReferenceRow
								session={session}
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
				{bibleCommand ? (
					<ActionButton command={bibleCommand} session={session} />
				) : null}
				{citationCommand ? (
					<ActionButton command={citationCommand} session={session} />
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
	command,
	session,
}: {
	command: EditorCommand;
	session: EditorSession | null;
}) {
	return (
		<button
			className="rounded-sm px-2 py-1 text-left text-primary hover:bg-primary/10 disabled:opacity-40"
			disabled={!session}
			onClick={() => session && void command.execute(session)}
			type="button"
		>
			Add {command.label.toLowerCase()}
		</button>
	);
}
function ReferenceRow({
	session,
	index,
	label,
	type,
}: {
	session: EditorSession | null;
	index: number;
	label: string;
	type: "bibleReference" | "citation";
}) {
	return (
		<div className="flex items-center gap-1 rounded-sm hover:bg-muted">
			<button
				className="min-w-0 flex-1 truncate px-2 py-1 text-left disabled:opacity-40"
				disabled={!session}
				onClick={() => session?.focusStructuredNode(type, index)}
				type="button"
			>
				{label}
			</button>
			<button
				aria-label={`Remove ${label}`}
				className="px-2 py-1 text-destructive text-xs hover:bg-destructive/10 disabled:opacity-40"
				disabled={!session}
				onClick={() => session?.deleteStructuredNode(type, index)}
				type="button"
			>
				Remove
			</button>
		</div>
	);
}
