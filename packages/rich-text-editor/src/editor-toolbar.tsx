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
	EllipsisIcon,
	ItalicIcon,
	LinkIcon,
	ListIcon,
	ListOrderedIcon,
	MinusIcon,
	QuoteIcon,
	Redo2Icon,
	StrikethroughIcon,
	Table2Icon,
	Trash2Icon,
	UnderlineIcon,
	Undo2Icon,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

import {
	type CitationRequest,
	createEditorCommandCatalog,
	type EditorCommand,
	type ReferenceRequest,
} from "./editor-actions";
import {
	type EditorSession,
	type EditorSessionState,
	useEditorSessionState,
} from "./editor-session";
import type { RichTextEditorPreset } from "./types";

export function EditorToolbar({
	session,
	onRequestBibleReference,
	onRequestCitation,
	preset,
}: {
	session: EditorSession;
	onRequestBibleReference?: ReferenceRequest;
	onRequestCitation?: CitationRequest;
	preset: RichTextEditorPreset;
}) {
	const catalog = useMemo(
		() =>
			createEditorCommandCatalog({
				onRequestBibleReference,
				onRequestCitation,
				preset,
			}),
		[onRequestBibleReference, onRequestCitation, preset],
	);
	const blockCommands = catalog.commands("block");
	const structureCommands = catalog.commands("structure");
	const insertCommands = catalog.commands("insert");
	const state = useEditorSessionState(session);

	return (
		<div
			aria-label="Writing tools"
			className="flex flex-wrap items-center gap-1 border-border border-b bg-secondary/45 px-2 py-2"
			role="toolbar"
		>
			<ToolbarGroup label="Text style">
				<select
					aria-label="Text style"
					className="h-7 min-w-25 rounded-sm bg-transparent px-2 text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
					onChange={(event) => {
						const command = catalog.find(event.target.value);
						if (command) void command.execute(session);
					}}
					value={blockFormatValue(state.activeHeading)}
				>
					{blockCommands.map((command) => (
						<option key={command.id} value={command.id}>
							{command.label}
						</option>
					))}
				</select>
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
				<ToolbarButton
					active={state.isStrike}
					label="Strikethrough"
					onClick={() => session.toggleMark("strike")}
				>
					<StrikethroughIcon aria-hidden="true" />
				</ToolbarButton>
				<LinkControl active={state.isLink} session={session} />
			</ToolbarGroup>

			<ToolbarGroup label="Structure">
				{structureCommands.map((command) => {
					const Icon = structureCommandIcon(command.id);
					return (
						<ToolbarButton
							active={isStructureCommandActive(command.id, state.activeBlock)}
							key={command.id}
							label={command.label}
							onClick={() => void command.execute(session)}
						>
							<Icon aria-hidden="true" />
						</ToolbarButton>
					);
				})}
			</ToolbarGroup>

			<InsertMenu
				commands={insertCommands}
				session={session}
				isBibleReference={state.isBibleReference}
				isCitation={state.isCitation}
			/>
			<MoreMenu session={session} isTable={state.isTable} />
			<div className="ml-auto flex items-center gap-0.5">
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
			</div>
		</div>
	);
}

function InsertMenu({
	commands,
	session,
	isBibleReference,
	isCitation,
}: {
	commands: readonly EditorCommand[];
	session: EditorSession;
	isBibleReference: boolean;
	isCitation: boolean;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Insert content"
				className="inline-flex h-7 items-center gap-1 rounded-sm border border-border/70 bg-background/70 px-2 font-medium text-xs outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50"
			>
				Insert <ChevronDownIcon aria-hidden="true" className="size-3" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-52 p-1" sideOffset={6}>
				<DropdownMenuGroup>
					<DropdownMenuLabel>
						Bring something into your writing
					</DropdownMenuLabel>
					{commands.map((command) => {
						const Icon = insertCommandIcon(command.id);
						return (
							<EditorMenuItem
								active={
									(command.id === "bible" && isBibleReference) ||
									(command.id === "citation" && isCitation)
								}
								icon={Icon}
								key={command.id}
								label={insertCommandLabel(command, {
									isBibleReference,
									isCitation,
								})}
								onSelect={() => void command.execute(session)}
							/>
						);
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MoreMenu({
	session,
	isTable,
}: {
	session: EditorSession;
	isTable: boolean;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="More writing tools"
				className="inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
			>
				<EllipsisIcon aria-hidden="true" className="size-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-48 p-1" sideOffset={6}>
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
				{isTable ? <TableMenu session={session} /> : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function TableMenu({ session }: { session: EditorSession }) {
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

function ToolbarGroup({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	return (
		<fieldset
			aria-label={label}
			className="m-0 flex min-w-0 items-center gap-0.5 rounded-sm border border-border/65 bg-background/70 p-0.5"
		>
			{children}
		</fieldset>
	);
}

function LinkControl({
	active,
	session,
}: {
	active: boolean;
	session: EditorSession;
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
				label="Add or edit link"
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
			className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-primary aria-pressed:text-primary-foreground [&_svg]:size-3.5"
			disabled={disabled}
			onClick={onClick}
			title={label}
			type="button"
		>
			{children}
		</button>
	);
}

function blockFormatValue(activeHeading: 2 | 3 | null) {
	return activeHeading ? `heading${activeHeading}` : "paragraph";
}

function isStructureCommandActive(
	id: EditorCommand["id"],
	activeBlock: EditorSessionState["activeBlock"],
) {
	return (
		(id === "bullet" && activeBlock === "bulletList") ||
		(id === "numbered" && activeBlock === "orderedList") ||
		(id === "quote" && activeBlock === "blockquote")
	);
}

function structureCommandIcon(id: EditorCommand["id"]) {
	switch (id) {
		case "bullet":
			return ListIcon;
		case "numbered":
			return ListOrderedIcon;
		case "quote":
			return QuoteIcon;
		default:
			return QuoteIcon;
	}
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

function insertCommandLabel(
	command: EditorCommand,
	state: { isBibleReference: boolean; isCitation: boolean },
) {
	if (command.id === "bible" && state.isBibleReference)
		return `Replace ${command.label.toLowerCase()}`;
	if (command.id === "citation" && state.isCitation)
		return `Replace ${command.label.toLowerCase()}`;
	return command.label;
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
