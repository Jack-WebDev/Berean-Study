import type {
	DocumentVerseBlock,
	VerseBlockAttributes,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
	extendSelection,
	PassageRow,
	PassageSearch,
	PassageVerseList,
	selectionLabel,
	TranslationSelect,
	toVerseBlock,
	type VerseSelection,
} from "./note-passage-pickers";
import {
	type PassageOption,
	usePassageText,
	useRecentPassages,
	useRelatedPassages,
} from "./note-study-data";

/** A verse to reveal in the panel, e.g. after clicking a Verse block caption. */
export type FocusedVerse = {
	chapter: number;
	passageId: number;
	verseEnd: number;
	verseStart: number;
};

export function NotePassageTab({
	activePassageId,
	focusedVerse,
	linkedPassages,
	onActivePassageChange,
	onLinkPassage,
	onQuote,
	onTranslationChange,
	passages,
	quotedVerses,
	translation,
	translationId,
}: {
	activePassageId: number | null;
	focusedVerse: FocusedVerse | null;
	linkedPassages: readonly PassageOption[];
	onActivePassageChange: (passageId: number) => void;
	onLinkPassage: (passageId: number) => void;
	onQuote: (verse: VerseBlockAttributes) => void;
	onTranslationChange: (translationId: number) => void;
	passages: readonly PassageOption[] | null;
	quotedVerses: readonly DocumentVerseBlock[];
	translation: string | null;
	translationId: number | null;
}) {
	if (activePassageId === null) {
		return (
			<UnlinkedPassagePanel
				onLinkPassage={onLinkPassage}
				passages={passages}
				translation={translation}
			/>
		);
	}

	return (
		<LinkedPassagePanel
			activePassageId={activePassageId}
			focusedVerse={focusedVerse}
			linkedPassages={linkedPassages}
			onActivePassageChange={onActivePassageChange}
			onLinkPassage={onLinkPassage}
			onQuote={onQuote}
			onTranslationChange={onTranslationChange}
			quotedVerses={quotedVerses}
			translationId={translationId}
		/>
	);
}

function UnlinkedPassagePanel({
	onLinkPassage,
	passages,
	translation,
}: {
	onLinkPassage: (passageId: number) => void;
	passages: readonly PassageOption[] | null;
	translation: string | null;
}) {
	const recent = useRecentPassages();

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<h2 className="font-serif text-xl">Study alongside a passage</h2>
				<p className="text-[13px] text-muted-foreground leading-normal">
					The passage stays open here while you write. Verses you quote stay
					linked to the note.
				</p>
			</div>
			<PassageSearch
				onSelect={(passage) => onLinkPassage(passage.id)}
				passages={passages}
			/>
			{recent.status === "ready" && recent.value.length ? (
				<section
					aria-labelledby="note-recent-passages"
					className="flex flex-col gap-1"
				>
					<h3
						className="pb-1 font-semibold text-muted-foreground text-xs uppercase tracking-[0.06em]"
						id="note-recent-passages"
					>
						Recent
					</h3>
					{recent.value.map((passage) => (
						<PassageRow
							key={passage.id}
							label={`Link ${passage.label}`}
							onClick={() => onLinkPassage(passage.id)}
							trailing={
								translation ? (
									<span className="text-muted-foreground text-xs">
										{translation}
									</span>
								) : null
							}
						>
							{passage.label}
						</PassageRow>
					))}
				</section>
			) : null}
			<Link
				className="flex w-fit items-center gap-1.5 rounded-sm font-medium text-primary text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				to="/bible"
			>
				Browse Scripture
				<ArrowRightIcon aria-hidden="true" className="size-3.5" />
			</Link>
		</div>
	);
}

function LinkedPassagePanel({
	activePassageId,
	focusedVerse,
	linkedPassages,
	onActivePassageChange,
	onLinkPassage,
	onQuote,
	onTranslationChange,
	quotedVerses,
	translationId,
}: {
	activePassageId: number;
	focusedVerse: FocusedVerse | null;
	linkedPassages: readonly PassageOption[];
	onActivePassageChange: (passageId: number) => void;
	onLinkPassage: (passageId: number) => void;
	onQuote: (verse: VerseBlockAttributes) => void;
	onTranslationChange: (translationId: number) => void;
	quotedVerses: readonly DocumentVerseBlock[];
	translationId: number | null;
}) {
	const [selection, setSelection] = useState<VerseSelection | null>(null);
	const passageText = usePassageText(activePassageId, translationId);
	const text = passageText.status === "ready" ? passageText.value : null;
	const related = useRelatedPassages(activePassageId);
	const label =
		linkedPassages.find((passage) => passage.id === activePassageId)?.label ??
		text?.passage.label;
	const linkedIds = linkedPassages.map((passage) => passage.id);

	useEffect(() => {
		setSelection(
			focusedVerse && focusedVerse.passageId === activePassageId
				? {
						chapter: focusedVerse.chapter,
						end: focusedVerse.verseEnd,
						start: focusedVerse.verseStart,
					}
				: null,
		);
	}, [activePassageId, focusedVerse]);

	const isQuoted = (chapter: number, verse: number) =>
		Boolean(text) &&
		quotedVerses.some(
			({ attributes }) =>
				attributes.bookId === text?.bookId &&
				attributes.chapter === chapter &&
				verse >= attributes.verseStart &&
				verse <= attributes.verseEnd,
		);

	return (
		<div className="flex flex-col gap-4">
			{linkedPassages.length > 1 ? (
				<fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
					<legend className="sr-only">Show linked passage</legend>
					{linkedPassages.map((passage) => (
						<button
							aria-pressed={passage.id === activePassageId}
							className="h-9 rounded-full border border-border px-3 font-serif text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-scripture-border aria-pressed:bg-scripture aria-pressed:text-scripture-foreground"
							key={passage.id}
							onClick={() => onActivePassageChange(passage.id)}
							type="button"
						>
							{passage.label}
						</button>
					))}
				</fieldset>
			) : null}
			<div className="flex items-center justify-between gap-3">
				<h2 className="min-w-0 truncate font-serif text-2xl">{label}</h2>
				<TranslationSelect
					onChange={(id) => {
						onTranslationChange(id);
						setSelection(null);
					}}
					value={text?.translation.id ?? translationId}
				/>
			</div>
			<PassageVerseList
				isQuoted={isQuoted}
				onSelectVerse={(verse) =>
					setSelection((current) => extendSelection(current, verse))
				}
				passageText={passageText}
				selection={selection}
			/>
			<div className="flex flex-wrap gap-2">
				<Button
					className="h-9 rounded-[9px] px-3"
					disabled={!selection || !text}
					onClick={() => {
						if (!selection || !text) return;
						onQuote(toVerseBlock(text, activePassageId, selection));
					}}
					type="button"
				>
					<PlusIcon aria-hidden="true" data-icon="inline-start" />
					{selection
						? `Quote ${selectionLabel(selection)} in note`
						: "Quote in note"}
				</Button>
				<Link
					className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 font-medium text-[13px] text-secondary-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					search={{ passage: activePassageId }}
					to="/bible"
				>
					Read chapter
					<ArrowRightIcon aria-hidden="true" className="size-3.5" />
				</Link>
			</div>
			<section
				aria-labelledby="note-cross-references"
				className="flex flex-col gap-1 border-border border-t pt-4"
			>
				<h3
					className="pb-1 font-semibold text-muted-foreground text-xs uppercase tracking-[0.06em]"
					id="note-cross-references"
				>
					Cross-references
				</h3>
				{related.status === "ready" ? (
					related.value.filter((passage) => !linkedIds.includes(passage.id))
						.length ? (
						related.value
							.filter((passage) => !linkedIds.includes(passage.id))
							.map((passage) => (
								<PassageRow
									key={passage.id}
									label={`Link ${passage.label} to this note`}
									onClick={() => onLinkPassage(passage.id)}
									trailing={
										<PlusIcon
											aria-hidden="true"
											className="size-4 text-muted-foreground"
										/>
									}
								>
									{passage.label}
								</PassageRow>
							))
					) : (
						<p className="text-muted-foreground text-sm">
							No other cross-references for this passage.
						</p>
					)
				) : (
					<p className="text-muted-foreground text-sm">
						{related.status === "failed"
							? "Cross-references are unavailable right now."
							: "Loading cross-references…"}
					</p>
				)}
			</section>
		</div>
	);
}
