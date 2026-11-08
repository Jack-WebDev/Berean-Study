import type {
	MissingVerseNote,
	ReadingTextSize,
	VerseLayout,
} from "@berean-study/db/reader-catalogue";
import {
	readingTextSizeDetails,
	readingTextSizes,
} from "@berean-study/db/reader-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import type { KeyboardEvent, ReactNode } from "react";

/*
 * The verses of a chapter (HANDOFF Screen 1). Each verse is something to tap: one
 * tap chooses it for highlighting, notes or study. Marks sit beside the number,
 * never in the text, so they can't be mistaken for footnotes. Stored line breaks
 * are kept, which is how poetry such as the Psalms keeps its shape.
 */

export type VerseMarks = {
	highlighted: ReadonlySet<number>;
	noted: ReadonlySet<number>;
	study: ReadonlySet<number>;
};

export type VerseListProps = {
	layout: VerseLayout;
	marks: VerseMarks;
	missingVerses: readonly MissingVerseNote[];
	onToggleVerse: (verse: number) => void;
	selected: ReadonlySet<number>;
	showVerseNumbers: boolean;
	/** The verse arrived at from a search, marked until the reader taps anything. */
	target: number | null;
	textSize: ReadingTextSize;
	verses: ReadonlyArray<{ number: number; text: string }>;
};

/** 1 for Standard up to 4 for Largest: verse numbers grow with the text. */
function sizeStep(textSize: ReadingTextSize) {
	return readingTextSizes.indexOf(textSize) + 1;
}

function verseState(
	verse: number,
	{
		marks,
		selected,
		target,
	}: Pick<VerseListProps, "marks" | "selected" | "target">,
) {
	return {
		highlighted: marks.highlighted.has(verse),
		noted: marks.noted.has(verse),
		selected: selected.has(verse),
		study: marks.study.has(verse),
		target: verse === target,
	};
}

type VerseState = ReturnType<typeof verseState>;

function stateClasses(state: VerseState) {
	return cn(
		state.highlighted
			? "bg-verse-highlight text-verse-highlight-foreground"
			: state.selected
				? "bg-verse-selected"
				: state.target && "bg-verse-target",
		state.selected
			? "shadow-[inset_0_0_0_2px_var(--verse-selected-ring)]"
			: state.target && "shadow-[inset_0_0_0_1.5px_var(--verse-target-ring)]",
	);
}

/** Words for screen readers, standing in for the marks and colours. */
function spokenMarks(state: VerseState) {
	return [
		state.study && "has study notes",
		state.noted && "you wrote a note",
		state.highlighted && "highlighted",
	]
		.filter(Boolean)
		.join(", ");
}

function SpokenMarks({ state }: { state: VerseState }) {
	const words = spokenMarks(state);
	return words ? (
		<>
			{" "}
			<span className="sr-only">({words})</span>
		</>
	) : null;
}

function StudyDot({ className }: { className?: string }) {
	return (
		<span
			aria-hidden="true"
			className={cn("block size-[7px] rounded-full bg-study-marker", className)}
		/>
	);
}

function NotePencil({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={cn("block size-[13px] text-study-marker", className)}
			fill="none"
			stroke="currentColor"
			strokeLinejoin="round"
			strokeWidth={2.4}
			viewBox="0 0 24 24"
		>
			<path d="M4 20h4L19 9l-4-4L4 16v4z" />
		</svg>
	);
}

export { NotePencil, StudyDot };

function MissingVerse({ note }: { note: MissingVerseNote }) {
	return (
		<aside className="my-2 rounded-xl bg-reader-notice px-4 py-3 font-sans text-[16px] text-reader-notice-foreground leading-relaxed">
			<p className="font-bold">{note.question}</p>
			<p>{note.explanation}</p>
		</aside>
	);
}

/** Notes keyed by the verse they sit under. 0 means before the first verse. */
function notesByVerse(missingVerses: readonly MissingVerseNote[]) {
	const byVerse = new Map<number, MissingVerseNote[]>();
	for (const note of missingVerses) {
		byVerse.set(note.afterVerse, [
			...(byVerse.get(note.afterVerse) ?? []),
			note,
		]);
	}
	return byVerse;
}

export function VerseList(props: VerseListProps) {
	return props.layout === "paragraph" ? (
		<ParagraphVerses {...props} />
	) : (
		<LineVerses {...props} />
	);
}

function LineVerses({
	marks,
	missingVerses,
	onToggleVerse,
	selected,
	showVerseNumbers,
	target,
	textSize,
	verses,
}: VerseListProps) {
	const pixels = readingTextSizeDetails[textSize].pixels;
	const step = sizeStep(textSize);
	const notes = notesByVerse(missingVerses);
	const items: ReactNode[] = (notes.get(0) ?? []).map((note) => (
		<li key={`note-before-${note.question}`}>
			<MissingVerse note={note} />
		</li>
	));

	for (const verse of verses) {
		const state = verseState(verse.number, { marks, selected, target });
		items.push(
			<li key={verse.number}>
				<button
					aria-pressed={state.selected}
					className={cn(
						"reader-focus flex w-full scroll-mt-[calc(var(--reader-header-height,0px)+12px)] gap-2 rounded-[10px] py-2.5 pr-3 text-left",
						stateClasses(state),
					)}
					data-verse={verse.number}
					id={`v${verse.number}`}
					onClick={() => onToggleVerse(verse.number)}
					type="button"
				>
					<span
						className={cn(
							"flex w-[34px] shrink-0 flex-col items-end font-bold font-sans leading-none",
							state.highlighted
								? "text-verse-number-on-highlight"
								: "text-verse-number",
						)}
						style={{
							fontSize: 12 + step,
							paddingTop: Math.round(pixels * 0.42),
						}}
					>
						{showVerseNumbers ? (
							verse.number
						) : (
							<span className="sr-only">Verse {verse.number}</span>
						)}
						{state.study ? <StudyDot className="mt-[5px] mr-0.5" /> : null}
						{state.noted ? <NotePencil className="mt-1" /> : null}
					</span>
					{/* Keeps "28" and the first word apart when read aloud. A space between
					    side-by-side boxes takes no room on screen. */}{" "}
					<span
						className="min-w-0 flex-1 whitespace-pre-line font-serif"
						style={{ fontSize: pixels, lineHeight: 1.75 }}
					>
						{verse.text}
						<SpokenMarks state={state} />
					</span>
				</button>
			</li>,
		);
		for (const note of notes.get(verse.number) ?? []) {
			items.push(
				<li key={`note-${note.question}`}>
					<MissingVerse note={note} />
				</li>,
			);
		}
	}

	return <ol className="flex flex-col gap-1">{items}</ol>;
}

/**
 * Verses flowing as ordinary paragraphs. Each verse is still tappable, written as
 * an inline link-shaped button so the text can wrap naturally across lines.
 */
function ParagraphVerses({
	marks,
	missingVerses,
	onToggleVerse,
	selected,
	showVerseNumbers,
	target,
	textSize,
	verses,
}: VerseListProps) {
	const pixels = readingTextSizeDetails[textSize].pixels;
	const step = sizeStep(textSize);
	const notes = notesByVerse(missingVerses);

	// A note about a missing verse breaks the paragraph, so it sits where it belongs.
	const blocks: ReactNode[] = (notes.get(0) ?? []).map((note) => (
		<MissingVerse key={`note-before-${note.question}`} note={note} />
	));
	let paragraph: ReactNode[] = [];
	const endParagraph = (key: string) => {
		if (paragraph.length === 0) return;
		blocks.push(
			<p
				className="whitespace-pre-line px-2.5 py-1 font-serif text-foreground"
				key={key}
				style={{ fontSize: pixels, lineHeight: 1.9 }}
			>
				{paragraph}
			</p>,
		);
		paragraph = [];
	};

	for (const verse of verses) {
		const state = verseState(verse.number, { marks, selected, target });
		const toggle = () => onToggleVerse(verse.number);
		paragraph.push(
			// biome-ignore lint/a11y/useSemanticElements: a <button> can't wrap its text across lines, so a verse in a paragraph would break the flow.
			<a
				aria-pressed={state.selected}
				className={cn(
					"reader-focus mr-1 scroll-mt-[calc(var(--reader-header-height,0px)+12px)] rounded-md px-0.5 py-[3px] text-inherit no-underline [-webkit-box-decoration-break:clone] [box-decoration-break:clone]",
					stateClasses(state),
				)}
				data-verse={verse.number}
				href={`#v${verse.number}`}
				id={`v${verse.number}`}
				key={verse.number}
				onClick={(event) => {
					event.preventDefault();
					toggle();
				}}
				onKeyDown={(event: KeyboardEvent) => {
					// Buttons answer the space bar as well as Enter.
					if (event.key === " ") {
						event.preventDefault();
						toggle();
					}
				}}
				role="button"
			>
				{showVerseNumbers ? (
					<sup
						className={cn(
							"font-bold font-sans",
							state.highlighted
								? "text-verse-number-on-highlight"
								: "text-verse-number",
						)}
						style={{ fontSize: 11 + step }}
					>
						{verse.number}
					</sup>
				) : (
					<span className="sr-only">Verse {verse.number}</span>
				)}{" "}
				{state.study ? (
					<StudyDot className="mr-1 inline-block size-[6px] align-super" />
				) : null}
				{verse.text}
				<SpokenMarks state={state} />
			</a>,
		);
		if (notes.has(verse.number)) {
			endParagraph(`paragraph-${verse.number}`);
			for (const note of notes.get(verse.number) ?? []) {
				blocks.push(<MissingVerse key={`note-${note.question}`} note={note} />);
			}
		}
	}
	endParagraph("paragraph-end");

	return <div>{blocks}</div>;
}
