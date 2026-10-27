import { Button } from "@berean-study/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { Input } from "@berean-study/ui/components/input";
import {
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon,
	BoldIcon,
	BookOpenIcon,
	ChevronDownIcon,
	CodeIcon,
	EllipsisIcon,
	HeadingIcon,
	ItalicIcon,
	LinkIcon,
	ListChecksIcon,
	ListIcon,
	ListOrderedIcon,
	Maximize2Icon,
	MinusIcon,
	QuoteIcon,
	Redo2Icon,
	StrikethroughIcon,
	Table2Icon,
	Trash2Icon,
	UnderlineIcon,
	Undo2Icon,
	UserRoundIcon,
} from "lucide-react";
import {
	type FocusEvent,
	type FormEvent,
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { keepEditorFocus } from "./docked-toolbar";
import {
	type CitationRequest,
	createEditorCommandCatalog,
	type EditorCommand,
	type EditorCommandCatalog,
	type ReferenceRequest,
	type VerseRequest,
} from "./editor-actions";
import {
	type EditorSessionState,
	type EditorToolbarSession,
	useEditorSessionState,
} from "./editor-session";
import type { EditorToolbarVariant, RichTextEditorPreset } from "./types";
import { useKeyboardDock } from "./use-keyboard-dock";

const toolbarItemClassName =
	"inline-flex h-9 shrink-0 pointer-coarse:h-11 items-center justify-center gap-1.5 rounded-lg text-secondary-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-secondary aria-pressed:text-foreground [&_svg]:size-4.5";

export function EditorToolbar({
	session,
	onExpand,
	onRequestBibleReference,
	onRequestCitation,
	onRequestVerse,
	preset,
	variant = "full",
}: {
	session: EditorToolbarSession;
	/** Shows an "Open full-screen editor" button at the end of the toolbar. */
	onExpand?: () => void;
	onRequestBibleReference?: ReferenceRequest;
	onRequestCitation?: CitationRequest;
	onRequestVerse?: VerseRequest;
	preset: RichTextEditorPreset;
	variant?: EditorToolbarVariant;
}) {
	const catalog = useMemo(
		() =>
			createEditorCommandCatalog({
				onRequestBibleReference,
				onRequestCitation,
				onRequestVerse,
				preset,
			}),
		[onRequestBibleReference, onRequestCitation, onRequestVerse, preset],
	);
	const listCommands = catalog
		.commands("structure")
		.filter(
			(command) =>
				command.id !== "quote" &&
				(variant === "full" || command.id !== "checklist"),
		);
	const quoteCommand = catalog.find("quote");
	const headingCommand = catalog.find("heading2");
	const verseCommand = catalog.find("verse");
	const state = useEditorSessionState(session);
	const roving = useRovingToolbar();
	const dock = useKeyboardDock(roving.ref, variant !== "full");

	return (
		<div
			aria-label="Formatting"
			// Inline-size containment keeps the one-line toolbar from widening
			// the page on narrow screens; it scrolls sideways instead. The
			// simpler toolbars are short enough to wrap onto a second line.
			className={`sticky top-0 z-10 flex items-center gap-0.5 border-border/70 border-b bg-card px-2 py-1.5 ${
				variant === "full"
					? "flex-nowrap overflow-x-auto [contain:inline-size]"
					: "flex-wrap"
			} ${dock.isDocked ? "!fixed inset-x-0 z-50 border-t shadow-md" : ""}`}
			onFocus={roving.onFocus}
			onKeyDown={roving.onKeyDown}
			ref={roving.ref}
			role="toolbar"
			style={dock.style}
		>
			{variant === "compact" ? null : (
				<BlockFormatMenu
					catalog={catalog}
					session={session}
					simple={variant === "simple"}
					state={state}
				/>
			)}
			{variant === "compact" ? null : <ToolbarSeparator />}
			<ToolbarButton
				active={state.isBold}
				label="Bold"
				onClick={() => session.toggleMark("bold")}
			>
				<BoldIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.isItalic}
				label="Italic"
				onClick={() => session.toggleMark("italic")}
			>
				<ItalicIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.isUnderline}
				label="Underline"
				onClick={() => session.toggleMark("underline")}
			>
				<UnderlineIcon aria-hidden="true" />
			</ToolbarButton>
			{variant === "compact" ? null : (
				<ToolbarButton
					active={state.isHighlight}
					label="Highlight"
					onClick={() => session.toggleMark("highlight")}
				>
					<span
						aria-hidden="true"
						className="flex size-4.5 items-center justify-center rounded-lg bg-highlight font-semibold text-foreground text-xs"
					>
						A
					</span>
				</ToolbarButton>
			)}
			<ToolbarSeparator />
			{variant === "compact" && headingCommand ? (
				<ToolbarButton
					active={state.activeHeading === 2}
					label="Heading"
					onClick={() => void headingCommand.execute(session)}
				>
					<HeadingIcon aria-hidden="true" />
				</ToolbarButton>
			) : null}
			{listCommands.map((command) => {
				const Icon = listCommandIcon(command.id);
				return (
					<ToolbarButton
						active={isListCommandActive(command.id, state.activeBlock)}
						key={command.id}
						label={command.label}
						onClick={() => void command.execute(session)}
					>
						<Icon aria-hidden="true" />
					</ToolbarButton>
				);
			})}
			{variant !== "full" && quoteCommand ? (
				<ToolbarButton
					active={state.activeBlock === "blockquote"}
					label="Quote"
					onClick={() => void quoteCommand.execute(session)}
				>
					<QuoteIcon aria-hidden="true" />
				</ToolbarButton>
			) : null}
			{variant === "simple" ? (
				<LinkControl active={state.isLink} session={session} />
			) : null}
			{variant === "full" ? <ToolbarSeparator /> : null}
			{variant === "full" ? (
				<LinkControl active={state.isLink} session={session} />
			) : null}
			{variant === "full" ? null : <ToolbarSeparator />}
			{verseCommand ? (
				<button
					className={`${toolbarItemClassName} bg-scripture px-2.5 font-medium text-scripture-foreground text-sm hover:bg-scripture/80 [&_svg]:size-4`}
					data-toolbar-item
					onClick={() => void verseCommand.execute(session)}
					type="button"
				>
					<BookOpenIcon aria-hidden="true" />
					{variant === "simple" ? "Insert verse" : "Verse"}
				</button>
			) : null}
			{variant === "compact" ? (
				<LinkControl active={state.isLink} session={session} />
			) : null}
			{variant === "full" ? (
				<MoreMenu catalog={catalog} session={session} state={state} />
			) : null}
			<span className="min-w-2 flex-1" />
			{variant === "compact" ? null : (
				<>
					<ToolbarButton
						disabled={!state.canUndo}
						label="Undo"
						onClick={session.undo}
					>
						<Undo2Icon aria-hidden="true" />
					</ToolbarButton>
					<ToolbarButton
						disabled={!state.canRedo}
						label="Redo"
						onClick={session.redo}
					>
						<Redo2Icon aria-hidden="true" />
					</ToolbarButton>
				</>
			)}
			{onExpand ? (
				<ToolbarButton label="Open full-screen editor" onClick={onExpand}>
					<Maximize2Icon aria-hidden="true" />
				</ToolbarButton>
			) : null}
		</div>
	);
}

/**
 * Implements the toolbar roving-tabindex pattern: the toolbar is one tab stop
 * and the arrow, Home and End keys move between its controls.
 */
function useRovingToolbar() {
	const ref = useRef<HTMLDivElement>(null);
	const activeIndex = useRef(0);
	const getItems = () =>
		Array.from(
			ref.current?.querySelectorAll<HTMLElement>(
				"[data-toolbar-item]:not(:disabled)",
			) ?? [],
		);
	const syncTabStops = () => {
		const items = getItems();
		const current = Math.min(activeIndex.current, items.length - 1);
		items.forEach((item, index) => {
			item.tabIndex = index === current ? 0 : -1;
		});
	};

	// Controls re-render as editor state changes, so tab stops are re-applied
	// after every render rather than once on mount.
	useEffect(syncTabStops);

	return {
		onFocus: (event: FocusEvent<HTMLDivElement>) => {
			const index = getItems().indexOf(event.target as HTMLElement);
			if (index === -1) return;
			activeIndex.current = index;
			syncTabStops();
		},
		onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
			const items = getItems();
			const index = items.indexOf(event.target as HTMLElement);
			if (index === -1) return;
			const nextIndex = {
				ArrowLeft: (index - 1 + items.length) % items.length,
				ArrowRight: (index + 1) % items.length,
				End: items.length - 1,
				Home: 0,
			}[event.key];
			if (nextIndex === undefined) return;
			event.preventDefault();
			items[nextIndex]?.focus();
		},
		ref,
	};
}

function BlockFormatMenu({
	catalog,
	session,
	simple = false,
	state,
}: {
	catalog: EditorCommandCatalog;
	session: EditorToolbarSession;
	/** Offers only Paragraph, Heading and Quote. */
	simple?: boolean;
	state: EditorSessionState;
}) {
	const quoteCommand = catalog.find("quote");
	const commands = [
		...catalog
			.commands("block")
			.filter(
				(command) =>
					!simple || command.id === "paragraph" || command.id === "heading2",
			)
			.map((command) =>
				simple && command.id === "heading2"
					? { ...command, label: "Heading" }
					: command,
			),
		...(quoteCommand ? [quoteCommand] : []),
	];
	const activeId = activeBlockFormat(state);
	const activeLabel =
		commands.find((command) => command.id === activeId)?.label ?? "Paragraph";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={`Text style: ${activeLabel}`}
				className={`${toolbarItemClassName} min-w-28 justify-between px-2.5 text-sm [&_svg]:size-3.5`}
				data-toolbar-item
			>
				{activeLabel}
				<ChevronDownIcon aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-44 p-1" sideOffset={6}>
				<DropdownMenuGroup>
					{commands.map((command) => (
						<EditorMenuItem
							active={command.id === activeId}
							key={command.id}
							label={command.label}
							onSelect={() => void command.execute(session)}
						/>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MoreMenu({
	catalog,
	session,
	state,
}: {
	catalog: EditorCommandCatalog;
	session: EditorToolbarSession;
	state: EditorSessionState;
}) {
	const insertCommands = catalog
		.commands("insert")
		.filter((command) => command.id !== "verse");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="More formatting"
				className={`${toolbarItemClassName} w-9`}
				data-toolbar-item
			>
				<EllipsisIcon aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-52 p-1" sideOffset={6}>
				<DropdownMenuGroup>
					<EditorMenuItem
						active={state.isStrike}
						icon={StrikethroughIcon}
						label="Strikethrough"
						onSelect={() => session.toggleMark("strike")}
					/>
					<EditorMenuItem
						active={state.isCode}
						icon={CodeIcon}
						label="Code"
						onSelect={() => session.toggleMark("code")}
					/>
					{insertCommands.map((command) => (
						<EditorMenuItem
							active={
								(command.id === "bible" && state.isBibleReference) ||
								(command.id === "citation" && state.isCitation)
							}
							icon={insertCommandIcon(command.id)}
							key={command.id}
							label={command.label}
							onSelect={() => void command.execute(session)}
						/>
					))}
				</DropdownMenuGroup>
				<DropdownMenuSeparator className="my-1" />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Paragraph alignment</DropdownMenuLabel>
					<EditorMenuItem
						icon={AlignLeftIcon}
						label="Align left"
						onSelect={() => session.setTextAlignment("left")}
					/>
					<EditorMenuItem
						icon={AlignCenterIcon}
						label="Align center"
						onSelect={() => session.setTextAlignment("center")}
					/>
					<EditorMenuItem
						icon={AlignRightIcon}
						label="Align right"
						onSelect={() => session.setTextAlignment("right")}
					/>
				</DropdownMenuGroup>
				{state.isTable ? <TableMenu session={session} /> : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function TableMenu({ session }: { session: EditorToolbarSession }) {
	return (
		<>
			<DropdownMenuSeparator className="my-1" />
			<DropdownMenuGroup>
				<DropdownMenuLabel>Table</DropdownMenuLabel>
				<EditorMenuItem
					label="Add row"
					onSelect={() => session.updateTable("addRow")}
				/>
				<EditorMenuItem
					label="Remove row"
					onSelect={() => session.updateTable("deleteRow")}
				/>
				<EditorMenuItem
					label="Add column"
					onSelect={() => session.updateTable("addColumn")}
				/>
				<EditorMenuItem
					label="Remove column"
					onSelect={() => session.updateTable("deleteColumn")}
				/>
				<EditorMenuItem
					label="Toggle header row"
					onSelect={() => session.updateTable("toggleHeaderRow")}
				/>
				<EditorMenuItem
					label="Toggle header column"
					onSelect={() => session.updateTable("toggleHeaderColumn")}
				/>
				<EditorMenuItem
					destructive
					icon={Trash2Icon}
					label="Delete table"
					onSelect={() => session.updateTable("delete")}
				/>
			</DropdownMenuGroup>
		</>
	);
}

function EditorMenuItem({
	active = false,
	destructive = false,
	icon: Icon,
	label,
	onSelect,
}: {
	active?: boolean;
	destructive?: boolean;
	icon?: typeof BoldIcon;
	label: string;
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem
			onClick={onSelect}
			variant={destructive ? "destructive" : "default"}
		>
			{Icon ? <Icon aria-hidden="true" /> : null}
			<span className={active ? "font-semibold" : undefined}>{label}</span>
		</DropdownMenuItem>
	);
}

function ToolbarSeparator() {
	return (
		<span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />
	);
}

function LinkControl({
	active,
	session,
}: {
	active: boolean;
	session: EditorToolbarSession;
}) {
	const [open, setOpen] = useState(false);
	const [href, setHref] = useState("");
	const [error, setError] = useState<string | null>(null);
	const close = () => {
		setError(null);
		setOpen(false);
	};
	const save = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const normalizedHref = normalizeLink(href);
		if (!normalizedHref) {
			setError("Enter a valid http, https, or mailto link.");
			return;
		}
		session.applyLink(normalizedHref);
		close();
	};
	return (
		<>
			<ToolbarButton
				active={active}
				label="Link"
				onClick={() => {
					setHref(session.getLinkHref());
					setError(null);
					setOpen(true);
				}}
			>
				<LinkIcon aria-hidden="true" />
			</ToolbarButton>
			<Dialog onOpenChange={(nextOpen) => !nextOpen && close()} open={open}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add link</DialogTitle>
						<DialogDescription>
							Paste the web address to apply to the selected text.
						</DialogDescription>
					</DialogHeader>
					<form aria-label="Link editor" className="grid gap-3" onSubmit={save}>
						<Input
							aria-label="Link URL"
							autoFocus
							onChange={(event) => {
								setError(null);
								setHref(event.target.value);
							}}
							placeholder="https://example.com"
							value={href}
						/>
						{error ? <p className="text-destructive text-xs">{error}</p> : null}
						<DialogFooter>
							<Button onClick={close} type="button" variant="ghost">
								Cancel
							</Button>
							{active ? (
								<Button
									onClick={() => {
										session.removeLink();
										close();
									}}
									type="button"
									variant="destructive"
								>
									Remove
								</Button>
							) : null}
							<Button type="submit">Save link</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}

function ToolbarButton({
	active = false,
	children,
	disabled = false,
	label,
	onClick,
}: {
	active?: boolean;
	children: ReactNode;
	disabled?: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			aria-label={label}
			aria-pressed={active}
			className={`${toolbarItemClassName} pointer-coarse:w-11 w-9`}
			data-toolbar-item
			disabled={disabled}
			onClick={onClick}
			onMouseDown={keepEditorFocus}
			title={label}
			type="button"
		>
			{children}
		</button>
	);
}

function activeBlockFormat(state: EditorSessionState): EditorCommand["id"] {
	if (state.activeHeading) return `heading${state.activeHeading}`;
	if (state.activeBlock === "blockquote") return "quote";
	return "paragraph";
}

function isListCommandActive(
	id: EditorCommand["id"],
	activeBlock: EditorSessionState["activeBlock"],
) {
	return (
		(id === "bullet" && activeBlock === "bulletList") ||
		(id === "numbered" && activeBlock === "orderedList") ||
		(id === "checklist" && activeBlock === "taskList")
	);
}

function listCommandIcon(id: EditorCommand["id"]) {
	switch (id) {
		case "numbered":
			return ListOrderedIcon;
		case "checklist":
			return ListChecksIcon;
		default:
			return ListIcon;
	}
}

function insertCommandIcon(id: EditorCommand["id"]) {
	switch (id) {
		case "divider":
			return MinusIcon;
		case "bible":
			return BookOpenIcon;
		case "citation":
			return QuoteIcon;
		case "person":
			return UserRoundIcon;
		default:
			return Table2Icon;
	}
}

function normalizeLink(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const href = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;
	try {
		return ["http:", "https:", "mailto:"].includes(new URL(href).protocol)
			? href
			: null;
	} catch {
		return null;
	}
}
