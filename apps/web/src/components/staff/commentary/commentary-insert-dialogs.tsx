import {
	citationStrengthLabels,
	citationStrengths,
	excerptFormLabels,
} from "@berean-study/db/evidence-body";
import type { CitationAttributes } from "@berean-study/rich-text-editor";
import type {
	CitationStrength,
	OriginalTermAttributes,
	ScriptureReferenceAttributes,
} from "@berean-study/rich-text-editor/types";
import { Input } from "@berean-study/ui/components/input";
import { cn } from "@berean-study/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";

import { resolveEditorReference } from "@/functions/commentary";
import { citableExcerptsQueryOptions } from "@/queries/commentary";

import {
	EvidenceField,
	evidenceInputClassName,
	OptionPills,
} from "../evidence/evidence-display";
import { staffLinkClassName } from "../staff-button";
import { StaffFormDialog } from "../staff-form-dialog";
import { StatusChip } from "../status-chip";

const strengthOptions = citationStrengths.map((value) => ({
	label: citationStrengthLabels[value],
	value,
}));

export type CitationStart = { locator?: string; search?: string };

/** Search saved excerpts and add one as a numbered footnote. */
export function CitationDialog({
	onSettle,
	start,
}: {
	onSettle: (citation: CitationAttributes | null) => void;
	start: CitationStart;
}) {
	const [search, setSearch] = useState(start.search ?? "");
	const deferredSearch = useDeferredValue(search);
	const [picked, setPicked] = useState<{ id: number; title: string } | null>(
		null,
	);
	const [locator, setLocator] = useState(start.locator ?? "");
	const [strength, setStrength] = useState<CitationStrength>("direct");
	const { data: excerpts = [], isFetching } = useQuery(
		citableExcerptsQueryOptions({ search: deferredSearch }),
	);

	return (
		<StaffFormDialog
			canSubmit={picked !== null}
			description="Pick a saved excerpt. If it isn't here yet, add it first and come back."
			onOpenChange={(open) => {
				if (!open) onSettle(null);
			}}
			onSubmit={() => {
				if (!picked) return;
				onSettle({
					excerptId: picked.id,
					label: picked.title,
					locator: locator.trim(),
					strength,
				});
			}}
			open
			pending={false}
			submitLabel="Insert citation"
			title="Insert citation"
		>
			<EvidenceField label="Search sources">
				{(id) => (
					<Input
						className={evidenceInputClassName}
						id={id}
						maxLength={200}
						onChange={(event) => setSearch(event.target.value)}
						type="search"
						value={search}
					/>
				)}
			</EvidenceField>
			<ul
				aria-busy={isFetching}
				aria-label="Saved excerpts"
				className="max-h-56 space-y-1 overflow-y-auto"
			>
				{excerpts.map((excerpt) => (
					<li key={excerpt.id}>
						<button
							aria-pressed={picked?.id === excerpt.id}
							className={cn(
								"flex min-h-11 w-full flex-col items-start rounded-[0.625rem] border p-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								picked?.id === excerpt.id
									? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
									: "border-border hover:bg-muted",
							)}
							onClick={() =>
								setPicked({ id: excerpt.id, title: excerpt.title })
							}
							type="button"
						>
							<span className="font-medium">{excerpt.title}</span>
							<span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs opacity-80">
								{excerptFormLabels[excerpt.body.form]}
								{excerpt.liveNumber ? null : (
									<StatusChip tone="attention">Not live yet</StatusChip>
								)}
							</span>
						</button>
					</li>
				))}
				{excerpts.length === 0 && !isFetching ? (
					<li className="text-muted-foreground text-sm">
						No saved excerpts match that search.
					</li>
				) : null}
			</ul>
			<EvidenceField label="Pages">
				{(id) => (
					<Input
						className={evidenceInputClassName}
						id={id}
						maxLength={200}
						onChange={(event) => setLocator(event.target.value)}
						placeholder="e.g. 439–440"
						value={locator}
					/>
				)}
			</EvidenceField>
			<OptionPills
				label="Strength"
				onChange={setStrength}
				options={strengthOptions}
				value={strength}
			/>
			<Link
				className={staffLinkClassName}
				search={{ step: "source" }}
				target="_blank"
				to="/work/sources/evidence"
			>
				New source
			</Link>
		</StaffFormDialog>
	);
}

/** Checks a typed reference and adds it as a chip, or as a cross-reference. */
export function ReferenceDialog({
	onSettle,
	variant,
}: {
	onSettle: (reference: ScriptureReferenceAttributes | null) => void;
	variant: ScriptureReferenceAttributes["variant"];
}) {
	const [text, setText] = useState("");
	const resolve = useMutation({
		mutationFn: () => resolveEditorReference({ data: { text } }),
		onSuccess: ({ bookSlug, label }) => onSettle({ bookSlug, label, variant }),
	});
	const isCross = variant === "cross";

	return (
		<StaffFormDialog
			canSubmit={text.trim().length > 0}
			description={
				isCross
					? 'Points readers to a related passage. It reads "See also" in the text.'
					: undefined
			}
			onOpenChange={(open) => {
				if (!open) onSettle(null);
			}}
			onSubmit={() => resolve.mutate()}
			open
			pending={resolve.isPending}
			submitLabel="Insert"
			title={isCross ? "Add a cross-reference" : "Add a Scripture reference"}
		>
			<EvidenceField
				hint={
					resolve.error ? undefined : "Write it like Rom 8:31 or 1 John 2:1-6."
				}
				label="Passage"
			>
				{(id) => (
					<Input
						autoFocus
						className={evidenceInputClassName}
						id={id}
						maxLength={100}
						onChange={(event) => {
							resolve.reset();
							setText(event.target.value);
						}}
						required
						value={text}
					/>
				)}
			</EvidenceField>
			{resolve.error ? (
				<p className="text-sm text-status-danger-foreground" role="alert">
					{resolve.error.message}
				</p>
			) : null}
		</StaffFormDialog>
	);
}

const languageOptions = [
	{ label: "Greek", value: "greek" },
	{ label: "Hebrew", value: "hebrew" },
] as const;

/** Adds a Greek or Hebrew word, typed for now. Choosing from the text comes later. */
export function OriginalTermDialog({
	onSettle,
}: {
	onSettle: (term: OriginalTermAttributes | null) => void;
}) {
	const [language, setLanguage] =
		useState<OriginalTermAttributes["language"]>("greek");
	const [word, setWord] = useState("");
	const [gloss, setGloss] = useState("");

	return (
		<StaffFormDialog
			canSubmit={word.trim().length > 0}
			description="A draft with a Greek or Hebrew word also needs a check by a Greek Reviewer."
			onOpenChange={(open) => {
				if (!open) onSettle(null);
			}}
			onSubmit={() =>
				onSettle({ gloss: gloss.trim(), language, word: word.trim() })
			}
			open
			pending={false}
			submitLabel="Insert"
			title="Add a Greek or Hebrew word"
		>
			<OptionPills
				label="Language"
				onChange={setLanguage}
				options={languageOptions}
				value={language}
			/>
			<EvidenceField label="Word">
				{(id) => (
					<Input
						autoFocus
						className={evidenceInputClassName}
						dir={language === "hebrew" ? "rtl" : undefined}
						id={id}
						lang={language === "hebrew" ? "he" : "grc"}
						maxLength={100}
						onChange={(event) => setWord(event.target.value)}
						required
						value={word}
					/>
				)}
			</EvidenceField>
			<EvidenceField
				hint="Shown when someone points at the word."
				label="Short meaning"
			>
				{(id) => (
					<Input
						className={evidenceInputClassName}
						id={id}
						maxLength={200}
						onChange={(event) => setGloss(event.target.value)}
						placeholder="will separate"
						value={gloss}
					/>
				)}
			</EvidenceField>
		</StaffFormDialog>
	);
}
