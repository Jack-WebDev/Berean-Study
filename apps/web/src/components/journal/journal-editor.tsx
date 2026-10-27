import {
	type EditorToolbarVariant,
	journalSlashCommands,
	type RichTextDocument,
	RichTextEditor,
	RichTextRenderer,
	type VerseBlockAttributes,
	VerseBlockProvider,
	type VerseBlockSource,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import { cn } from "@berean-study/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { VersePickerDialog } from "@/components/notes/note-passage-pickers";
import {
	useLoadVerses,
	usePassageOptions,
} from "@/components/notes/note-study-data";

import { fieldClassName, primaryButtonClassName } from "./journal-ui";

type PendingRequest<T> = ((value: T | null) => void) | null;

/**
 * The shared rich text editor set up for journal entries: a short `/` menu,
 * a verse picker that searches the app's Bible, and verse references that
 * open in Browse Scripture.
 */
export function JournalEditor({
	ariaLabel,
	className,
	contentClassName,
	onChange,
	onExpand,
	onPersonNamed,
	placeholder,
	toolbar = "simple",
	value,
}: {
	ariaLabel: string;
	className?: string;
	contentClassName?: string;
	onChange: (document: RichTextDocument) => void;
	/** Shows the "Open full-screen editor" button. */
	onExpand?: () => void;
	/** Turns on "Person I'm praying for"; receives the name that was added. */
	onPersonNamed?: (name: string) => void;
	placeholder?: string;
	toolbar?: EditorToolbarVariant;
	value: RichTextDocument;
}) {
	const passages = usePassageOptions();
	const [verseOpen, setVerseOpen] = useState(false);
	const [personOpen, setPersonOpen] = useState(false);
	const pendingVerse = useRef<PendingRequest<VerseBlockAttributes>>(null);
	const pendingPerson = useRef<PendingRequest<string>>(null);
	const onPersonNamedRef = useRef(onPersonNamed);
	onPersonNamedRef.current = onPersonNamed;

	// The editor waits on these promises until the member picks or cancels.
	const requestVerse = useCallback(
		() =>
			new Promise<VerseBlockAttributes | null>((resolve) => {
				pendingVerse.current?.(null);
				pendingVerse.current = resolve;
				setVerseOpen(true);
			}),
		[],
	);
	const requestPerson = useCallback(
		() =>
			new Promise<string | null>((resolve) => {
				pendingPerson.current?.(null);
				pendingPerson.current = (name) => {
					if (name) onPersonNamedRef.current?.(name);
					resolve(name);
				};
				setPersonOpen(true);
			}),
		[],
	);
	useEffect(
		() => () => {
			pendingVerse.current?.(null);
			pendingPerson.current?.(null);
		},
		[],
	);

	const settleVerse = (verse: VerseBlockAttributes | null) => {
		pendingVerse.current?.(verse);
		pendingVerse.current = null;
		setVerseOpen(false);
	};
	const settlePerson = (name: string | null) => {
		pendingPerson.current?.(name);
		pendingPerson.current = null;
		setPersonOpen(false);
	};

	const verseSource = useJournalVerseSource();

	return (
		<VerseBlockProvider value={verseSource}>
			<RichTextEditor
				ariaLabel={ariaLabel}
				className={className}
				contentClassName={cn(journalHeadingClassName, contentClassName)}
				onChange={onChange}
				onExpand={onExpand}
				onRequestPerson={onPersonNamed ? requestPerson : undefined}
				onRequestVerse={requestVerse}
				placeholder={placeholder}
				slashCommands={journalSlashCommands}
				toolbar={toolbar}
				value={value}
			/>
			<VersePickerDialog
				initialPassageId={null}
				onOpenChange={(open) => (open ? setVerseOpen(true) : settleVerse(null))}
				onSelect={settleVerse}
				open={verseOpen}
				passages={passages.data ?? null}
			/>
			<PersonDialog onSettle={settlePerson} open={personOpen} />
		</VerseBlockProvider>
	);
}

/** Loads verse text and links verse references to Browse Scripture. */
export function useJournalVerseSource() {
	const navigate = useNavigate();
	const loadVerses = useLoadVerses();
	return useMemo<VerseBlockSource>(
		() => ({
			getHref: (verse) => `/bible?passage=${verse.passageId}`,
			loadVerses,
			onOpen: (verse) =>
				void navigate({ search: { passage: verse.passageId }, to: "/bible" }),
		}),
		[loadVerses, navigate],
	);
}

/** Shows a saved entry read-only, with the same verse cards as the editor. */
export function JournalEntryBody({
	ariaLabel,
	document,
}: {
	ariaLabel: string;
	document: RichTextDocument;
}) {
	const verseSource = useJournalVerseSource();
	return (
		<VerseBlockProvider value={verseSource}>
			<RichTextRenderer
				ariaLabel={ariaLabel}
				contentClassName={cn(journalHeadingClassName, entryBodyClassName)}
				document={document}
				variant="plain"
			/>
		</VerseBlockProvider>
	);
}

// The reader's default padding suits a full page; inside a card it lines
// up with the surrounding text instead.
/**
 * Headings in an entry use the same serif as its text, so a page reads as one
 * piece. (The shared editor sets them in the interface font for Notes.)
 */
const journalHeadingClassName =
	"[&_.ProseMirror_h1]:font-serif! [&_.ProseMirror_h1]:font-normal! [&_.ProseMirror_h2]:font-serif! [&_.ProseMirror_h2]:font-normal! [&_.ProseMirror_h3]:font-serif! [&_.ProseMirror_h3]:font-normal!";

const entryBodyClassName =
	"text-base! leading-7! [&_.ProseMirror]:max-w-none! [&_.ProseMirror]:p-0! [&_.ProseMirror>*:first-child]:mt-0! [&_.ProseMirror>*:last-child]:mb-0!";

function PersonDialog({
	onSettle,
	open,
}: {
	onSettle: (name: string | null) => void;
	open: boolean;
}) {
	const [name, setName] = useState("");
	useEffect(() => {
		if (open) setName("");
	}, [open]);
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSettle(name.trim() || null);
	};

	return (
		<Dialog
			onOpenChange={(next) => (next ? undefined : onSettle(null))}
			open={open}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Who are you praying for?</DialogTitle>
					<DialogDescription>
						Their name goes into your prayer and into “Praying for”.
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-4" onSubmit={submit}>
					<input
						aria-label="Name"
						autoFocus
						className={fieldClassName}
						maxLength={120}
						onChange={(event) => setName(event.target.value)}
						placeholder="e.g. Sipho"
						value={name}
					/>
					<DialogFooter>
						<Button
							className="h-11 rounded-xl px-4"
							onClick={() => onSettle(null)}
							type="button"
							variant="ghost"
						>
							Cancel
						</Button>
						<Button
							className={primaryButtonClassName}
							disabled={!name.trim()}
							type="submit"
						>
							Add name
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
