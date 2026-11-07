import {
	type VersePresenceKind,
	type VerseTextStatus,
	versePresenceLabels,
} from "@berean-study/db/scripture-catalogue";
import { checkVerseWhileTyping } from "@berean-study/db/verse-text-tools";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { type KeyboardEvent, memo } from "react";

import { StaffButton } from "../../staff-button";
import { VerseStatusChip, WordDiff } from "../verse-text-display";

export type EntryVerse = {
	enteredByMe: boolean;
	enteredByName: string | null;
	includedInVerse: number | null;
	isCorrection: boolean;
	needsOwnText: boolean;
	number: number;
	presenceKind: VersePresenceKind | null;
	proofNote: string | null;
	returnedByName: string | null;
	status: VerseTextStatus;
	suggestedText: string | null;
	text: string;
};

export const editableStatuses: readonly VerseTextStatus[] = [
	"empty",
	"draft",
	"needs_fix",
];

export function verseFieldId(number: number) {
	return `verse-text-${number}`;
}

/** Comes back from the server unchanged while someone types, so typing only redraws its own row. */
export const VerseRow = memo(function VerseRow({
	bookSlug,
	chapter,
	onEnterAtEnd,
	onKeepWording,
	onTextChange,
	reference,
	text,
	translation,
	verse,
}: {
	bookSlug: string;
	chapter: number;
	onEnterAtEnd: (number: number) => void;
	onKeepWording: (number: number) => void;
	onTextChange: (number: number, text: string) => void;
	reference: string;
	text: string;
	translation: string;
	verse: EntryVerse;
}) {
	const { number, status } = verse;

	if (!verse.needsOwnText) {
		return (
			<RowFrame number={number}>
				<p className="py-2 text-muted-foreground text-sm">
					{verse.presenceKind ? versePresenceLabels[verse.presenceKind] : null}
					{verse.includedInVerse ? ` (verse ${verse.includedInVerse})` : ""}. No
					text of its own in {translation}.
				</p>
			</RowFrame>
		);
	}

	if (!editableStatuses.includes(status)) {
		return (
			<RowFrame chip={<VerseStatusChip status={status} />} number={number}>
				<p className="whitespace-pre-line rounded-[0.625rem] bg-muted px-3 py-2 font-serif text-base leading-relaxed">
					{verse.text}
				</p>
				{status === "published" ? (
					<Link
						className="mt-1 inline-block text-muted-foreground text-xs underline underline-offset-2"
						params={{
							bookSlug,
							chapter: String(chapter),
							verse: String(number),
						}}
						to="/work/scripture/verse/$bookSlug/$chapter/$verse"
					>
						Correct text
					</Link>
				) : (
					<p className="mt-1 text-muted-foreground text-xs">
						{verse.isCorrection ? "Correction entered" : "Entered"} by{" "}
						{verse.enteredByMe ? "you" : verse.enteredByName}. It can't change
						while it's being checked.
					</p>
				)}
			</RowFrame>
		);
	}

	const warnings = checkVerseWhileTyping(text);

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key !== "Enter" || event.shiftKey) return;
		const field = event.currentTarget;
		const atEnd =
			field.selectionStart === field.value.length &&
			field.selectionEnd === field.value.length;
		// In the middle of a verse, Enter still makes a line break for poetry.
		if (!atEnd || !field.value.trim()) return;
		event.preventDefault();
		onEnterAtEnd(number);
	}

	return (
		<RowFrame chip={<VerseStatusChip status={status} />} number={number}>
			{verse.proofNote || verse.suggestedText ? (
				<div className="mb-2 rounded-[0.625rem] bg-status-danger p-3 text-sm text-status-danger-foreground">
					<p className="font-semibold">
						{verse.returnedByName
							? `${verse.returnedByName} sent this back`
							: "Sent back from proofreading"}
					</p>
					{verse.proofNote ? <p className="mt-1">{verse.proofNote}</p> : null}
				</div>
			) : null}
			{verse.suggestedText && verse.suggestedText !== text ? (
				<div className="mb-2">
					<WordDiff after={verse.suggestedText} before={text} />
				</div>
			) : null}
			<div className="flex flex-wrap gap-2 empty:hidden [&:not(:empty)]:mb-2">
				{verse.suggestedText && verse.suggestedText !== text ? (
					<StaffButton
						onClick={() => onTextChange(number, verse.suggestedText as string)}
						variant="outline"
					>
						Use this correction
					</StaffButton>
				) : null}
				{status === "needs_fix" ? (
					<StaffButton onClick={() => onKeepWording(number)} variant="outline">
						Keep this wording
					</StaffButton>
				) : null}
			</div>
			<Textarea
				aria-label={`${reference}:${number} ${translation}`}
				className={cn(
					"min-h-14 rounded-[0.625rem] font-serif text-base leading-relaxed md:text-base",
					status === "empty" && "border-dashed",
					warnings.length > 0 && "border-accent",
				)}
				id={verseFieldId(number)}
				onChange={(event) => onTextChange(number, event.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={`Type or paste verse ${number}…`}
				value={text}
			/>
			{warnings.map((warning) => (
				<p
					className="mt-1 text-status-attention-foreground text-xs"
					key={warning.code}
				>
					{warning.message}
				</p>
			))}
		</RowFrame>
	);
});

function RowFrame({
	children,
	chip,
	number,
}: {
	children: React.ReactNode;
	chip?: React.ReactNode;
	number: number;
}) {
	return (
		<div className="flex items-start gap-3 border-border-subtle border-b py-3 last:border-b-0">
			<span className="w-8 shrink-0 pt-2.5 text-right font-bold text-sm tabular-nums">
				{number}
			</span>
			<div className="min-w-0 flex-1">{children}</div>
			{chip ? <div className="shrink-0 pt-2.5">{chip}</div> : null}
		</div>
	);
}
