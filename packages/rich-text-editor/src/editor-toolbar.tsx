import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
	AlignCenterIcon,
	AlignLeftIcon,
	AlignRightIcon,
	BoldIcon,
	ItalicIcon,
	LinkIcon,
	ListIcon,
	ListOrderedIcon,
	MinusIcon,
	QuoteIcon,
	Redo2Icon,
	StrikethroughIcon,
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

type ToolbarState = {
	activeAlignment: "left" | "center" | "right" | null;
	activeBlock: "blockquote" | "bulletList" | "orderedList" | null;
	activeHeading: 2 | 3 | null;
	canRedo: boolean;
	canUndo: boolean;
	isBold: boolean;
	isItalic: boolean;
	isLink: boolean;
	isStrike: boolean;
	isUnderline: boolean;
};

export function EditorToolbar({ editor }: { editor: Editor }) {
	const state = useEditorState({
		editor,
		selector: ({ editor: currentEditor }): ToolbarState => ({
			activeAlignment: getActiveAlignment(currentEditor),
			activeBlock: getActiveBlock(currentEditor),
			activeHeading: getActiveHeading(currentEditor),
			canRedo: currentEditor.can().redo(),
			canUndo: currentEditor.can().undo(),
			isBold: currentEditor.isActive("bold"),
			isItalic: currentEditor.isActive("italic"),
			isLink: currentEditor.isActive("link"),
			isStrike: currentEditor.isActive("strike"),
			isUnderline: currentEditor.isActive("underline"),
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
				onChange={(event) => setBlockFormat(editor, event.target.value)}
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
				onClick={() => editor.chain().focus().toggleBulletList().run()}
			>
				<ListIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.activeBlock === "orderedList"}
				label="Numbered list"
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
			>
				<ListOrderedIcon aria-hidden="true" />
			</ToolbarButton>
			<ToolbarButton
				active={state.activeBlock === "blockquote"}
				label="Blockquote"
				onClick={() => editor.chain().focus().toggleBlockquote().run()}
			>
				<QuoteIcon aria-hidden="true" />
			</ToolbarButton>
			<LinkControl active={state.isLink} editor={editor} />
			<ToolbarButton
				label="Insert horizontal divider"
				onClick={() => editor.chain().focus().setHorizontalRule().run()}
			>
				<MinusIcon aria-hidden="true" />
			</ToolbarButton>
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

function LinkControl({ active, editor }: { active: boolean; editor: Editor }) {
	const [open, setOpen] = useState(false);
	const [href, setHref] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (open) inputRef.current?.focus();
	}, [open]);

	return (
		<div className="relative">
			<ToolbarButton
				active={active}
				label="Add or edit link"
				onClick={() => {
					setHref(
						(editor.getAttributes("link").href as string | undefined) ?? "",
					);
					setOpen(true);
				}}
			>
				<LinkIcon aria-hidden="true" />
			</ToolbarButton>
			{open ? (
				<form
					aria-label="Link editor"
					className="absolute top-9 z-10 flex w-72 gap-1 rounded-md border border-border bg-popover p-2 shadow-md"
					onSubmit={(event) => submitLink(event, editor, href, setOpen)}
				>
					<input
						aria-label="Link URL"
						className="min-w-0 flex-1 rounded-sm border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						onChange={(event) => setHref(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Escape") setOpen(false);
						}}
						placeholder="https://example.com"
						ref={inputRef}
						value={href}
					/>
					<button
						className="rounded-sm bg-primary px-2 py-1 font-medium text-primary-foreground text-xs"
						type="submit"
					>
						Save
					</button>
					{active ? (
						<button
							className="rounded-sm px-2 py-1 text-destructive text-xs hover:bg-destructive/10"
							onClick={() => {
								editor.chain().focus().unsetLink().run();
								setOpen(false);
							}}
							type="button"
						>
							Remove
						</button>
					) : null}
				</form>
			) : null}
		</div>
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
function submitLink(
	event: FormEvent<HTMLFormElement>,
	editor: Editor,
	href: string,
	setOpen: (open: boolean) => void,
) {
	event.preventDefault();
	const normalizedHref = normalizeLink(href);
	if (!normalizedHref) return;
	editor
		.chain()
		.focus()
		.extendMarkRange("link")
		.setLink({ href: normalizedHref })
		.run();
	setOpen(false);
}
function setBlockFormat(editor: Editor, value: string) {
	const chain = editor.chain().focus();
	if (value === "heading-2") chain.toggleHeading({ level: 2 }).run();
	else if (value === "heading-3") chain.toggleHeading({ level: 3 }).run();
	else chain.setParagraph().run();
}
