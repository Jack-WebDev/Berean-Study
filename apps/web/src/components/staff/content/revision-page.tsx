import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { bookOverviewSchema } from "@berean-study/db/book-overview";
import {
	commentaryBodySchema,
	isCommentaryKind,
} from "@berean-study/db/commentary-body";
import { parseConnectionScopeKey } from "@berean-study/db/connection-body";
import {
	type ContentIssueType,
	type ContentRevisionStatus,
	contentIssueTypeLabels,
	contentIssueTypes,
	contentRevisionStatusLabels,
	type EditorialCheckResult,
} from "@berean-study/db/content-kinds";
import { citationStrengthLabels } from "@berean-study/db/evidence-body";
import { diffWords } from "@berean-study/db/verse-text-tools";
import { Input } from "@berean-study/ui/components/input";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
	approveRevision,
	publishRevision,
	raiseIssue,
	recordCheck,
	requestChanges,
	startReview,
	withdrawLive,
} from "@/functions/content";
import {
	decideFoundationalChange,
	requestPublicationConfirmation,
} from "@/functions/study-content";
import { formatStaffDate, formatStaffDateTime } from "@/lib/format";
import { invalidateContent, revisionPageQueryOptions } from "@/queries/content";
import { CommentaryPreview } from "../commentary/commentary-preview";
import { evidenceWorkbenchSearch } from "../evidence/evidence-display";
import { ChangeDecisionPanel } from "../foundations/change-decision-panel";
import { WordDiff } from "../scripture/verse-text-display";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import { StatusChip } from "../status-chip";
import {
	StudyPreview,
	type StudyPreviewInput,
	studyPreviewInput,
} from "../study/study-previews";
import { BookOverviewPreview } from "./book-overview-preview";
import { RevisionStatusChip, useContentMutation } from "./content-display";

export const revisionTabs = [
	"changes",
	"full",
	"sources",
	"issues",
	"history",
	"reader",
] as const;
export type RevisionTab = (typeof revisionTabs)[number];

type RevisionData = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof revisionPageQueryOptions>["queryFn"]>
		>
	>
>;

/** What this revision rests on, so a reviewer can follow each link back to its source. */
function RevisionCitations({
	citations,
}: {
	citations: RevisionData["citations"];
}) {
	return (
		<StaffCard title="Sources">
			{citations.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					This revision cites nothing.
				</p>
			) : (
				<ol className="divide-y divide-border-subtle">
					{citations.map((citation) => (
						<li className="py-3 first:pt-0 last:pb-0" key={citation.id}>
							<p className="flex flex-wrap items-center gap-2 font-semibold text-sm">
								{citation.position}.{" "}
								<Link
									className="underline-offset-4 hover:underline"
									search={evidenceWorkbenchSearch(
										"source_excerpt",
										String(citation.excerptId),
									)}
									to="/work/sources/evidence"
								>
									{citation.excerptTitle}
								</Link>
								<StatusChip tone="neutral">
									{citationStrengthLabels[citation.strength]}
								</StatusChip>
							</p>
							<p className="mt-1 text-muted-foreground text-sm">
								{citation.locator ? `${citation.locator} · ` : ""}
								{citationVersionNote(citation)}
							</p>
						</li>
					))}
				</ol>
			)}
		</StaffCard>
	);
}

function StudyEditorLink({
	input,
	scopeKey,
}: {
	input: StudyPreviewInput;
	scopeKey: string;
}) {
	if (
		input.kind === "cross_reference" ||
		input.kind === "canonical_relationship"
	) {
		const passage = parseConnectionScopeKey(input.kind, scopeKey)?.first;
		return (
			<Link
				className={staffLinkClassName}
				search={{ edit: scopeKey, passage, tab: input.kind }}
				to="/work/connections"
			>
				Open the editor
			</Link>
		);
	}
	if (input.kind === "interpretive_question") {
		return (
			<Link
				className={staffLinkClassName}
				search={{ id: scopeKey }}
				to="/work/questions"
			>
				Open the editor
			</Link>
		);
	}
	if (input.kind === "theme") {
		return (
			<Link
				className={staffLinkClassName}
				search={{ theme: Number(scopeKey) }}
				to="/work/themes"
			>
				Open the editor
			</Link>
		);
	}
	return (
		<Link
			className={staffLinkClassName}
			search={{ id: scopeKey, passage: input.body.passage, tab: input.kind }}
			to="/work/language"
		>
			Open the editor
		</Link>
	);
}

function citationVersionNote({
	liveExcerptNumber,
	pinnedExcerptNumber,
}: RevisionData["citations"][number]) {
	if (pinnedExcerptNumber) {
		return liveExcerptNumber && liveExcerptNumber !== pinnedExcerptNumber
			? `Published with excerpt revision #${pinnedExcerptNumber}. The excerpt is now on #${liveExcerptNumber}.`
			: `Published with excerpt revision #${pinnedExcerptNumber}.`;
	}
	return liveExcerptNumber
		? `Excerpt is live on revision #${liveExcerptNumber}.`
		: "This excerpt isn't live yet, and has to be before this can be published.";
}

const publicationStatusNotes: Record<ContentRevisionStatus, string> = {
	draft: "This is still a draft. Nobody has reviewed it yet.",
	submitted:
		"It can be published once someone other than its author approves it.",
	in_review:
		"It can be published once someone other than its author approves it.",
	changes_requested:
		"Changes were requested, so this revision won't be published. The fix becomes the next revision.",
	approved: "Approved, and waiting for someone who can publish.",
	published: "This revision is live.",
	superseded: "A newer revision has replaced this one.",
	withdrawn: "This revision was withdrawn. A new revision can follow.",
};

const checkResultLabels: Record<EditorialCheckResult, string> = {
	passed: "Passed",
	failed: "Failed",
	not_applicable: "Doesn't apply",
};

export function RevisionPage({
	contentItemId,
	permissionKeys,
	revisionId,
	tab,
}: {
	contentItemId: number;
	permissionKeys: readonly PermissionKey[];
	revisionId: number;
	tab: RevisionTab;
}) {
	const { data } = useSuspenseQuery(
		revisionPageQueryOptions({ contentItemId, revisionId }),
	);

	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this revision</h1>
				<Link className={cn(staffLinkClassName, "mt-6")} to="/work">
					Back to My Work
				</Link>
			</div>
		);
	}

	const { revision } = data;
	const isReviewable =
		revision.status === "submitted" || revision.status === "in_review";
	const canReview =
		permissionKeys.includes("editorial.review") && !data.isAuthor;
	const allChecksDone = data.checks.every(
		({ result }) => result === "passed" || result === "not_applicable",
	);
	const searchFor = (value: RevisionTab) => ({ tab: value });
	const studyPreview = studyPreviewInput(data.kind, data.body);
	const hasReaderView =
		data.kind === "book_overview" ||
		isCommentaryKind(data.kind) ||
		studyPreview !== null;
	const tabLinks: { label: string; value: RevisionTab }[] = [
		{
			label: data.baselineNumber
				? `Changes from #${data.baselineNumber}`
				: "Changes",
			value: "changes",
		},
		{ label: "Full text", value: "full" },
		{ label: `Sources (${data.citationCount})`, value: "sources" },
		{ label: `Issues (${data.issues.length})`, value: "issues" },
		{ label: "History", value: "history" },
	];

	return (
		<StaffPage
			actions={
				<>
					{hasReaderView ? (
						<Link
							className={staffLinkClassName}
							params={{
								contentId: String(contentItemId),
								revisionId: String(revisionId),
							}}
							search={searchFor("reader")}
							to="/admin/editorial/$contentId/revisions/$revisionId"
						>
							View as reader
						</Link>
					) : null}
					{isReviewable && canReview && revision.status === "submitted" ? (
						<StartReviewButton revisionId={revision.id} />
					) : null}
					{canReview && (isReviewable || revision.status === "approved") ? (
						<RequestChangesButton revisionId={revision.id} />
					) : null}
					{isReviewable && canReview ? (
						<ApproveButton
							allChecksDone={allChecksDone}
							revisionId={revision.id}
						/>
					) : null}
				</>
			}
			section={data.kindLabel}
			title={data.title}
		>
			<div className="-mt-4 mb-5 flex flex-wrap gap-1.5">
				<RevisionStatusChip status={revision.status} />
				<StatusChip tone="neutral">Revision #{revision.number}</StatusChip>
				{data.liveRevision ? (
					<StatusChip tone="success">
						Live: Revision #{data.liveRevision.number}
					</StatusChip>
				) : (
					<StatusChip tone="neutral">Nothing live</StatusChip>
				)}
			</div>

			{data.isAuthor &&
			(revision.status === "draft" ||
				revision.status === "changes_requested") ? (
				<div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground">
					<p>
						{revision.status === "draft"
							? "This is still your draft. Nobody is reviewing it yet."
							: "A reviewer asked for changes. Your edit becomes the next revision."}
					</p>
					{data.kind === "book_overview" ? (
						<Link
							className={staffLinkClassName}
							params={{ bookSlug: data.scopeKey }}
							to="/admin/scripture/$bookSlug"
						>
							Open the editor
						</Link>
					) : isCommentaryKind(data.kind) ? (
						<Link
							className={staffLinkClassName}
							search={{ kind: data.kind, scope: data.scopeKey }}
							to="/work/commentary"
						>
							Open the editor
						</Link>
					) : studyPreview ? (
						<StudyEditorLink input={studyPreview} scopeKey={data.scopeKey} />
					) : (
						<Link
							className={staffLinkClassName}
							search={evidenceWorkbenchSearch(data.kind, data.scopeKey)}
							to="/work/sources/evidence"
						>
							Open the editor
						</Link>
					)}
				</div>
			) : null}

			<nav
				aria-label="Revision views"
				className="mb-5 flex gap-1 overflow-x-auto border-border border-b"
			>
				{tabLinks.map(({ label, value }) => (
					<Link
						className={cn(
							"-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							value === tab
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
						key={value}
						params={{
							contentId: String(contentItemId),
							revisionId: String(revisionId),
						}}
						search={searchFor(value)}
						to="/admin/editorial/$contentId/revisions/$revisionId"
					>
						{label}
					</Link>
				))}
			</nav>

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
				<div className="min-w-0 space-y-4">
					{tab === "changes" ? <ChangesTab data={data} /> : null}
					{tab === "full" ? <FullTextTab data={data} /> : null}
					{tab === "reader" && isCommentaryKind(data.kind) ? (
						<CommentaryPreview body={commentaryBodySchema.parse(data.body)} />
					) : null}
					{tab === "reader" && studyPreview ? (
						<StudyPreview input={studyPreview} title={data.title} />
					) : null}
					{tab === "reader" && data.kind === "book_overview" ? (
						<BookOverviewPreview
							bookName={data.title.replace(/ overview$/, "")}
							overview={bookOverviewSchema.parse(data.body)}
						/>
					) : null}
					{tab === "sources" ? (
						<RevisionCitations citations={data.citations} />
					) : null}
					{tab === "issues" ? (
						<IssuesTab data={data} permissionKeys={permissionKeys} />
					) : null}
					{tab === "history" ? <HistoryTab data={data} /> : null}

					{tab === "changes" || tab === "full" ? (
						<ChecksCard data={data} permissionKeys={permissionKeys} />
					) : null}
				</div>

				<aside className="space-y-4">
					<PublicationCard data={data} permissionKeys={permissionKeys} />
					<DetailsCard data={data} />
					<ProvenanceCard data={data} />
				</aside>
			</div>
		</StaffPage>
	);
}

function StartReviewButton({ revisionId }: { revisionId: number }) {
	const start = useContentMutation(
		() => startReview({ data: { revisionId } }),
		() => toast.success("You're reviewing this now."),
	);
	return (
		<StaffButton
			disabled={start.isPending}
			onClick={() => start.mutate(undefined)}
			variant="outline"
		>
			Start review
		</StaffButton>
	);
}

function RequestChangesButton({ revisionId }: { revisionId: number }) {
	const [open, setOpen] = useState(false);
	const [feedback, setFeedback] = useState("");
	const request = useContentMutation(
		() => requestChanges({ data: { feedback, revisionId } }),
		() => {
			setOpen(false);
			setFeedback("");
			toast.success("Sent back. The author has your note.");
		},
	);
	return (
		<>
			<StaffButton onClick={() => setOpen(true)} variant="outline">
				Request changes
			</StaffButton>
			<StaffFormDialog
				canSubmit={feedback.trim().length > 0}
				description="This revision stays as it is. The author's fix becomes the next revision, which goes through review again."
				onOpenChange={setOpen}
				onSubmit={() => request.mutate(undefined)}
				open={open}
				pending={request.isPending}
				submitLabel="Request changes"
				title="Request changes"
			>
				<ReasonField
					hint="The author sees this."
					label="What needs to change"
					onChange={setFeedback}
					value={feedback}
				/>
			</StaffFormDialog>
		</>
	);
}

function ApproveButton({
	allChecksDone,
	revisionId,
}: {
	allChecksDone: boolean;
	revisionId: number;
}) {
	const approve = useContentMutation(
		() => approveRevision({ data: { revisionId } }),
		() => toast.success("Approved. It's ready to publish."),
	);
	return (
		<StaffButton
			disabled={!allChecksDone || approve.isPending}
			onClick={() => approve.mutate(undefined)}
			title={allChecksDone ? undefined : "Finish every check first"}
		>
			Approve
		</StaffButton>
	);
}

function DiffOrText({ after, before }: { after: string; before: string }) {
	if (after === before) {
		return (
			<p className="whitespace-pre-line font-serif leading-relaxed">
				{after || <span className="text-muted-foreground">Empty</span>}
			</p>
		);
	}
	return <WordDiff after={after} before={before} />;
}

function ChangesTab({ data }: { data: RevisionData }) {
	const counts = data.changes.reduce(
		(totals, { after, before }) => {
			for (const { kind, text } of diffWords(before, after)) {
				if (!text.trim()) continue;
				if (kind === "added") totals.added += 1;
				if (kind === "removed") totals.removed += 1;
			}
			return totals;
		},
		{ added: 0, removed: 0 },
	);
	const changed = data.changes.filter(({ after, before }) => after !== before);

	return (
		<StaffCard>
			<p className="mb-4 flex flex-wrap justify-between gap-2 text-muted-foreground text-sm">
				<span>
					{data.revision.submittedAt
						? `Sent ${formatStaffDate(data.revision.submittedAt)} by `
						: "Written by "}
					<strong className="font-semibold">{data.revision.author}</strong>
				</span>
				<span>
					{counts.added} {counts.added === 1 ? "addition" : "additions"} ·{" "}
					{counts.removed} {counts.removed === 1 ? "removal" : "removals"}
				</span>
			</p>
			{changed.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Nothing differs from the revision before it.
				</p>
			) : (
				<div className="space-y-4">
					{changed.map(({ after, before, label }) => (
						<div key={label}>
							<h3 className="mb-1 font-semibold text-sm">{label}</h3>
							<DiffOrText after={after} before={before} />
						</div>
					))}
				</div>
			)}
		</StaffCard>
	);
}

function FullTextTab({ data }: { data: RevisionData }) {
	return (
		<StaffCard>
			<div className="space-y-4">
				{data.fields.map(({ label, text }) => (
					<div key={label}>
						<h3 className="mb-1 font-semibold text-sm">{label}</h3>
						<p className="whitespace-pre-line font-serif leading-relaxed">
							{text || <span className="text-muted-foreground">Empty</span>}
						</p>
					</div>
				))}
			</div>
		</StaffCard>
	);
}

function ChecksCard({
	data,
	permissionKeys,
}: {
	data: RevisionData;
	permissionKeys: readonly PermissionKey[];
}) {
	const { status } = data.revision;
	const canCheck =
		permissionKeys.includes("editorial.check") &&
		!data.isAuthor &&
		(status === "submitted" || status === "in_review");
	const done = data.checks.filter(
		({ result }) => result === "passed" || result === "not_applicable",
	).length;
	const openIssues = data.issues.filter((issue) => issue.status === "open");

	return (
		<StaffCard
			actions={
				<span className="text-muted-foreground text-sm">
					{done} of {data.checks.length} done
				</span>
			}
			title="Editorial checks"
		>
			<ul className="divide-y divide-border-subtle">
				{data.checks.map((check) => (
					<CheckRow
						canCheck={canCheck}
						check={check}
						key={check.id}
						revisionId={data.revision.id}
					/>
				))}
			</ul>
			{data.isAuthor && (status === "submitted" || status === "in_review") ? (
				<p className="mt-3 text-muted-foreground text-xs">
					You wrote this, so someone else has to check it.
				</p>
			) : null}
			{openIssues.length > 0 ? (
				<p className="mt-3 rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
					<strong>
						{openIssues.length} open{" "}
						{openIssues.length === 1 ? "issue" : "issues"}, not blocking:
					</strong>{" "}
					{openIssues[0]?.description}
				</p>
			) : null}
		</StaffCard>
	);
}

function CheckRow({
	canCheck,
	check,
	revisionId,
}: {
	canCheck: boolean;
	check: RevisionData["checks"][number];
	revisionId: number;
}) {
	const noteId = useId();
	const [note, setNote] = useState(check.note ?? "");
	const record = useContentMutation((result: EditorialCheckResult) =>
		recordCheck({
			data: { checklistId: check.id, note, result, revisionId },
		}),
	);
	const tones = {
		passed: "success",
		failed: "danger",
		not_applicable: "neutral",
	} as const;

	return (
		<li className="py-3 first:pt-0 last:pb-0">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="font-medium text-sm">{check.requirement}</p>
					{check.checkedBy ? (
						<p className="text-muted-foreground text-xs">
							{check.checkedBy}
							{check.note && !canCheck ? ` · ${check.note}` : ""}
						</p>
					) : null}
				</div>
				{check.result ? (
					<StatusChip tone={tones[check.result]}>
						{checkResultLabels[check.result]}
					</StatusChip>
				) : (
					<StatusChip tone="attention">Not checked</StatusChip>
				)}
			</div>
			{canCheck ? (
				<div className="mt-2 flex flex-wrap items-center gap-2">
					<Input
						aria-label={`Note for ${check.requirement}`}
						className="h-11 min-w-40 flex-1 rounded-[0.625rem] text-sm"
						id={noteId}
						maxLength={500}
						onChange={(event) => setNote(event.target.value)}
						placeholder="Note (optional)"
						value={note}
					/>
					{(Object.keys(checkResultLabels) as EditorialCheckResult[]).map(
						(result) => (
							<StaffButton
								aria-pressed={check.result === result}
								aria-label={`${check.requirement}: ${checkResultLabels[result]}`}
								disabled={record.isPending}
								key={result}
								onClick={() => record.mutate(result)}
								variant={check.result === result ? "default" : "outline"}
							>
								{checkResultLabels[result]}
							</StaffButton>
						),
					)}
				</div>
			) : null}
		</li>
	);
}

function IssuesTab({
	data,
	permissionKeys,
}: {
	data: RevisionData;
	permissionKeys: readonly PermissionKey[];
}) {
	const typeId = useId();
	const descriptionId = useId();
	const [issueType, setIssueType] = useState<ContentIssueType>("other");
	const [description, setDescription] = useState("");
	const raise = useContentMutation(
		() =>
			raiseIssue({
				data: { description, issueType, revisionId: data.revision.id },
			}),
		() => {
			setDescription("");
			toast.success("Issue recorded.");
		},
	);

	return (
		<StaffCard title="Issues">
			{data.issues.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No issues on this revision.
				</p>
			) : (
				<ul className="divide-y divide-border-subtle">
					{data.issues.map((issue) => (
						<li className="py-3 first:pt-0 last:pb-0" key={issue.id}>
							<div className="flex flex-wrap justify-between gap-2">
								<p className="text-sm">{issue.description}</p>
								<StatusChip
									tone={issue.status === "open" ? "attention" : "neutral"}
								>
									{issue.status === "open"
										? "Open"
										: issue.status === "resolved"
											? "Resolved"
											: "Dismissed"}
								</StatusChip>
							</div>
							<p className="mt-0.5 text-muted-foreground text-xs">
								{contentIssueTypeLabels[issue.issueType]} ·{" "}
								{issue.reportedBy ?? "Deleted member"} ·{" "}
								{formatStaffDate(issue.createdAt)}
							</p>
						</li>
					))}
				</ul>
			)}

			{permissionKeys.includes("issues.create") ? (
				<form
					className="mt-5 space-y-3 border-border-subtle border-t pt-5"
					onSubmit={(event) => {
						event.preventDefault();
						if (description.trim()) raise.mutate(undefined);
					}}
				>
					<div className="space-y-1.5">
						<label className="font-semibold text-sm" htmlFor={typeId}>
							Kind of issue
						</label>
						<select
							className="block h-11 w-full rounded-[0.625rem] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
							id={typeId}
							onChange={(event) =>
								setIssueType(event.target.value as ContentIssueType)
							}
							value={issueType}
						>
							{contentIssueTypes.map((type) => (
								<option key={type} value={type}>
									{contentIssueTypeLabels[type]}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-1.5">
						<label className="font-semibold text-sm" htmlFor={descriptionId}>
							What's wrong
						</label>
						<Textarea
							className="min-h-20 rounded-[0.625rem] text-sm"
							id={descriptionId}
							maxLength={2000}
							onChange={(event) => setDescription(event.target.value)}
							value={description}
						/>
					</div>
					<StaffButton
						disabled={!description.trim() || raise.isPending}
						type="submit"
						variant="outline"
					>
						Raise an issue
					</StaffButton>
				</form>
			) : null}
		</StaffCard>
	);
}

function HistoryTab({ data }: { data: RevisionData }) {
	return (
		<div className="space-y-4">
			<StaffCard title="Revisions">
				<ul className="divide-y divide-border-subtle">
					{data.revisions.map((revision) => (
						<li
							className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
							key={revision.id}
						>
							<Link
								className="text-sm underline-offset-4 hover:underline"
								params={{
									contentId: String(data.contentItemId),
									revisionId: String(revision.id),
								}}
								to="/admin/editorial/$contentId/revisions/$revisionId"
							>
								Revision #{revision.number} · {revision.author} ·{" "}
								{formatStaffDate(revision.createdAt)}
							</Link>
							<RevisionStatusChip status={revision.status} />
						</li>
					))}
				</ul>
			</StaffCard>

			<StaffCard title="Reviews of this revision">
				{data.reviews.length === 0 ? (
					<p className="text-muted-foreground text-sm">No decisions yet.</p>
				) : (
					<ul className="divide-y divide-border-subtle">
						{data.reviews.map((review) => (
							<li
								className="py-2 text-sm first:pt-0 last:pb-0"
								key={`${review.reviewer}-${review.decision}`}
							>
								<p className="font-medium">
									{review.decision === "approved"
										? "Approved"
										: "Changes requested"}{" "}
									by {review.reviewer}
								</p>
								{review.feedback ? <p>{review.feedback}</p> : null}
								<p className="text-muted-foreground text-xs">
									{formatStaffDateTime(review.createdAt)}
								</p>
							</li>
						))}
					</ul>
				)}
			</StaffCard>

			<StaffCard title="Publishing">
				{data.publications.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nothing has been published yet.
					</p>
				) : (
					<ul className="divide-y divide-border-subtle">
						{data.publications.map((entry) => (
							<li
								className="py-2 text-sm first:pt-0 last:pb-0"
								key={`${entry.action}-${entry.at.toISOString()}`}
							>
								<p className="font-medium">
									{entry.action === "published" ? "Published" : "Withdrew"}{" "}
									Revision #{entry.number} · {entry.by}
								</p>
								{entry.reason ? <p>{entry.reason}</p> : null}
								<p className="text-muted-foreground text-xs">
									{formatStaffDateTime(entry.at)}
								</p>
							</li>
						))}
					</ul>
				)}
			</StaffCard>
		</div>
	);
}

/** A stance change or theme rename goes live when a second Superadmin confirms it. */
function FoundationalConfirmation({
	change,
	contentItemId,
	pending,
	permissionKeys,
	revisionId,
}: {
	change: string;
	contentItemId: number;
	pending: NonNullable<RevisionData["foundationalChange"]>["pending"];
	permissionKeys: readonly PermissionKey[];
	revisionId: number;
}) {
	const queryClient = useQueryClient();
	const canConfirm = permissionKeys.includes("content.confirm_foundational");
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const request = useContentMutation(
		() =>
			requestPublicationConfirmation({
				data: { contentItemId, reason, revisionId },
			}),
		() => {
			setOpen(false);
			setReason("");
			toast.success("Sent. A different Superadmin publishes it by confirming.");
		},
	);

	return (
		<div className="space-y-3 text-sm">
			<div
				className="rounded-[0.625rem] bg-status-attention p-3 text-status-attention-foreground"
				role="status"
			>
				<p className="font-semibold">This needs two Superadmins</p>
				<p className="mt-1">{change}</p>
			</div>
			{pending ? (
				<>
					<p>
						{pending.proposedByMe ? "You" : pending.proposerName} sent this for
						confirmation.
					</p>
					<p className="text-muted-foreground">{pending.reason}</p>
					{canConfirm ? (
						<ChangeDecisionPanel
							confirmLabel="Confirm & publish"
							decideWith={decideFoundationalChange}
							onDecided={() => invalidateContent(queryClient)}
							proposalId={pending.id}
							proposedByMe={pending.proposedByMe}
						/>
					) : (
						<p className="text-muted-foreground">
							A different Superadmin has to decide it.
						</p>
					)}
				</>
			) : canConfirm ? (
				<>
					<StaffButton
						className="w-full"
						onClick={() => setOpen(true)}
						variant="outline"
					>
						Send for confirmation
					</StaffButton>
					<StaffFormDialog
						canSubmit={reason.trim().length > 0}
						description="A different Superadmin reads this and decides. Confirming publishes it straight away."
						onOpenChange={setOpen}
						onSubmit={() => request.mutate(undefined)}
						open={open}
						pending={request.isPending}
						submitLabel="Send for confirmation"
						title="Send for confirmation"
					>
						<ReasonField onChange={setReason} value={reason} />
					</StaffFormDialog>
				</>
			) : (
				<p className="text-muted-foreground">
					A Superadmin has to send this for confirmation. It can't be published
					from here.
				</p>
			)}
		</div>
	);
}

function PublicationCard({
	data,
	permissionKeys,
}: {
	data: RevisionData;
	permissionKeys: readonly PermissionKey[];
}) {
	const { revision } = data;
	const foundational = data.foundationalChange;
	const canPublish =
		permissionKeys.includes("publication.publish") &&
		revision.status === "approved" &&
		!foundational;
	const canWithdraw =
		permissionKeys.includes("publication.withdraw") && data.liveRevision;
	const publish = useContentMutation(
		() => publishRevision({ data: { revisionId: revision.id } }),
		() => toast.success(`Revision #${revision.number} is live for readers.`),
	);
	const [withdrawing, setWithdrawing] = useState(false);
	const [reason, setReason] = useState("");
	const withdraw = useContentMutation(
		() =>
			withdrawLive({
				data: { contentItemId: data.contentItemId, reason },
			}),
		() => {
			setWithdrawing(false);
			setReason("");
			toast.success("Withdrawn. Readers no longer see this.");
		},
	);

	return (
		<StaffCard title="Publication">
			{revision.status === "approved" ? (
				<p className="text-muted-foreground text-sm">
					Publishing makes this exact wording, Revision #{revision.number}, the
					live version. Any later edit becomes the next revision and goes back
					through review.
				</p>
			) : null}
			<div className="mt-3 space-y-2">
				{canPublish ? (
					<StaffButton
						className="w-full"
						disabled={publish.isPending}
						onClick={() => publish.mutate(undefined)}
					>
						Publish Revision #{revision.number}
					</StaffButton>
				) : null}
				{foundational ? (
					<FoundationalConfirmation
						change={foundational.change}
						contentItemId={data.contentItemId}
						pending={foundational.pending}
						permissionKeys={permissionKeys}
						revisionId={revision.id}
					/>
				) : canPublish ? null : (
					<p className="text-sm" role="status">
						{publicationStatusNotes[revision.status]}
					</p>
				)}
				{canWithdraw && data.liveRevision ? (
					<StaffButton
						className="w-full"
						onClick={() => setWithdrawing(true)}
						variant="destructive"
					>
						Withdraw live Revision #{data.liveRevision.number}
					</StaffButton>
				) : null}
			</div>
			<p className="mt-3 text-muted-foreground text-xs">
				Recorded in the audit log under your name.
			</p>
			<StaffFormDialog
				canSubmit={reason.trim().length > 0}
				description="Readers stop seeing this straight away. It stays on record, and a new revision can follow."
				destructive
				onOpenChange={setWithdrawing}
				onSubmit={() => withdraw.mutate(undefined)}
				open={withdrawing}
				pending={withdraw.isPending}
				submitLabel="Withdraw"
				title={`Withdraw ${data.title}?`}
			>
				<ReasonField onChange={setReason} value={reason} />
			</StaffFormDialog>
		</StaffCard>
	);
}

function DetailsCard({ data }: { data: RevisionData }) {
	const { revision } = data;
	const details = [
		["Author", revision.author],
		["Reviewer", revision.reviewer ?? "Nobody yet"],
		[
			"Based on",
			data.baselineNumber
				? `Revision #${data.baselineNumber}`
				: "Nothing before it",
		],
		[
			"Live since",
			data.liveRevision?.publishedAt
				? `#${data.liveRevision.number} · ${formatStaffDate(data.liveRevision.publishedAt)}`
				: "Not live",
		],
		[
			"Submitted",
			revision.submittedAt ? formatStaffDate(revision.submittedAt) : "Not yet",
		],
		[
			"Approved",
			data.approvedAt ? formatStaffDate(data.approvedAt) : "Not yet",
		],
	];
	return (
		<StaffCard title="Details">
			<dl>
				{details.map(([term, value]) => (
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
	);
}

function ProvenanceCard({ data }: { data: RevisionData }) {
	const done = data.checks.filter(
		({ result }) => result === "passed" || result === "not_applicable",
	).length;
	const approvals = data.reviews.filter(
		({ decision }) => decision === "approved",
	).length;
	const trace = [
		[
			"Published revision",
			data.liveRevision ? `#${data.liveRevision.number}` : "Not live",
		],
		[
			"Editorial review",
			approvals > 0
				? "Approved"
				: contentRevisionStatusLabels[data.revision.status],
		],
		["Editorial checks", `${done} of ${data.checks.length} done`],
		["Sources & citations", `${data.citationCount} citations`],
	];
	return (
		<StaffCard title="Provenance">
			<p className="-mt-3 mb-3 text-muted-foreground text-xs">
				Why does Berean Study say this?
			</p>
			<ol className="space-y-2">
				{trace.map(([label, meta]) => (
					<li
						className="flex items-baseline justify-between gap-3 text-sm"
						key={label}
					>
						<span>{label}</span>
						<span className="text-right text-muted-foreground text-xs">
							{meta}
						</span>
					</li>
				))}
			</ol>
		</StaffCard>
	);
}
