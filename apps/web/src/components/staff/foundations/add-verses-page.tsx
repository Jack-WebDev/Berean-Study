import { translationCatalogue } from "@berean-study/db/scripture-catalogue";
import { Input } from "@berean-study/ui/components/input";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";

import { proposeVerseAddition } from "@/functions/structure";
import { bookStructureQueryOptions } from "@/queries/scripture-data";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import {
	type HandlingAnswer,
	TranslationHandlingFields,
} from "./translation-handling-fields";
import { useFoundationMutation } from "./use-foundation-mutation";

const stepLabels = ["What", "Where", "Translations", "Readers", "Review"];

const everyoneHasIt: HandlingAnswer[] = translationCatalogue.map(
	({ abbreviation }) => ({
		abbreviation,
		includedInVerse: null,
		kind: "own",
	}),
);

function readerEffect(answer: HandlingAnswer, verseLabel: string) {
	switch (answer.kind) {
		case "own":
			return `See ${verseLabel} once its text is entered, proofread and published.`;
		case "bracketed":
			return `See ${verseLabel} in brackets once its text is published.`;
		case "included_in":
			return `Are taken to verse ${answer.includedInVerse}, which contains it.`;
		case "omitted_footnote":
			return `See that ${verseLabel} is left out, with a footnote.`;
		case "not_in_translation":
			return `See "Not in this translation".`;
	}
}

export function AddVersesPage({
	chapter,
	slug,
}: {
	chapter?: number;
	slug: string;
}) {
	const navigate = useNavigate();
	const { data } = useSuspenseQuery(
		bookStructureQueryOptions({ chapter, slug }),
	);
	const chapterSelectId = useId();
	const throughId = useId();
	const [step, setStep] = useState(0);
	const [several, setSeveral] = useState(false);
	const [throughText, setThroughText] = useState("");
	const [answers, setAnswers] = useState(everyoneHasIt);
	const [reason, setReason] = useState("");

	const send = useFoundationMutation((input: { lastVerse: number }) => {
		if (data?.chapter === null || data?.chapter === undefined) {
			throw new Error("Choose a chapter first.");
		}
		return proposeVerseAddition({
			data: {
				chapter: data.chapter,
				handling: answers,
				lastVerse: input.lastVerse,
				reason,
				slug,
			},
		});
	});

	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this book</h1>
				<Link className={cn(staffLinkClassName, "mt-6")} to="/admin/scripture">
					Back to Scripture data
				</Link>
			</div>
		);
	}

	const existing = data.verses.map(({ number }) => number);
	const nextVerse = (existing.at(-1) ?? 0) + 1;
	const lastVerse = several ? Number(throughText) || nextVerse : nextVerse;
	const validRange = lastVerse >= nextVerse && lastVerse <= 176;
	const reference = `${data.book.name} ${data.chapter}`;
	const verseLabel =
		lastVerse > nextVerse
			? `verses ${nextVerse}–${lastVerse}`
			: `verse ${nextVerse}`;
	const hasChapter = data.chapter !== null;
	const includedNeedsVerse = answers.some(
		({ includedInVerse, kind }) => kind === "included_in" && !includedInVerse,
	);
	const canContinue =
		(step !== 1 || (hasChapter && validRange)) &&
		(step !== 2 || !includedNeedsVerse);
	const stepForward = Math.min(step + 1, stepLabels.length - 1);

	return (
		<StaffPage
			description="For a verse the translations number differently. Everyday verses are added in Scripture entry instead."
			section="Scripture structure change"
			title={several ? "Add verses" : "Add a verse"}
		>
			<ol
				aria-label="Steps"
				className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5"
			>
				{stepLabels.map((label, index) => (
					<li key={label}>
						<button
							aria-current={index === step ? "step" : undefined}
							className={cn(
								"flex min-h-14 w-full flex-col items-start rounded-xl border p-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								index === step
									? "border-accent bg-sidebar-accent"
									: "border-border bg-card hover:bg-muted",
							)}
							// Skipping ahead could pass a step whose answer isn't valid yet.
							disabled={index > step}
							onClick={() => setStep(index)}
							type="button"
						>
							<span className="text-muted-foreground text-xs">{index + 1}</span>
							<span className="font-medium">{label}</span>
						</button>
					</li>
				))}
			</ol>

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<StaffCard>
					{step === 0 ? (
						<fieldset className="space-y-3">
							<legend className="mb-3 font-serif text-xl">
								What are you adding?
							</legend>
							{(
								[
									[false, "A verse", "One new verse at the end of a chapter."],
									[
										true,
										"Several verses",
										"A run of new verses at the end of a chapter.",
									],
								] as const
							).map(([value, label, description]) => (
								<label
									className="flex min-h-14 items-start gap-3 rounded-xl border border-border p-3"
									key={label}
								>
									<input
										checked={several === value}
										className="mt-1 size-4 accent-primary"
										name="what"
										onChange={() => setSeveral(value)}
										type="radio"
									/>
									<span>
										<span className="block font-semibold text-sm">{label}</span>
										<span className="text-muted-foreground text-sm">
											{description}
										</span>
									</span>
								</label>
							))}
							<p className="rounded-[0.625rem] bg-muted p-3 text-sm">
								Adding a chapter? Chapters come from each canon's limit. Raise
								the limit on{" "}
								<Link
									className="underline underline-offset-2"
									to="/admin/canon"
								>
									Canon & Versification
								</Link>
								, then the chapter can be added in Scripture entry.
							</p>
						</fieldset>
					) : null}

					{step === 1 ? (
						<div className="space-y-4">
							<h2 className="font-serif text-xl">Where does it go?</h2>
							<div className="flex flex-wrap gap-4">
								<div className="space-y-1">
									<p className="font-semibold text-sm">Book</p>
									<p className="flex h-11 items-center text-sm">
										{data.book.name}
									</p>
								</div>
								<div className="space-y-1">
									<label
										className="font-semibold text-sm"
										htmlFor={chapterSelectId}
									>
										Chapter
									</label>
									<select
										className="block h-11 rounded-[0.625rem] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
										id={chapterSelectId}
										onChange={(event) =>
											void navigate({
												params: { bookSlug: slug },
												search: { chapter: Number(event.target.value) },
												to: "/admin/scripture/$bookSlug/add-verses",
											})
										}
										value={data.chapter ?? ""}
									>
										{data.chapters.map(({ number }) => (
											<option key={number} value={number}>
												{number}
											</option>
										))}
									</select>
								</div>
								{several ? (
									<div className="space-y-1">
										<label
											className="font-semibold text-sm"
											htmlFor={throughId}
										>
											Through verse
										</label>
										<Input
											className="h-11 w-24 rounded-[0.625rem] text-sm"
											id={throughId}
											inputMode="numeric"
											onChange={(event) => setThroughText(event.target.value)}
											placeholder={String(nextVerse + 1)}
											value={throughText}
										/>
									</div>
								) : null}
							</div>

							{!hasChapter ? (
								<p className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
									{data.book.name} has no chapters yet. Add one in Scripture
									entry first.
								</p>
							) : null}
							{hasChapter && !validRange ? (
								<p className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
									This has to be a verse from {nextVerse} to 176.
								</p>
							) : null}

							<fieldset className="space-y-2">
								<legend className="font-semibold text-sm">Position</legend>
								<label className="flex items-start gap-3 rounded-xl border border-accent p-3">
									<input
										checked
										className="mt-1 size-4 accent-primary"
										name="position"
										readOnly
										type="radio"
									/>
									<span className="text-sm">
										<span className="block font-semibold">
											At the end of {reference} (as {verseLabel})
										</span>
										<span className="text-muted-foreground">
											Nothing existing moves.
										</span>
									</span>
								</label>
								<label className="flex items-start gap-3 rounded-xl border border-border p-3 opacity-70">
									<input
										className="mt-1 size-4"
										disabled
										name="position"
										type="radio"
									/>
									<span className="text-sm">
										<span className="block font-semibold">
											Insert in the middle
										</span>
										<span className="text-muted-foreground">
											Not available: it would renumber everything after it and
											break references, notes and links. To show a verse as part
											of another, use Split / merge verse on Chapters & verses.
										</span>
									</span>
								</label>
							</fieldset>
						</div>
					) : null}

					{step === 2 ? (
						<div className="space-y-4">
							<h2 className="font-serif text-xl">
								How does each translation handle it?
							</h2>
							<p className="text-muted-foreground text-sm">
								Every one of the six needs an answer. The text is typed or
								pasted afterwards in Scripture entry.
							</p>
							<TranslationHandlingFields
								answers={answers}
								onChange={setAnswers}
								verses={existing}
							/>
						</div>
					) : null}

					{step === 3 ? (
						<div className="space-y-4">
							<h2 className="font-serif text-xl">What readers will see</h2>
							<ul>
								{answers.map((answer) => (
									<li
										className="flex gap-3 border-border-subtle border-b py-2 text-sm last:border-b-0"
										key={answer.abbreviation}
									>
										<span className="w-12 shrink-0 font-bold">
											{answer.abbreviation}
										</span>
										<span>{readerEffect(answer, verseLabel)}</span>
									</li>
								))}
							</ul>
							<p className="rounded-[0.625rem] bg-muted p-3 text-sm">
								Nothing is renumbered. Anything linked to the verse before it is
								listed for the second Superadmin to review.
							</p>
						</div>
					) : null}

					{step === 4 ? (
						<div className="space-y-4">
							<h2 className="font-serif text-xl">Review & send</h2>
							<dl>
								{[
									["Adding", `${reference}, ${verseLabel}`],
									["Position", "At the end, nothing moves"],
									[
										"Own verse in",
										answers
											.filter(({ kind }) => kind === "own")
											.map(({ abbreviation }) => abbreviation)
											.join(", ") || "None",
									],
								].map(([term, value]) => (
									<div
										className="flex justify-between gap-3 border-border-subtle border-b py-2 text-sm"
										key={term}
									>
										<dt className="text-muted-foreground">{term}</dt>
										<dd className="text-right font-medium">{value}</dd>
									</div>
								))}
							</dl>
							<ReasonField
								hint="Shown to the second Superadmin and kept in the audit log."
								onChange={setReason}
								value={reason}
							/>
							{send.data ? (
								<div
									className="rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground"
									role="status"
								>
									<p>
										Sent. Nothing changes for readers until a second Superadmin
										confirms.
									</p>
									<Link
										className="mt-1 inline-block underline underline-offset-2"
										params={{ proposalId: String(send.data) }}
										to="/admin/scripture/changes/$proposalId"
									>
										See this change
									</Link>
								</div>
							) : (
								<StaffButton
									disabled={!reason.trim() || send.isPending}
									onClick={() => send.mutate({ lastVerse })}
								>
									Send for confirmation
								</StaffButton>
							)}
						</div>
					) : null}

					<div className="mt-6 flex flex-wrap gap-2 border-border-subtle border-t pt-4">
						{step > 0 && !send.data ? (
							<StaffButton
								onClick={() => setStep((current) => current - 1)}
								variant="outline"
							>
								Back
							</StaffButton>
						) : null}
						{step < stepLabels.length - 1 ? (
							<StaffButton
								disabled={!canContinue}
								onClick={() => setStep(stepForward)}
							>
								Continue
							</StaffButton>
						) : null}
					</div>
				</StaffCard>

				<aside>
					<StaffCard>
						<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
							So far
						</p>
						<p className="mt-2 font-serif text-xl">
							{hasChapter ? `${reference}, ${verseLabel}` : data.book.name}
						</p>
						<p className="mt-2 text-muted-foreground text-xs">
							Superadmin only. Needs a second Superadmin. Recorded in the audit
							log.
						</p>
					</StaffCard>
				</aside>
			</div>
		</StaffPage>
	);
}
