import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon,
	BoldIcon,
	BookOpenIcon,
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
import {
	type FormEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	type CitationRequest,
	type EditorActionContext,
	executeEditorAction,
	type ReferenceRequest,
} from "./editor-actions";
import type { RichTextEditorPreset } from "./types";

type ToolbarState = {
	activeAlignment: "left" | "center" | "right" | null;
	activeBlock: "blockquote" | "bulletList" | "orderedList" | null;
	activeHeading: 2 | 3 | null;
	canRedo: boolean;
	canUndo: boolean;
	isBold: boolean;
	isBibleReference: boolean;
	isCitation: boolean;
	isItalic: boolean;
	isLink: boolean;
	isStrike: boolean;
	isUnderline: boolean;
	isTable: boolean;
};

export function EditorToolbar({
	editor,
	onRequestBibleReference,
	onRequestCitation,
	preset,
}: {
	editor: Editor;
	onRequestBibleReference?: ReferenceRequest;
	onRequestCitation?: CitationRequest;
	preset: RichTextEditorPreset;
}) {
	const actionContext: EditorActionContext = {
		onRequestBibleReference,
		onRequestCitation,
		preset,
	};
	const state = useEditorState({
		editor,
		selector: ({ editor: currentEditor }): ToolbarState => ({
			activeAlignment: getActiveAlignment(currentEditor),
			activeBlock: getActiveBlock(currentEditor),
			activeHeading: getActiveHeading(currentEditor),
			canRedo: currentEditor.can().redo(),
			canUndo: currentEditor.can().undo(),
			isBold: currentEditor.isActive("bold"),
			isBibleReference: currentEditor.isActive("bibleReference"),
			isCitation: currentEditor.isActive("citation"),
			isItalic: currentEditor.isActive("italic"),
			isLink: currentEditor.isActive("link"),
			isStrike: currentEditor.isActive("strike"),
			isUnderline: currentEditor.isActive("underline"),
			isTable: currentEditor.isActive("table"),
		}),
	});

	return (
		<div
			aria-label="Rich text formatting"
			className="flex flex-wrap items-center gap-0.5 border-border border-b bg-muted/35 px-2 py-1.5"
			role="toolbar"
		>
			<select
				aria-label="Block format"
				className="h-7 rounded-sm border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				onChange={(event) =>
					void executeEditorAction(
						editor,
						blockFormatAction(event.target.value),
						actionContext,
					)
				}
				value={blockFormatValue(state.activeHeading)}
			>
				<option value="paragraph">Paragraph</option>
				<option value="heading-2">Heading 2</option>
				<option value="heading-3">Heading 3</option>
			</select>
			<ToolbarSeparator />
			<ToolbarButton
				active={state.isBold}
				label="Bold"
				onClick={() => editor.chain().focus().toggleBold().run()}
			>
				<BoldIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.isItalic}
				label="Italic"
				onClick={() => editor.chain().focus().toggleItalic().run()}
			>
				<ItalicIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.isUnderline}
				label="Underline"
				onClick={() => editor.chain().focus().toggleUnderline().run()}
			>
				<UnderlineIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.isStrike}
				label="Strikethrough"
				onClick={() => editor.chain().focus().toggleStrike().run()}
			>
				<StrikethroughIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarSeparator />
			<ToolbarButton
				active={state.activeAlignment === "left"}
				label="Align left"
				onClick={() => editor.chain().focus().setTextAlign("left").run()}
			>
				<AlignLeftIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.activeAlignment === "center"}
				label="Align center"
				onClick={() => editor.chain().focus().setTextAlign("center").run()}
			>
				<AlignCenterIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.activeAlignment === "right"}
				label="Align right"
				onClick={() => editor.chain().focus().setTextAlign("right").run()}
			>
				<AlignRightIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarSeparator />
			<ToolbarButton
				active={state.activeBlock === "bulletList"}
				label="Bulleted list"
				onClick={() =>
					void executeEditorAction(editor, "bullet", actionContext)
				}
			>
				<ListIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.activeBlock === "orderedList"}
				label="Numbered list"
				onClick={() =>
					void executeEditorAction(editor, "numbered", actionContext)
				}
			>
				<ListOrderedIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.activeBlock === "blockquote"}
				label="Blockquote"
				onClick={() => void executeEditorAction(editor, "quote", actionContext)}
			>
				<QuoteIcon aria-hidden="true" />
			</ToolbarButton>
			<LinkControl active={state.isLink} editor={editor} />
			<ToolbarButton
				label="Insert horizontal divider"
				onClick={() =>
					void executeEditorAction(editor, "divider", actionContext)
				}
			>
				<MinusIcon aria-hidden="true" />
			</ToolbarButton>
			<TableControls
				actionContext={actionContext}
				editor={editor}
				isTable={state.isTable}
			/>
			{onRequestBibleReference ? (
				<ToolbarButton
					active={state.isBibleReference}
					label={
						state.isBibleReference
							? "Replace Bible reference"
							: "Insert Bible reference"
					}
					onClick={() =>
						void executeEditorAction(editor, "bible", actionContext)
					}
				>
					<BookOpenIcon aria-hidden="true" />
				</ToolbarButton>
			) : null}
			{onRequestCitation ? (
				<ToolbarButton
					active={state.isCitation}
					label={state.isCitation ? "Replace citation" : "Insert citation"}
					onClick={() =>
						void executeEditorAction(editor, "citation", actionContext)
					}
				>
					<QuoteIcon aria-hidden="true" />
				</ToolbarButton>
			) : null}
			<ToolbarSeparator />
			<ToolbarButton
				disabled={!state.canUndo}
				label="Undo"
				onClick={() => editor.chain().focus().undo().run()}
			>
				<Undo2Icon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				disabled={!state.canRedo}
				label="Redo"
				onClick={() => editor.chain().focus().redo().run()}
			>
				<Redo2Icon aria-hidden="true" />
			</ToolbarButton>
		</div>
	);
}

function TableControls({
	actionContext,
	editor,
	isTable,
}: {
	actionContext: EditorActionContext;
	editor: Editor;
	isTable: boolean;
}) {
	return (
		<div className="flex items-center gap-0.5">
			<ToolbarButton
				label="Insert table"
				onClick={() => void executeEditorAction(editor, "table", actionContext)}
			>
				<Table2Icon aria-hidden="true" />
			</ToolbarButton>
			{isTable ? (
				<details className="relative">
					<summary className="flex h-7 cursor-pointer list-none items-center rounded-sm px-1.5 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
						Table
					</summary>
					<div className="absolute top-8 right-0 z-10 grid w-48 gap-1 rounded-md border border-border bg-popover p-2 shadow-md">
						<TableMenuButton
							label="Add row"
							onClick={() => editor.chain().focus().addRowAfter().run()}
						/>
						<TableMenuButton
							label="Remove row"
							onClick={() => editor.chain().focus().deleteRow().run()}
						/>
						<TableMenuButton
							label="Add column"
							onClick={() => editor.chain().focus().addColumnAfter().run()}
						/>
						<TableMenuButton
							label="Remove column"
							onClick={() => editor.chain().focus().deleteColumn().run()}
						/>
						<TableMenuButton
							label="Toggle header row"
							onClick={() => editor.chain().focus().toggleHeaderRow().run()}
						/>
						<TableMenuButton
							label="Toggle header column"
							onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
						/>
						<TableMenuButton
							destructive
							label="Delete table"
							onClick={() => editor.chain().focus().deleteTable().run()}
						/>
					</div>
				</details>
			) : null}
		</div>
	);
}

function TableMenuButton({
	destructive = false,
	label,
	onClick,
}: {
	destructive?: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			className={`rounded-sm px-2 py-1 text-left text-xs hover:bg-muted ${destructive ? "text-destructive" : ""}`}
			onClick={onClick}
			type="button"
		>
			{destructive ? (
				<Trash2Icon aria-hidden="true" className="mr-1 inline size-3" />
			) : null}
			{label}
		</button>
	);
}

function LinkControl({ active, editor }: { active: boolean; editor: Editor }) {
	const [open, setOpen] = useState(false);
	const [href, setHref] = useState("");
	const [error, setError] = useState<string | null>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const selectionRef = useRef({ from: 0, to: 0 });
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);
	useEffect(() => {
		if (open) inputRef.current?.focus();
	}, [open]);
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
		editor
			.chain()
			.setTextSelection(selectionRef.current)
			.focus()
			.extendMarkRange("link")
			.setLink({ href: normalizedHref })
			.run();
		close();
	};

	return (
		<>
			<ToolbarButton
				active={active}
				label="Add or edit link"
				onClick={() => {
					selectionRef.current = {
						from: editor.state.selection.from,
						to: editor.state.selection.to,
					};
					setHref(
						(editor.getAttributes("link").href as string | undefined) ?? "",
					);
					setError(null);
					setOpen(true);
				}}
			>
				<LinkIcon aria-hidden="true" />
			</ToolbarButton>
			<dialog
				aria-labelledby="link-dialog-title"
				className="w-full max-w-sm rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-lg backdrop:bg-black/10"
				onCancel={(event) => {
					event.preventDefault();
					close();
				}}
				ref={dialogRef}
			>
				<div className="mb-4 grid gap-1">
					<h2 className="font-medium text-sm" id="link-dialog-title">
						Add link
					</h2>
					<p className="text-muted-foreground text-xs/relaxed">
						Paste the web address to apply to the selected text.
					</p>
				</div>
				<form aria-label="Link editor" className="grid gap-3" onSubmit={save}>
					<input
						aria-label="Link URL"
						className="w-full rounded-sm border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						onChange={(event) => {
							setError(null);
							setHref(event.target.value);
						}}
						onKeyDown={(event) => {
							if (event.key === "Escape") close();
						}}
						placeholder="https://example.com"
						ref={inputRef}
						value={href}
					/>
					{error ? <p className="text-destructive text-xs">{error}</p> : null}
					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<button
							className="rounded-sm px-3 py-1.5 text-sm hover:bg-muted"
							onClick={close}
							type="button"
						>
							Cancel
						</button>
						{active ? (
							<button
								className="rounded-sm px-3 py-1.5 text-destructive text-sm hover:bg-destructive/10"
								onClick={() => {
									editor
										.chain()
										.setTextSelection(selectionRef.current)
										.focus()
										.unsetLink()
										.run();
									close();
								}}
								type="button"
							>
								Remove
							</button>
						) : null}
						<button
							className="rounded-sm bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm"
							type="submit"
						>
							Save link
						</button>
					</div>
				</form>
			</dialog>
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
			className="inline-flex size-7 items-center justify-center rounded-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-primary aria-pressed:text-primary-foreground [&_svg]:size-3.5"
			disabled={disabled}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	);
}

function ToolbarSeparator() {
	return <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}
function blockFormatValue(activeHeading: 2 | 3 | null) {
	return activeHeading ? `heading-${activeHeading}` : "paragraph";
}
function getActiveAlignment(editor: Editor): ToolbarState["activeAlignment"] {
	for (const alignment of ["left", "center", "right"] as const)
		if (editor.isActive({ textAlign: alignment })) return alignment;
	return null;
}
function getActiveBlock(editor: Editor): ToolbarState["activeBlock"] {
	for (const block of ["blockquote", "bulletList", "orderedList"] as const)
		if (editor.isActive(block)) return block;
	return null;
}
function getActiveHeading(editor: Editor): 2 | 3 | null {
	if (editor.isActive("heading", { level: 2 })) return 2;
	if (editor.isActive("heading", { level: 3 })) return 3;
	return null;
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
function blockFormatAction(
	value: string,
): "paragraph" | "heading2" | "heading3" {
	if (value === "heading-2") return "heading2";
	if (value === "heading-3") return "heading3";
	return "paragraph";
}
