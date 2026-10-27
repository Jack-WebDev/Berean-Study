import type { VerseBlockAttributes } from "@berean-study/rich-text-editor";
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
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { SearchIcon } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";

import {
	filterPassageOptions,
	type PassageOption,
	type PassageText,
	usePassageText,
	useTranslations,
} from "./note-study-data";

/** A labelled search box whose results link a passage when chosen. */
export function PassageSearch({
	autoFocus = false,
	excludeIds = [],
	label = "Find a passage",
	onSelect,
	passages,
}: {
	autoFocus?: boolean;
	excludeIds?: readonly number[];
	label?: string;
	onSelect: (passage: PassageOption) => void;
	passages: readonly PassageOption[] | null;
}) {
	const id = useId();
	const [query, setQuery] = useState("");
	const results = filterPassageOptions(
		(passages ?? []).filter((passage) => !excludeIds.includes(passage.id)),
		query,
	);

	return (
		<div className="flex flex-col gap-1.5">
			<label
				className="font-semibold text-[13px] text-secondary-foreground"
				htmlFor={id}
			>
				{label}
			</label>
			<div className="flex h-11 items-center gap-2 rounded-[10px] border border-input bg-card px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
				<SearchIcon
					aria-hidden="true"
					className="size-4 text-muted-foreground"
				/>
				<input
					aria-describedby={query ? `${id}-results` : undefined}
					autoComplete="off"
					// biome-ignore lint/a11y/noAutofocus: the field is the dialog's only purpose.
					autoFocus={autoFocus}
					className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
					disabled={passages === null}
					id={id}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={
						passages === null
							? "Loading passages…"
							: "John 3:16, Romans 8, or a word"
					}
					type="search"
					value={query}
				/>
			</div>
			{query.trim() ? (
				<ul
					aria-label="Matching passages"
					className="flex flex-col gap-1"
					id={`${id}-results`}
				>
					{results.length ? (
						results.map((passage) => (
							<li key={passage.id}>
								<PassageRow onClick={() => onSelect(passage)}>
									{passage.label}
								</PassageRow>
							</li>
						))
					) : (
						<li className="px-2.5 py-2 text-muted-foreground text-sm">
							No passages match “{query.trim()}”.
						</li>
					)}
				</ul>
			) : null}
		</div>
	);
}

/** A full-width row button used for passage lists in the study panel. */
export function PassageRow({
	children,
	label,
	onClick,
	trailing,
}: {
	children: ReactNode;
	label?: string;
	onClick: () => void;
	trailing?: ReactNode;
}) {
	return (
		<button
			aria-label={label}
			className="flex min-h-11 w-full items-center gap-2.5 rounded-[10px] bg-background px-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
			onClick={onClick}
			type="button"
		>
			<span className="min-w-0 flex-1 truncate font-serif text-[15px]">
				{children}
			</span>
			{trailing}
		</button>
	);
}

export function LinkPassageDialog({
	excludeIds,
	onOpenChange,
	onSelect,
	open,
	passages,
}: {
	excludeIds: readonly number[];
	onOpenChange: (open: boolean) => void;
	onSelect: (passage: PassageOption) => void;
	open: boolean;
	passages: readonly PassageOption[] | null;
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Link a passage</DialogTitle>
					<DialogDescription>
						Linked passages stay open in the study panel while you write.
					</DialogDescription>
				</DialogHeader>
				<PassageSearch
					autoFocus
					excludeIds={excludeIds}
					onSelect={(passage) => {
						onSelect(passage);
						onOpenChange(false);
					}}
					passages={passages}
				/>
			</DialogContent>
		</Dialog>
	);
}

export type VerseSelection = { chapter: number; end: number; start: number };

/**
 * Picks a passage, translation and verse range, resolving to a Verse block.
 * Ranges stay within one chapter: a second click extends a single verse.
 */
export function VersePickerDialog({
	initialPassageId,
	onOpenChange,
	onSelect,
	open,
	passages,
}: {
	initialPassageId: number | null;
	onOpenChange: (open: boolean) => void;
	onSelect: (verse: VerseBlockAttributes) => void;
	open: boolean;
	passages: readonly PassageOption[] | null;
}) {
	const [passageId, setPassageId] = useState<number | null>(initialPassageId);
	const [translationId, setTranslationId] = useState<number | null>(null);
	const [selection, setSelection] = useState<VerseSelection | null>(null);
	const passageText = usePassageText(open ? passageId : null, translationId);
	const text = passageText.data ?? null;

	useEffect(() => {
		if (!open) return;
		setPassageId(initialPassageId);
		setSelection(null);
	}, [initialPassageId, open]);

	const choose = () => {
		if (!text || !selection || passageId === null) return;
		onSelect(toVerseBlock(text, passageId, selection));
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Quote a verse</DialogTitle>
					<DialogDescription>
						The verse stays linked to its passage, so the quote follows the
						Bible text.
					</DialogDescription>
				</DialogHeader>
				{passageId === null ? (
					<PassageSearch
						autoFocus
						onSelect={(passage) => setPassageId(passage.id)}
						passages={passages}
					/>
				) : (
					<div className="flex min-w-0 flex-col gap-3">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="font-serif text-lg">
								{passages?.find((passage) => passage.id === passageId)?.label}
							</p>
							<div className="flex items-center gap-2">
								<TranslationSelect
									onChange={(id) => {
										setTranslationId(id);
										setSelection(null);
									}}
									value={text?.translation.id ?? translationId}
								/>
								<Button
									onClick={() => {
										setPassageId(null);
										setSelection(null);
									}}
									size="sm"
									type="button"
									variant="ghost"
								>
									Change passage
								</Button>
							</div>
						</div>
						<div className="max-h-80 overflow-y-auto">
							<PassageVerseList
								onSelectVerse={(verse) =>
									setSelection((current) => extendSelection(current, verse))
								}
								passageText={passageText}
								selection={selection}
							/>
						</div>
						<p className="text-muted-foreground text-xs">
							Select a verse, or select a second verse in the same chapter to
							quote a range.
						</p>
					</div>
				)}
				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={!selection || !text} onClick={choose} type="button">
						{selection ? `Quote ${selectionLabel(selection)}` : "Quote verse"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function TranslationSelect({
	onChange,
	value,
}: {
	onChange: (translationId: number) => void;
	value: number | null;
}) {
	const translations = useTranslations();
	const options = translations.data ?? [];

	return (
		<NativeSelect
			aria-label="Translation"
			className="w-auto"
			disabled={!options.length}
			onChange={(event) => onChange(Number(event.target.value))}
			size="sm"
			value={value ?? ""}
		>
			{value === null ? (
				<NativeSelectOption value="">Translation</NativeSelectOption>
			) : null}
			{options.map((translation) => (
				<NativeSelectOption key={translation.id} value={translation.id}>
					{translation.abbreviation}
				</NativeSelectOption>
			))}
		</NativeSelect>
	);
}

/**
 * Verses as selectable rows. Verses already quoted in the note carry a gold
 * edge so the member can see what the note draws on.
 */
export function PassageVerseList({
	isQuoted,
	onSelectVerse,
	passageText,
	selection,
}: {
	isQuoted?: (chapter: number, verse: number) => boolean;
	onSelectVerse: (verse: { chapter: number; number: number }) => void;
	passageText: ReturnType<typeof usePassageText>;
	selection: VerseSelection | null;
}) {
	if (passageText.isError) {
		return (
			<p className="text-destructive text-sm">
				This passage couldn’t be loaded. Please try again.
			</p>
		);
	}
	if (!passageText.isSuccess) {
		return <p className="text-muted-foreground text-sm">Loading passage…</p>;
	}
	const verses = passageText.data?.verses ?? [];
	if (!verses.length) {
		return (
			<p className="text-muted-foreground text-sm">
				No text is available for this passage in this translation.
			</p>
		);
	}
	const showChapter = new Set(verses.map((verse) => verse.chapter)).size > 1;

	return (
		<ol aria-label="Passage text" className="flex flex-col gap-1">
			{verses.map((verse) => {
				const selected = isVerseSelected(
					selection,
					verse.chapter,
					verse.number,
				);
				const quoted = isQuoted?.(verse.chapter, verse.number) ?? false;
				return (
					<li key={`${verse.chapter}:${verse.number}`}>
						<button
							aria-label={`Verse ${showChapter ? `${verse.chapter}:` : ""}${verse.number}${quoted ? ", quoted in note" : ""}`}
							aria-pressed={selected}
							className={[
								"w-full rounded-[10px] px-2.5 py-2 text-left font-serif text-[17px] text-foreground/90 leading-[1.6] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:ring-2 aria-pressed:ring-primary/40",
								quoted
									? "bg-scripture shadow-[inset_3px_0_0_var(--color-scripture-accent)] hover:bg-scripture"
									: "",
							].join(" ")}
							onClick={() =>
								onSelectVerse({ chapter: verse.chapter, number: verse.number })
							}
							type="button"
						>
							<sup className="mr-1 font-sans font-semibold text-[11px] text-scripture-number">
								{showChapter ? `${verse.chapter}:` : ""}
								{verse.number}
							</sup>
							{verse.text}
						</button>
					</li>
				);
			})}
		</ol>
	);
}

export function toVerseBlock(
	text: PassageText,
	passageId: number,
	selection: VerseSelection,
): VerseBlockAttributes {
	const quoted = text.verses
		.filter(
			(verse) =>
				verse.chapter === selection.chapter &&
				verse.number >= selection.start &&
				verse.number <= selection.end,
		)
		.map((verse) => verse.text)
		.join(" ");
	return {
		book: text.bookName,
		bookId: text.bookId,
		chapter: selection.chapter,
		passageId,
		// A copy of the words, shown wherever the live Bible text can't load.
		...(quoted ? { text: quoted } : {}),
		translation: text.translation.abbreviation,
		verseEnd: selection.end,
		verseStart: selection.start,
	};
}

export function selectionLabel(selection: VerseSelection) {
	return selection.end > selection.start
		? `vv.${selection.start}–${selection.end}`
		: `v.${selection.start}`;
}

/** A first click selects one verse; a second in the same chapter makes a range. */
export function extendSelection(
	current: VerseSelection | null,
	verse: { chapter: number; number: number },
): VerseSelection {
	if (
		!current ||
		current.chapter !== verse.chapter ||
		current.start !== current.end ||
		current.start === verse.number
	) {
		return { chapter: verse.chapter, end: verse.number, start: verse.number };
	}
	return {
		chapter: verse.chapter,
		end: Math.max(current.start, verse.number),
		start: Math.min(current.start, verse.number),
	};
}

function isVerseSelected(
	selection: VerseSelection | null,
	chapter: number,
	verse: number,
) {
	return Boolean(
		selection &&
			selection.chapter === chapter &&
			verse >= selection.start &&
			verse <= selection.end,
	);
}
