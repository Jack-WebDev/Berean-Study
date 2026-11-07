import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	checkVerseText,
	formatVerseList,
} from "@berean-study/db/verse-text-tools";
import { Input } from "@berean-study/ui/components/input";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
	markVerse,
	passChapter,
	sendBackVerses,
} from "@/functions/verse-proofreading";
import { proofreadingChapterQueryOptions } from "@/queries/verse-text";

import { StaffButton, staffLinkClassName } from "../../staff-button";
import { StaffCard } from "../../staff-card";
import { StaffPage } from "../../staff-page";
import { StatusChip } from "../../status-chip";
import {
	MarkedVerseText,
	useVerseTextMutation,
	VerseStatusChip,
	WordDiff,
} from "../verse-text-display";
import { PublishChapterButton } from "./publish-chapter-button";
import { ReopenChapterButton } from "./reopen-chapter-button";

type ChapterAddress = { abbreviation: string; chapter: number; slug: string };
type ProofreadingData = Awaited<
	ReturnType<
		NonNullable<ReturnType<typeof proofreadingChapterQueryOptions>["queryFn"]>
	>
>;
type ProofreadVerse = ProofreadingData["verses"][number];

const publishingBlockNotes = {
	permission_not_recorded: (abbreviation: string) =>
		`${abbreviation} can be proofread now, but it can't be published until the rights holder's permission is recorded.`,
	licence_ended: (abbreviation: string) =>
		`The ${abbreviation} licence has ended, so it can't be published until it's renewed.`,
};

export function ProofreadingPage({
	address,
	permissionKeys,
}: {
	address: ChapterAddress;
	permissionKeys: readonly PermissionKey[];
}) {
	const { data } = useSuspenseQuery(proofreadingChapterQueryOptions(address));
	const round = data.verses.filter(({ status }) => status === "submitted");
	const others = data.verses.filter(({ status }) => status !== "submitted");
	const canProofread = permissionKeys.includes("scripture.proofread");

	// Verses already matching when the page opened fold away. One marked just now
	// stays put, so it doesn't jump out from under the person checking.
	const [alreadyMatched] = useState(
		() =>
			new Set(
				round
					.filter(({ proofMark }) => proofMark === "matches")
					.map(({ number }) => number),
			),
	);
	const [showMatched, setShowMatched] = useState(false);
	const visibleRound = showMatched
		? round
		: round.filter(({ number }) => !alreadyMatched.has(number));
	const hiddenRound = round.length - visibleRound.length;

	return (
		<StaffPage
			actions={
				<Link className={staffLinkClassName} to="/work/scripture/proofreading">
					All chapters
				</Link>
			}
			description="Read each verse against a printed or trusted copy, then mark it. Highlights are automatic checks, not errors for certain."
			section="Proofread against your own copy"
			title={`${data.book.name} ${data.chapter} · ${data.translation.abbreviation}`}
		>
			{data.enterers.length > 0 ? (
				<p className="mb-5 text-muted-foreground text-sm">
					Entered by {data.enterers.join(", ")}
				</p>
			) : null}

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<div className="min-w-0 space-y-3">
					{round.length === 0 ? (
						<StaffCard>
							<p className="text-muted-foreground text-sm">
								Nothing in this chapter is waiting to be checked.
							</p>
						</StaffCard>
					) : null}

					{hiddenRound > 0 ? (
						<p className="py-1 text-muted-foreground text-sm">
							{hiddenRound} {hiddenRound === 1 ? "verse" : "verses"} already
							marked as matching.{" "}
							<button
								className="underline underline-offset-2"
								onClick={() => setShowMatched(true)}
								type="button"
							>
								Show
							</button>
						</p>
					) : null}

					{visibleRound.map((verse) => (
						<ProofreadCard
							address={address}
							canProofread={canProofread}
							key={verse.number}
							verse={verse}
						/>
					))}

					{others.length > 0 ? (
						<StaffCard title="Already through this step">
							<ul>
								{others.map((verse) => (
									<li
										className="flex items-start gap-3 border-border-subtle border-t py-2 first:border-t-0"
										key={verse.number}
									>
										<span className="w-8 shrink-0 text-right font-bold text-sm tabular-nums">
											{verse.number}
										</span>
										<span className="min-w-0 flex-1 whitespace-pre-line font-serif">
											{verse.text}
										</span>
										<VerseStatusChip status={verse.status} />
									</li>
								))}
							</ul>
						</StaffCard>
					) : null}
				</div>

				<aside className="space-y-4">
					<ChapterResult
						address={address}
						canProofread={canProofread}
						data={data}
						permissionKeys={permissionKeys}
					/>
					<StaffCard title="Automatic checks">
						<p className="text-muted-foreground text-sm">
							Verse numbers inside text, double spaces, straight quotes, missing
							end punctuation, and the verse count for the chapter.
						</p>
						{data.verseCount.entered < data.verseCount.total ? (
							<p className="mt-3 rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
								This chapter has {data.verseCount.total} verses, but only{" "}
								{data.verseCount.entered} have {data.translation.abbreviation}{" "}
								text.
							</p>
						) : null}
					</StaffCard>
				</aside>
			</div>
		</StaffPage>
	);
}

function ProofreadCard({
	address,
	canProofread,
	verse,
}: {
	address: ChapterAddress;
	canProofread: boolean;
	verse: ProofreadVerse;
}) {
	const textId = useId();
	const noteId = useId();
	const [fixing, setFixing] = useState(false);
	const [suggestedText, setSuggestedText] = useState(
		verse.suggestedText ?? verse.text,
	);
	const [note, setNote] = useState(verse.proofNote ?? "");
	const checks = checkVerseText(verse.text);
	const { proofMark } = verse;

	const mark = useVerseTextMutation(
		(result: Parameters<typeof markVerse>[0]["data"]["result"]) =>
			markVerse({ data: { ...address, result, verse: verse.number } }),
		() => setFixing(false),
	);

	return (
		<article
			className={cn(
				"rounded-[0.875rem] border bg-card p-4",
				proofMark === "needs_fix"
					? "border-status-danger-foreground/40"
					: checks.length > 0
						? "border-accent"
						: "border-border",
			)}
		>
			<div className="flex items-start gap-3">
				<span className="w-8 shrink-0 pt-1 text-right font-bold text-sm tabular-nums">
					{verse.number}
				</span>
				<div className="min-w-0 flex-1 space-y-2">
					<MarkedVerseText checks={checks} text={verse.text} />
					{checks.map((check) => (
						<p
							className="text-status-attention-foreground text-xs"
							key={check.code}
						>
							{check.message}
						</p>
					))}

					{verse.correctionReason ? (
						<div className="space-y-2 rounded-[0.625rem] border border-border-subtle p-3 text-sm">
							<p>
								<span className="font-semibold">
									Correction to published text:
								</span>{" "}
								{verse.correctionReason}
							</p>
							{verse.checkedAgainst ? (
								<p className="text-muted-foreground text-xs">
									Checked against {verse.checkedAgainst}
								</p>
							) : null}
							{verse.publishedText ? (
								<WordDiff after={verse.text} before={verse.publishedText} />
							) : null}
						</div>
					) : null}

					{proofMark === "needs_fix" && !fixing ? (
						<div className="rounded-[0.625rem] bg-status-danger p-3 text-sm text-status-danger-foreground">
							{verse.proofreadByName ? (
								<p className="font-semibold">
									Marked by{" "}
									{verse.proofreadByMe ? "you" : verse.proofreadByName}
								</p>
							) : null}
							{verse.proofNote ? <p>{verse.proofNote}</p> : null}
							{verse.suggestedText ? (
								<p className="mt-1 font-serif">{verse.suggestedText}</p>
							) : null}
						</div>
					) : null}

					{fixing ? (
						<form
							className="space-y-2"
							onSubmit={(event) => {
								event.preventDefault();
								mark.mutate({ mark: "needs_fix", note, suggestedText });
							}}
						>
							<label className="block font-semibold text-xs" htmlFor={textId}>
								Corrected text
							</label>
							<Textarea
								className="min-h-14 rounded-[0.625rem] font-serif text-base md:text-base"
								id={textId}
								onChange={(event) => setSuggestedText(event.target.value)}
								value={suggestedText}
							/>
							<label className="block font-semibold text-xs" htmlFor={noteId}>
								Note to the person who entered it
							</label>
							<Input
								className="h-11 rounded-[0.625rem] text-sm"
								id={noteId}
								maxLength={500}
								onChange={(event) => setNote(event.target.value)}
								value={note}
							/>
							<div className="flex flex-wrap gap-2">
								<StaffButton disabled={mark.isPending} type="submit">
									Save this fix
								</StaffButton>
								<StaffButton
									onClick={() => setFixing(false)}
									type="button"
									variant="outline"
								>
									Cancel
								</StaffButton>
							</div>
						</form>
					) : null}
				</div>
			</div>

			<div className="mt-3 flex flex-wrap items-center justify-end gap-2">
				{verse.enteredByMe ? (
					<p className="mr-auto text-muted-foreground text-xs">
						You entered this verse, so someone else has to check it.
					</p>
				) : null}
				<StatusChip
					tone={
						proofMark === "matches"
							? "success"
							: proofMark === "needs_fix"
								? "danger"
								: "neutral"
					}
				>
					{proofMark === "matches"
						? "Matches"
						: proofMark === "needs_fix"
							? "Needs a fix"
							: "Not checked"}
				</StatusChip>
				{canProofread && !verse.enteredByMe ? (
					<>
						<StaffButton
							aria-pressed={proofMark === "matches"}
							className={cn(
								"rounded-full",
								proofMark === "matches" &&
									"bg-progress-published text-progress-published-foreground hover:bg-progress-published",
							)}
							disabled={mark.isPending}
							onClick={() =>
								mark.mutate({
									mark: proofMark === "matches" ? null : "matches",
								})
							}
							variant={proofMark === "matches" ? "default" : "outline"}
						>
							✓ Matches
						</StaffButton>
						<StaffButton
							aria-pressed={proofMark === "needs_fix" || fixing}
							className="rounded-full"
							disabled={mark.isPending}
							onClick={() => setFixing((current) => !current)}
							variant={proofMark === "needs_fix" ? "destructive" : "outline"}
						>
							Needs a fix
						</StaffButton>
					</>
				) : null}
			</div>
		</article>
	);
}

function ChapterResult({
	address,
	canProofread,
	data,
	permissionKeys,
}: {
	address: ChapterAddress;
	canProofread: boolean;
	data: ProofreadingData;
	permissionKeys: readonly PermissionKey[];
}) {
	const { checked, needFix, total } = data.progress;
	const block = data.translation.publishingBlock;
	const canPublish = permissionKeys.includes("publication.publish");
	const name = `${data.book.name} ${data.chapter} (${data.translation.abbreviation})`;

	const roundNumbers = data.verses
		.filter(({ status }) => status === "submitted")
		.map(({ number }) => number);
	const stillBlockingAfterPass = data.versesBlockingPublication.filter(
		(number) => !roundNumbers.includes(number),
	);
	const canPublishOnPass =
		canPublish && !block && stillBlockingAfterPass.length === 0;

	const pass = useVerseTextMutation(
		(publish: boolean) => passChapter({ data: { ...address, publish } }),
		(_result, publish) =>
			toast.success(
				publish ? `${name} is live for readers.` : `${name} has passed.`,
			),
	);
	const sendBack = useVerseTextMutation(
		() => sendBackVerses({ data: address }),
		({ sent }) =>
			toast.success(
				`Sent ${sent} ${sent === 1 ? "verse" : "verses"} back. The rest stay marked as matching.`,
			),
	);

	const enterers = [
		...new Set(
			data.verses
				.filter(
					({ proofMark, status }) =>
						status === "submitted" && proofMark === "needs_fix",
				)
				.flatMap(({ enteredByName }) => enteredByName ?? []),
		),
	];
	const allChecked = total > 0 && checked === total;
	const canFinish = canProofread && allChecked && needFix === 0;

	return (
		<StaffCard className="border-primary" title="Chapter result">
			{total > 0 ? (
				<>
					<div
						aria-hidden="true"
						className="h-2 overflow-hidden rounded-full bg-progress-not-started"
					>
						<div
							className="h-full bg-progress-published"
							style={{ width: `${(checked / total) * 100}%` }}
						/>
					</div>
					<p className="mt-2 text-sm" role="status">
						{checked} of {total} {total === 1 ? "verse" : "verses"} checked ·{" "}
						{needFix} need{needFix === 1 ? "s" : ""} a fix
					</p>
				</>
			) : null}

			<div className="mt-3 space-y-2">
				{canFinish && data.viewerHasChecked ? (
					<StaffButton
						className="w-full"
						disabled={pass.isPending}
						onClick={() => pass.mutate(canPublishOnPass)}
					>
						{canPublishOnPass ? "Pass & publish chapter" : "Pass chapter"}
					</StaffButton>
				) : null}
				{canFinish && !data.viewerHasChecked ? (
					<p className="text-muted-foreground text-sm">
						All verses are checked. Someone who checked at least one of them can
						pass the chapter.
					</p>
				) : null}
				{canProofread && needFix > 0 ? (
					<StaffButton
						className="w-full"
						disabled={sendBack.isPending}
						onClick={() => sendBack.mutate(undefined)}
						variant="outline"
					>
						Send {needFix} {needFix === 1 ? "verse" : "verses"} back to{" "}
						{enterers.join(", ")}
					</StaffButton>
				) : null}

				{total === 0 && data.passedVerses > 0 ? (
					<>
						<p className="text-sm" role="status">
							{data.passedVerses}{" "}
							{data.passedVerses === 1 ? "verse has" : "verses have"} passed
							proofreading.
						</p>
						{data.versesBlockingPublication.length > 0 ? (
							<p className="text-muted-foreground text-sm">
								Still waiting on verse{" "}
								{formatVerseList(data.versesBlockingPublication)}, so readers
								don't see gaps.
							</p>
						) : null}
						{canPublish &&
						!block &&
						data.versesBlockingPublication.length === 0 ? (
							<PublishChapterButton
								address={address}
								bookName={data.book.name}
								passedVerses={data.passedVerses}
							/>
						) : null}
						{!canPublish ? (
							<p className="text-muted-foreground text-sm">
								An Admin or Superadmin will publish it.
							</p>
						) : null}
					</>
				) : null}

				{data.passedVerses > 0 ? (
					<ReopenChapterButton
						address={address}
						name={name}
						passedVerses={data.passedVerses}
					/>
				) : null}

				{data.noTextSourceYet ? (
					<p className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
						This chapter is from another canon, and no text source has been
						chosen. Only pass it if you have a real copy to check it against.
					</p>
				) : null}

				{block ? (
					<p className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
						{publishingBlockNotes[block](data.translation.abbreviation)}
					</p>
				) : null}
			</div>

			<p className="mt-3 text-muted-foreground text-xs">
				You can't proofread verses you entered yourself. Both names are kept on
				every verse.
			</p>
		</StaffCard>
	);
}
