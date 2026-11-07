import type { VerseTextStatus } from "@berean-study/db/scripture-catalogue";
import {
	formatVerseList,
	type PasteOptions,
	parsePastedPassage,
} from "@berean-study/db/verse-text-tools";
import { Textarea } from "@berean-study/ui/components/textarea";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { StaffButton } from "../../staff-button";
import { StaffCard } from "../../staff-card";
import { StatusChip, type StatusTone } from "../../status-chip";

type ExistingVerse = {
	needsOwnText: boolean;
	number: number;
	status: VerseTextStatus;
};

const optionLabels: { key: keyof PasteOptions; label: string }[] = [
	{
		key: "removeMarks",
		label: "Remove footnote letters & cross-reference marks",
	},
	{ key: "removeHeadings", label: "Remove section headings" },
	{ key: "keepLineBreaks", label: "Keep line breaks (poetry)" },
];

function pasteOutcome(existing: ExistingVerse | undefined): {
	label: string;
	tone: StatusTone;
	writable: boolean;
} {
	if (!existing) return { label: "New verse", tone: "success", writable: true };
	if (!existing.needsOwnText) {
		return {
			label: "Not in this translation",
			tone: "neutral",
			writable: false,
		};
	}
	switch (existing.status) {
		case "empty":
			return { label: "Fills empty", tone: "success", writable: true };
		case "draft":
		case "needs_fix":
			return { label: "Overwrites draft", tone: "attention", writable: true };
		case "published":
			return { label: "Published, stays", tone: "neutral", writable: false };
		default:
			return { label: "In proofreading, stays", tone: "info", writable: false };
	}
}

/** Reads pasted text in the browser and shows what would happen, before anything changes. */
export function PastePanel({
	onApply,
	onCancel,
	reference,
	verses,
}: {
	onApply: (parsed: { number: number; text: string }[]) => Promise<boolean>;
	onCancel: () => void;
	reference: string;
	verses: readonly ExistingVerse[];
}) {
	const textId = useId();
	const [raw, setRaw] = useState("");
	const [options, setOptions] = useState<PasteOptions>({
		keepLineBreaks: false,
		removeHeadings: true,
		removeMarks: true,
	});
	const [applying, setApplying] = useState(false);

	const parsed = useMemo(
		() => parsePastedPassage(raw, options),
		[raw, options],
	);
	const rows = parsed.verses.map((verse) => ({
		...verse,
		outcome: pasteOutcome(verses.find((row) => row.number === verse.number)),
	}));
	const writable = rows.filter(({ outcome }) => outcome.writable);
	const lastExisting = verses.at(-1)?.number ?? 0;
	const lastPasted = parsed.verses.at(-1)?.number ?? 0;
	const newNumbers: number[] = [];
	for (let number = lastExisting + 1; number <= lastPasted; number += 1) {
		newNumbers.push(number);
	}

	async function apply() {
		setApplying(true);
		const saved = await onApply(
			writable.map(({ number, text }) => ({ number, text })),
		);
		setApplying(false);
		if (saved) {
			toast.success(
				`Added ${writable.length} ${writable.length === 1 ? "verse" : "verses"} to ${reference}.`,
			);
		}
	}

	return (
		<StaffCard>
			<div className="space-y-2">
				<label className="font-semibold text-sm" htmlFor={textId}>
					Paste verses with their numbers
				</label>
				<Textarea
					className="min-h-40 rounded-[0.625rem] font-serif text-base md:text-base"
					id={textId}
					onChange={(event) => setRaw(event.target.value)}
					placeholder="29 For whom he did foreknow… 30 Moreover whom he did predestinate…"
					value={raw}
				/>
			</div>

			<fieldset className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
				<legend className="sr-only">How to read the pasted text</legend>
				{optionLabels.map(({ key, label }) => (
					<label className="flex min-h-6 items-center gap-2 text-sm" key={key}>
						<input
							checked={options[key]}
							className="size-4 accent-primary"
							onChange={(event) =>
								setOptions((current) => ({
									...current,
									[key]: event.target.checked,
								}))
							}
							type="checkbox"
						/>
						{label}
					</label>
				))}
			</fieldset>

			{raw.trim() && rows.length === 0 ? (
				<p
					className="mt-4 rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground"
					role="status"
				>
					No verse numbers found. Paste the text with its verse numbers so each
					verse goes in the right place.
				</p>
			) : null}

			{rows.length > 0 ? (
				<div className="mt-4 space-y-2">
					<p className="font-semibold text-sm" role="status">
						Found {rows.length} {rows.length === 1 ? "verse" : "verses"},
						numbers taken out of the text
					</p>
					{parsed.missing.length > 0 ? (
						<p className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
							Verse {formatVerseList(parsed.missing)} isn't in what you pasted,
							so it will stay empty.
						</p>
					) : null}
					{newNumbers.length > 0 ? (
						<p className="rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground">
							This adds verse {formatVerseList(newNumbers)} to the chapter, for
							all six translations.
						</p>
					) : null}
					{parsed.removedHeadings.length > 0 ? (
						<p className="text-muted-foreground text-xs">
							Taken out as headings: {parsed.removedHeadings.join("; ")}
						</p>
					) : null}
					<ul className="space-y-2">
						{rows.map((row) => (
							<li
								className="flex flex-wrap items-start gap-3 rounded-[0.625rem] border border-border-subtle bg-background p-3"
								key={row.number}
							>
								<span className="w-8 font-bold text-sm">{row.number}</span>
								<span className="min-w-0 flex-1 basis-48 whitespace-pre-line font-serif">
									{row.text}
								</span>
								<StatusChip tone={row.outcome.tone}>
									{row.outcome.label}
								</StatusChip>
							</li>
						))}
					</ul>
				</div>
			) : null}

			<div className="mt-4 flex flex-wrap gap-2">
				<StaffButton
					disabled={writable.length === 0 || applying}
					onClick={apply}
				>
					{writable.length > 0
						? `Add ${writable.length === 1 ? "this verse" : `these ${writable.length} verses`}`
						: "Add verses"}
				</StaffButton>
				<StaffButton onClick={onCancel} variant="outline">
					Cancel
				</StaffButton>
			</div>
		</StaffCard>
	);
}
