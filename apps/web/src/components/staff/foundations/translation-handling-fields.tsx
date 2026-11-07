import {
	type VersePresenceKind,
	versePresenceLabels,
} from "@berean-study/db/scripture-catalogue";
import { useId } from "react";

export type HandlingKind = VersePresenceKind | "own";

export type HandlingAnswer = {
	abbreviation: string;
	includedInVerse: number | null;
	kind: HandlingKind;
	/** Holds text already, so it can't stop having a verse of its own. */
	mustKeepOwnVerse?: boolean;
};

const kindOptions: { label: string; value: HandlingKind }[] = [
	{ label: "Has its own verse", value: "own" },
	{ label: versePresenceLabels.included_in, value: "included_in" },
	{ label: versePresenceLabels.omitted_footnote, value: "omitted_footnote" },
	{ label: versePresenceLabels.bracketed, value: "bracketed" },
	{
		label: versePresenceLabels.not_in_translation,
		value: "not_in_translation",
	},
];

const selectClassName =
	"h-11 w-full rounded-[0.625rem] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** One answer per translation. Every one of the six has to be answered. */
export function TranslationHandlingFields({
	answers,
	onChange,
	verses,
}: {
	answers: readonly HandlingAnswer[];
	onChange: (next: HandlingAnswer[]) => void;
	verses: readonly number[];
}) {
	function update(abbreviation: string, change: Partial<HandlingAnswer>) {
		onChange(
			answers.map((answer) =>
				answer.abbreviation === abbreviation
					? { ...answer, ...change }
					: answer,
			),
		);
	}

	return (
		<ul className="space-y-3">
			{answers.map((answer) => (
				<HandlingRow
					answer={answer}
					key={answer.abbreviation}
					onUpdate={(change) => update(answer.abbreviation, change)}
					verses={verses}
				/>
			))}
		</ul>
	);
}

function HandlingRow({
	answer,
	onUpdate,
	verses,
}: {
	answer: HandlingAnswer;
	onUpdate: (change: Partial<HandlingAnswer>) => void;
	verses: readonly number[];
}) {
	const kindId = useId();
	const verseId = useId();

	return (
		<li className="grid items-center gap-2 border-border-subtle border-b pb-3 last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,10rem)]">
			<label className="font-bold text-sm" htmlFor={kindId}>
				{answer.abbreviation}
			</label>
			<select
				className={selectClassName}
				id={kindId}
				onChange={(event) => {
					const kind = event.target.value as HandlingKind;
					onUpdate({
						kind,
						includedInVerse:
							kind === "included_in" ? (verses.at(-1) ?? null) : null,
					});
				}}
				value={answer.kind}
			>
				{kindOptions.map(({ label, value }) => (
					<option
						disabled={
							answer.mustKeepOwnVerse &&
							value !== "own" &&
							value !== "bracketed"
						}
						key={value}
						value={value}
					>
						{label}
					</option>
				))}
			</select>
			{answer.kind === "included_in" ? (
				<div className="flex items-center gap-2">
					<label className="shrink-0 text-sm" htmlFor={verseId}>
						In verse
					</label>
					<select
						className={selectClassName}
						id={verseId}
						onChange={(event) =>
							onUpdate({ includedInVerse: Number(event.target.value) })
						}
						value={answer.includedInVerse ?? ""}
					>
						{verses.map((number) => (
							<option key={number} value={number}>
								{number}
							</option>
						))}
					</select>
				</div>
			) : answer.mustKeepOwnVerse ? (
				<span className="text-muted-foreground text-xs">Has text already</span>
			) : null}
		</li>
	);
}
