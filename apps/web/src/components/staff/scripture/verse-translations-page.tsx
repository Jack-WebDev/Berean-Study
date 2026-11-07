import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { versePresenceLabels } from "@berean-study/db/scripture-catalogue";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";

import { proposeVerseCorrection } from "@/functions/verse-entry";
import { formatStaffDate } from "@/lib/format";
import { verseAcrossTranslationsQueryOptions } from "@/queries/verse-text";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import {
	useVerseTextMutation,
	VerseStatusChip,
	WordDiff,
} from "./verse-text-display";

type VerseData = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<
				ReturnType<typeof verseAcrossTranslationsQueryOptions>["queryFn"]
			>
		>
	>
>;
type TranslationRow = VerseData["translations"][number];

export function VerseTranslationsPage({
	chapter,
	permissionKeys,
	slug,
	verse,
}: {
	chapter: number;
	permissionKeys: readonly PermissionKey[];
	slug: string;
	verse: number;
}) {
	const { data } = useSuspenseQuery(
		verseAcrossTranslationsQueryOptions({ chapter, slug, verse }),
	);

	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this verse</h1>
				<Link
					className={cn(staffLinkClassName, "mt-6")}
					params={{ bookSlug: slug }}
					to="/admin/scripture/$bookSlug/chapters"
				>
					Back to chapters & verses
				</Link>
			</div>
		);
	}

	const canEnter = permissionKeys.includes("scripture.enter");
	const canProofread = permissionKeys.includes("scripture.proofread");
	const { commentary, crossReferences, themes } = data.linked;

	return (
		<StaffPage
			actions={
				<>
					{data.previous ? (
						<VerseLink
							chapter={data.previous.chapter}
							label="Previous verse"
							slug={slug}
							verse={data.previous.verse}
						>
							← {data.previous.chapter}:{data.previous.verse}
						</VerseLink>
					) : null}
					{data.next ? (
						<VerseLink
							chapter={data.next.chapter}
							label="Next verse"
							slug={slug}
							verse={data.next.verse}
						>
							{data.next.chapter}:{data.next.verse} →
						</VerseLink>
					) : null}
				</>
			}
			section={`Verse · ${data.verseCode}`}
			title={data.reference}
		>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<div className="min-w-0 space-y-3">
					{data.translations.map((row) => (
						<TranslationCard
							canEnter={canEnter}
							canProofread={canProofread}
							chapter={chapter}
							// Starting again after a correction, from what's now published.
							key={`${row.abbreviation}-${row.publishedText}`}
							row={row}
							slug={slug}
							verse={verse}
						/>
					))}
				</div>

				<aside className="space-y-4">
					<StaffCard title="Verse record">
						<dl>
							{[
								["Reference", data.reference],
								["Versification", data.versification],
								["Published in", `${data.publishedIn} of 6 translations`],
								[
									"Linked content",
									`${commentary} commentary, ${crossReferences} cross-references, ${themes} themes`,
								],
							].map(([term, value]) => (
								<div
									className="flex justify-between gap-3 border-border-subtle border-t py-2 text-sm first:border-t-0"
									key={term}
								>
									<dt className="text-muted-foreground">{term}</dt>
									<dd className="text-right font-medium">{value}</dd>
								</div>
							))}
						</dl>
					</StaffCard>

					<StaffCard title="Correction history">
						{data.history.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No text has been entered for this verse yet.
							</p>
						) : (
							<ul>
								{data.history.map((event) => (
									<li
										className="border-border-subtle border-t py-2 first:border-t-0"
										key={`${event.label}-${event.at.toISOString()}`}
									>
										<p className="font-medium text-sm">{event.label}</p>
										<p className="text-muted-foreground text-xs">
											{event.by} · {formatStaffDate(event.at)}
										</p>
									</li>
								))}
							</ul>
						)}
					</StaffCard>
				</aside>
			</div>
		</StaffPage>
	);
}

function VerseLink({
	chapter,
	children,
	label,
	slug,
	verse,
}: {
	chapter: number;
	children: React.ReactNode;
	label: string;
	slug: string;
	verse: number;
}) {
	return (
		<Link
			aria-label={label}
			className={staffLinkClassName}
			params={{
				bookSlug: slug,
				chapter: String(chapter),
				verse: String(verse),
			}}
			to="/work/scripture/verse/$bookSlug/$chapter/$verse"
		>
			{children}
		</Link>
	);
}

function TranslationCard({
	canEnter,
	canProofread,
	chapter,
	row,
	slug,
	verse,
}: {
	canEnter: boolean;
	canProofread: boolean;
	chapter: number;
	row: TranslationRow;
	slug: string;
	verse: number;
}) {
	const [correcting, setCorrecting] = useState(false);
	const entrySearch = { book: slug, chapter, t: row.abbreviation };
	const who = row.enteredByMe ? "you" : row.enteredByName;

	return (
		<section
			aria-label={row.abbreviation}
			className={cn(
				"rounded-2xl border bg-card p-5",
				correcting ? "border-primary" : "border-border",
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<span className="font-bold">{row.abbreviation}</span>
					{row.needsOwnText ? <VerseStatusChip status={row.status} /> : null}
				</div>
				{row.needsOwnText && !correcting ? (
					<>
						{row.status === "published" && canEnter ? (
							<StaffButton
								onClick={() => setCorrecting(true)}
								variant="outline"
							>
								Correct text
							</StaffButton>
						) : null}
						{(row.status === "submitted" || row.status === "proofread") &&
						canProofread ? (
							<Link
								className={staffLinkClassName}
								params={{
									bookSlug: slug,
									chapter: String(chapter),
									translation: row.abbreviation,
								}}
								to="/work/scripture/proofreading/$translation/$bookSlug/$chapter"
							>
								Open
							</Link>
						) : null}
						{(row.status === "draft" || row.status === "needs_fix") &&
						canEnter ? (
							<Link
								className={staffLinkClassName}
								search={entrySearch}
								to="/work/scripture"
							>
								Continue
							</Link>
						) : null}
						{row.status === "empty" && canEnter ? (
							<Link
								className={staffLinkClassName}
								search={entrySearch}
								to="/work/scripture"
							>
								Enter text
							</Link>
						) : null}
					</>
				) : null}
			</div>

			{!row.needsOwnText ? (
				<p className="mt-3 text-muted-foreground text-sm">
					{row.presenceKind ? versePresenceLabels[row.presenceKind] : null}
					{row.includedInVerse ? ` (verse ${row.includedInVerse})` : ""}. No
					text of its own in {row.abbreviation}.
				</p>
			) : null}

			{row.publishedText && !correcting ? (
				<p className="mt-3 whitespace-pre-line font-serif text-lg leading-relaxed">
					{row.publishedText}
				</p>
			) : null}

			{row.revisionText ? (
				<div className="mt-3 space-y-2 rounded-[0.625rem] border border-border border-dashed bg-muted p-3 text-sm">
					<p className="text-muted-foreground">
						{row.correctionReason
							? `Correction proposed by ${who}: ${row.correctionReason}`
							: `Entered by ${who}`}
						. Not shown to readers yet.
					</p>
					{row.publishedText ? (
						<WordDiff after={row.revisionText} before={row.publishedText} />
					) : (
						<p className="whitespace-pre-line font-serif text-base">
							{row.revisionText}
						</p>
					)}
				</div>
			) : null}

			{row.status === "empty" && row.needsOwnText ? (
				<p className="mt-3 rounded-[0.625rem] border border-border border-dashed bg-muted p-3 text-muted-foreground text-sm">
					No {row.abbreviation} text entered for this verse yet.
				</p>
			) : null}

			{correcting && row.publishedText ? (
				<CorrectionForm
					abbreviation={row.abbreviation}
					chapter={chapter}
					onClose={() => setCorrecting(false)}
					publishedText={row.publishedText}
					slug={slug}
					verse={verse}
				/>
			) : null}
		</section>
	);
}

function CorrectionForm({
	abbreviation,
	chapter,
	onClose,
	publishedText,
	slug,
	verse,
}: {
	abbreviation: string;
	chapter: number;
	onClose: () => void;
	publishedText: string;
	slug: string;
	verse: number;
}) {
	const textId = useId();
	const checkedId = useId();
	const [text, setText] = useState(publishedText);
	const [reason, setReason] = useState("");
	const [checkedAgainst, setCheckedAgainst] = useState("");
	const changed = text.trim() !== publishedText && text.trim() !== "";

	const send = useVerseTextMutation(
		() =>
			proposeVerseCorrection({
				data: {
					abbreviation,
					chapter,
					checkedAgainst,
					reason,
					slug,
					text,
					verse,
				},
			}),
		() => {
			onClose();
			toast.success(
				"Correction sent for proofreading. Readers see the current text until someone else checks it.",
			);
		},
	);

	return (
		<form
			className="mt-3 space-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				if (changed && reason.trim()) send.mutate(undefined);
			}}
		>
			<div className="space-y-2">
				<Label htmlFor={textId}>{abbreviation} text</Label>
				<Textarea
					className="min-h-24 rounded-[0.625rem] font-serif text-lg md:text-lg"
					id={textId}
					onChange={(event) => setText(event.target.value)}
					value={text}
				/>
			</div>
			{changed ? <WordDiff after={text.trim()} before={publishedText} /> : null}
			<ReasonField
				label="Reason (required)"
				onChange={setReason}
				value={reason}
			/>
			<div className="space-y-2">
				<Label htmlFor={checkedId}>Checked against</Label>
				<Input
					className="h-11 rounded-[0.625rem] text-sm"
					id={checkedId}
					maxLength={200}
					onChange={(event) => setCheckedAgainst(event.target.value)}
					placeholder="For example, the printed edition you compared with"
					value={checkedAgainst}
				/>
			</div>
			<div className="flex flex-wrap gap-2">
				<StaffButton
					disabled={!changed || !reason.trim() || send.isPending}
					type="submit"
				>
					Send for proofreading
				</StaffButton>
				<StaffButton onClick={onClose} type="button" variant="outline">
					Cancel
				</StaffButton>
			</div>
		</form>
	);
}
