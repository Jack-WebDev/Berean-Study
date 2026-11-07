import {
	type CommunityRuleKey,
	communityRuleNamed,
	communityRules,
	type ModerationDecision,
	POSTING_RESTRICTION_DAYS,
} from "@berean-study/db/community-moderation-catalogue";
import { Label } from "@berean-study/ui/components/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";
import { toast } from "sonner";

import {
	decideReport,
	type getReportedPost,
	liftPostingRestriction,
	restoreCommunityPost,
} from "@/functions/moderation";
import { formatStaffDate, formatStaffDateTime } from "@/lib/format";
import {
	auditKeys,
	communityKeys,
	libraryKeys,
	moderationKeys,
	peopleKeys,
	staffQueueKeys,
} from "@/queries/keys";
import {
	openReportsQueryOptions,
	removedPostsQueryOptions,
	reportedPostQueryOptions,
} from "@/queries/moderation";
import { formatTimeAgo } from "@/utils/dates";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import { StaffPagination } from "../staff-pagination";
import { StatusChip } from "../status-chip";

type ModerationSearch = {
	page?: number;
	post?: number;
	view?: "removed";
};

type ReportedPost = NonNullable<Awaited<ReturnType<typeof getReportedPost>>>;

const postTypeLabels: Record<string, string> = {
	collection: "Collection",
	note: "Note",
	prayer: "Prayer",
	testimony: "Testimony",
};

const eyebrow =
	"font-bold text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground";

function hoursOpen(date: Date) {
	const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
	return hours < 1 ? "Under an hour" : `${hours} h`;
}

function useModerationMutation<TVariables>(
	mutationFn: (variables: TVariables) => Promise<unknown>,
	onSuccess: () => void,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onError: (error) => toast.error(error.message),
		onSettled: () =>
			Promise.all(
				[
					moderationKeys.all,
					staffQueueKeys.all,
					communityKeys.all,
					libraryKeys.all,
					peopleKeys.all,
					auditKeys.all,
				].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
			),
		onSuccess,
	});
}

function ViewLink({
	active,
	children,
	search,
}: {
	active: boolean;
	children: ReactNode;
	search: ModerationSearch;
}) {
	return (
		<Link
			aria-current={active ? "page" : undefined}
			className={cn(
				"inline-flex min-h-11 items-center gap-2 rounded-full border px-4 font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				active
					? "border-transparent bg-sidebar-accent text-sidebar-accent-foreground"
					: "border-border bg-card hover:bg-muted",
			)}
			search={search}
			to="/admin/moderation"
		>
			{children}
		</Link>
	);
}

/** Is Community working according to its rules? There are no engagement figures here. */
export function ModerationPage({
	canOpenProfiles,
	search,
}: {
	canOpenProfiles: boolean;
	search: ModerationSearch;
}) {
	const { data: reports } = useSuspenseQuery(openReportsQueryOptions());
	const { data: removed } = useSuspenseQuery(
		removedPostsQueryOptions(search.page ?? 1),
	);
	const isRemovedView = search.view === "removed";
	const selectedPostId =
		search.post ??
		(isRemovedView ? removed.posts[0]?.postId : reports[0]?.postId);

	return (
		<StaffPage
			description="Is Community working according to Berean Study's rules? Reports, removed content and member standing, with no engagement figures."
			section="Administration"
			title="Community moderation"
		>
			<nav aria-label="Moderation views" className="flex flex-wrap gap-2">
				<ViewLink active={!isRemovedView} search={{}}>
					Open reports
					<StatusChip tone="neutral">{reports.length}</StatusChip>
				</ViewLink>
				<ViewLink active={isRemovedView} search={{ view: "removed" }}>
					Removed content
					<StatusChip tone="neutral">{removed.total}</StatusChip>
				</ViewLink>
			</nav>

			<div
				className={cn(
					"mt-6 grid gap-6 lg:items-start",
					selectedPostId && "lg:grid-cols-[20rem_minmax(0,1fr)]",
				)}
			>
				<StaffCard className="overflow-hidden p-0 sm:p-0">
					{isRemovedView ? (
						removed.posts.length === 0 ? (
							<p className="p-5 text-muted-foreground text-sm">
								No posts have been removed. Removed posts stay here so they can
								be reviewed and restored.
							</p>
						) : (
							<ul>
								{removed.posts.map((post) => (
									<QueueRow
										detail={`${post.authorName}, ${postTypeLabels[post.postType] ?? post.postType}`}
										isSelected={post.postId === selectedPostId}
										key={post.postId}
										search={{
											page: search.page,
											post: post.postId,
											view: "removed",
										}}
										side={
											post.removedAt ? formatStaffDate(post.removedAt) : null
										}
										title={post.title}
									/>
								))}
							</ul>
						)
					) : reports.length === 0 ? (
						<p className="p-5 text-muted-foreground text-sm">
							No open reports. Reports appear here when members flag a post.
						</p>
					) : (
						<ul>
							{reports.map((report) => (
								<QueueRow
									detail={`${postTypeLabels[report.postType] ?? report.postType}: ${report.title}`}
									isSelected={report.postId === selectedPostId}
									key={report.postId}
									search={{ post: report.postId }}
									side={hoursOpen(report.oldestAt)}
									title={report.reasonLabel}
								/>
							))}
						</ul>
					)}
					{isRemovedView ? (
						<div className="px-4 pb-4">
							<StaffPagination
								next={
									<Link
										className={staffLinkClassName}
										search={{
											page: (search.page ?? 1) + 1,
											view: "removed",
										}}
										to="/admin/moderation"
									>
										Next
									</Link>
								}
								page={search.page ?? 1}
								pageSize={removed.pageSize}
								previous={
									<Link
										className={staffLinkClassName}
										search={{
											page: (search.page ?? 1) - 1,
											view: "removed",
										}}
										to="/admin/moderation"
									>
										Previous
									</Link>
								}
								total={removed.total}
							/>
						</div>
					) : null}
				</StaffCard>

				{selectedPostId ? (
					<ReportPanel
						canOpenProfiles={canOpenProfiles}
						key={selectedPostId}
						postId={selectedPostId}
					/>
				) : null}
			</div>
		</StaffPage>
	);
}

function QueueRow({
	detail,
	isSelected,
	search,
	side,
	title,
}: {
	detail: string;
	isSelected: boolean;
	search: ModerationSearch;
	side: string | null;
	title: string;
}) {
	return (
		<li className="border-border-subtle border-t first:border-t-0">
			<Link
				aria-current={isSelected ? "true" : undefined}
				className={cn(
					"flex min-h-11 flex-col gap-0.5 px-5 py-3 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
					isSelected &&
						"bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent",
				)}
				search={search}
				to="/admin/moderation"
			>
				<span className="flex items-baseline justify-between gap-3">
					<span className="min-w-0 truncate font-semibold text-sm">
						{title}
					</span>
					{side ? (
						<span className="shrink-0 text-xs opacity-75">{side}</span>
					) : null}
				</span>
				<span className="truncate text-xs opacity-75">{detail}</span>
			</Link>
		</li>
	);
}

function ReportPanel({
	canOpenProfiles,
	postId,
}: {
	canOpenProfiles: boolean;
	postId: number;
}) {
	const { data, isError, isPending } = useQuery(
		reportedPostQueryOptions(postId),
	);

	if (isPending) {
		return (
			<StaffCard>
				<p className="text-muted-foreground text-sm">Loading this report…</p>
			</StaffCard>
		);
	}
	if (isError) {
		return (
			<StaffCard>
				<p className="text-destructive text-sm" role="alert">
					This report didn't load. Reload the page to try again.
				</p>
			</StaffCard>
		);
	}
	if (!data) {
		return (
			<StaffCard>
				<p className="text-muted-foreground text-sm">
					There's no report on this post.
				</p>
			</StaffCard>
		);
	}

	const firstReport = data.reports[0];
	const openReports = data.reports.filter(({ resolution }) => !resolution);
	const count = data.isOpen ? openReports.length : data.reports.length;
	const rule = communityRuleNamed(data.suggestedRule);

	return (
		<div className="grid min-w-0 gap-6">
			<StaffCard>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0">
						<p className={eyebrow}>
							Report {data.reportCode} · {count}{" "}
							{count === 1 ? "reporter" : "reporters"}
						</p>
						<h2 className="mt-1.5 font-serif text-2xl tracking-[-0.01em]">
							{(openReports[0] ?? firstReport)?.reasonLabel}
						</h2>
					</div>
					{data.isOpen && openReports[0] ? (
						<StatusChip tone="attention">
							Open · {hoursOpen(openReports[0].at)}
						</StatusChip>
					) : data.post.removedAt ? (
						<StatusChip tone="danger">Removed</StatusChip>
					) : (
						<StatusChip tone="success">Decided</StatusChip>
					)}
				</div>

				<article className="mt-5 rounded-xl border border-border-subtle bg-background p-4">
					<p className="font-semibold text-sm">{data.author.name}</p>
					<p className="mt-0.5 text-muted-foreground text-xs">
						{[
							postTypeLabels[data.post.type] ?? data.post.type,
							...data.passages,
							formatStaffDate(data.post.publishedAt),
						].join(" · ")}
					</p>
					<h3 className="mt-3 font-serif text-lg">{data.post.title}</h3>
					<p className="mt-1 whitespace-pre-line font-serif leading-relaxed">
						{data.post.excerpt}
					</p>
				</article>

				<dl className="mt-5 grid gap-5 sm:grid-cols-3">
					<div>
						<dt className={eyebrow}>Reason</dt>
						<dd className="mt-1.5 grid gap-2 text-sm">
							{data.reports.map((report) => (
								<div key={report.id}>
									<p className="font-medium">{report.reasonLabel}</p>
									{report.details ? (
										<p className="text-muted-foreground">"{report.details}"</p>
									) : null}
									<p className="text-muted-foreground text-xs">
										{report.reporterName}, {formatStaffDate(report.at)}
									</p>
								</div>
							))}
						</dd>
					</div>
					<div>
						<dt className={eyebrow}>Guideline</dt>
						<dd className="mt-1.5 text-sm">
							{rule ? (
								<Link
									className="font-medium underline underline-offset-2"
									hash={rule.key}
									to="/community/guidelines"
								>
									{rule.title}
								</Link>
							) : (
								<Link
									className="underline underline-offset-2"
									to="/community/guidelines"
								>
									Community Guidelines
								</Link>
							)}
							{rule ? (
								<p className="mt-0.5 text-muted-foreground text-xs">
									{rule.description}
								</p>
							) : null}
						</dd>
					</div>
					<AuthorStanding canOpenProfiles={canOpenProfiles} data={data} />
				</dl>
			</StaffCard>

			{data.isOpen ? (
				<DecisionCard data={data} />
			) : data.post.removedAt ? (
				<RestoreCard data={data} />
			) : null}

			<StaffCard title="Moderation history">
				<History data={data} />
			</StaffCard>
		</div>
	);
}

function AuthorStanding({
	canOpenProfiles,
	data,
}: {
	canOpenProfiles: boolean;
	data: ReportedPost;
}) {
	const { author } = data;
	const removals = author.earlierRemovals.length;
	const [isLifting, setIsLifting] = useState(false);

	return (
		<div>
			<dt className={eyebrow}>Author standing</dt>
			<dd className="mt-1.5 grid gap-1 text-sm">
				<p>
					{author.isDeleted
						? "Deleted their account"
						: `Member since ${formatStaffDate(author.memberSince)}`}
				</p>
				<p className="text-muted-foreground">
					{removals === 0
						? "No prior removals"
						: `${removals} prior ${removals === 1 ? "removal" : "removals"}${
								author.earlierRemovals[0]
									? `, latest ${formatStaffDate(author.earlierRemovals[0].at)}`
									: ""
							}`}
				</p>
				{author.restrictedUntil ? (
					<>
						<p className="text-muted-foreground">
							Can't post until {formatStaffDateTime(author.restrictedUntil)}
						</p>
						<button
							className="min-h-11 w-fit text-left underline underline-offset-2"
							onClick={() => setIsLifting(true)}
							type="button"
						>
							Lift restriction
						</button>
						<LiftRestrictionDialog
							name={author.name}
							onOpenChange={setIsLifting}
							open={isLifting}
							userId={author.userId}
						/>
					</>
				) : null}
				{canOpenProfiles && !author.isDeleted ? (
					<Link
						className="inline-flex min-h-11 w-fit items-center underline underline-offset-2"
						params={{ userId: author.userId }}
						to="/admin/users/$userId"
					>
						Open profile
					</Link>
				) : null}
			</dd>
		</div>
	);
}

function LiftRestrictionDialog({
	name,
	onOpenChange,
	open,
	userId,
}: {
	name: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	userId: string;
}) {
	const [reason, setReason] = useState("");
	const lift = useModerationMutation(
		(input: { reason: string; targetUserId: string }) =>
			liftPostingRestriction({ data: input }),
		() => {
			onOpenChange(false);
			setReason("");
			toast.success(`${name} can share with Community again.`);
		},
	);

	return (
		<StaffFormDialog
			canSubmit={Boolean(reason.trim())}
			description="They'll be told they can share again. This is recorded in the audit log under your name."
			onOpenChange={onOpenChange}
			onSubmit={() => lift.mutate({ reason, targetUserId: userId })}
			open={open}
			pending={lift.isPending}
			submitLabel="Lift restriction"
			title={`Lift ${name}'s restriction`}
		>
			<ReasonField onChange={setReason} value={reason} />
		</StaffFormDialog>
	);
}

const decisionChoices: {
	decision: ModerationDecision;
	dialogDescription: string;
	label: string;
	success: string;
	title: string;
	variant: "destructive" | "outline";
}[] = [
	{
		decision: "removed",
		dialogDescription:
			"The post leaves Community, the author is told which rule applied, and it can be restored later.",
		label: "Remove post",
		success: "Post removed. The author has been told which rule applied.",
		title: "Remove this post",
		variant: "destructive",
	},
	{
		decision: "removed_and_warned",
		dialogDescription:
			"The post leaves Community and the author gets a warning that names the rule.",
		label: "Remove & warn author",
		success: "Post removed and the author warned.",
		title: "Remove this post and warn its author",
		variant: "outline",
	},
	{
		decision: "restricted",
		dialogDescription: `The post leaves Community and the author can't share anything for ${POSTING_RESTRICTION_DAYS} days. They can still read, and you can lift this early.`,
		label: `Remove & restrict posting · ${POSTING_RESTRICTION_DAYS} days`,
		success: `Post removed and posting restricted for ${POSTING_RESTRICTION_DAYS} days.`,
		title: `Remove this post and restrict posting for ${POSTING_RESTRICTION_DAYS} days`,
		variant: "outline",
	},
	{
		decision: "dismissed",
		dialogDescription:
			"The post stays up and every open report on it closes. The author isn't told.",
		label: "Dismiss report",
		success: "Report dismissed. The post stays up.",
		title: "Dismiss this report",
		variant: "outline",
	},
];

function DecisionCard({ data }: { data: ReportedPost }) {
	const [choice, setChoice] = useState<(typeof decisionChoices)[number] | null>(
		null,
	);

	return (
		<StaffCard title="Decision">
			{data.conflict ? (
				<p className="text-sm" role="status">
					{data.conflict === "author"
						? "This is your own post, so another moderator decides it."
						: "You reported this post, so another moderator decides it."}
				</p>
			) : (
				<>
					<div className="flex flex-wrap gap-2">
						{decisionChoices.map((option) => (
							<StaffButton
								key={option.decision}
								onClick={() => setChoice(option)}
								variant={option.variant}
							>
								{option.label}
							</StaffButton>
						))}
					</div>
					<p className="mt-3 text-muted-foreground text-xs">
						The author is told which rule applies. Removed content stays
						reviewable under Removed content and can be restored. Recorded in
						the audit log under your name.
					</p>
				</>
			)}
			{choice ? (
				<DecisionDialog
					choice={choice}
					data={data}
					key={choice.decision}
					onClose={() => setChoice(null)}
				/>
			) : null}
		</StaffCard>
	);
}

function DecisionDialog({
	choice,
	data,
	onClose,
}: {
	choice: (typeof decisionChoices)[number];
	data: ReportedPost;
	onClose: () => void;
}) {
	const navigate = useNavigate({ from: "/admin/moderation" });
	const ruleId = useId();
	const [ruleKey, setRuleKey] = useState<CommunityRuleKey | "">(
		data.suggestedRule ?? "",
	);
	const [note, setNote] = useState("");
	const isDismissal = choice.decision === "dismissed";
	const noteRequired = choice.decision === "restricted";

	const decide = useModerationMutation(
		() =>
			decideReport({
				data: {
					decision: choice.decision,
					note: note.trim() || undefined,
					postId: data.post.id,
					ruleKey: isDismissal || !ruleKey ? undefined : ruleKey,
				},
			}),
		() => {
			toast.success(choice.success);
			onClose();
			// Moves on to the next report in the queue.
			void navigate({ search: {} });
		},
	);

	return (
		<StaffFormDialog
			canSubmit={
				(isDismissal || Boolean(ruleKey)) &&
				(!noteRequired || Boolean(note.trim()))
			}
			description={choice.dialogDescription}
			destructive={!isDismissal}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			onSubmit={() => decide.mutate(undefined)}
			open
			pending={decide.isPending}
			submitLabel={choice.label}
			title={choice.title}
		>
			{isDismissal ? null : (
				<div className="space-y-2">
					<Label htmlFor={ruleId}>Which rule does it go against?</Label>
					<NativeSelect
						className="h-11 w-full rounded-[0.625rem]"
						id={ruleId}
						onChange={(event) =>
							setRuleKey(event.target.value as CommunityRuleKey | "")
						}
						required
						value={ruleKey}
					>
						<NativeSelectOption value="">Choose a rule…</NativeSelectOption>
						{communityRules.map((rule) => (
							<NativeSelectOption key={rule.key} value={rule.key}>
								{rule.title}
							</NativeSelectOption>
						))}
					</NativeSelect>
					<p className="text-muted-foreground text-xs">
						The author is told this rule.
					</p>
				</div>
			)}
			{noteRequired ? (
				<ReasonField
					hint="For the record. The author doesn't see this."
					onChange={setNote}
					value={note}
				/>
			) : (
				<NoteField onChange={setNote} value={note} />
			)}
		</StaffFormDialog>
	);
}

function NoteField({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	const id = useId();
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>Note (optional)</Label>
			<Textarea
				className="min-h-20 rounded-[0.625rem] text-sm"
				id={id}
				maxLength={1000}
				onChange={(event) => onChange(event.target.value)}
				value={value}
			/>
			<p className="text-muted-foreground text-xs">
				For the record. The author doesn't see this.
			</p>
		</div>
	);
}

function RestoreCard({ data }: { data: ReportedPost }) {
	const [isOpen, setIsOpen] = useState(false);
	const [note, setNote] = useState("");
	const restore = useModerationMutation(
		() => restoreCommunityPost({ data: { note, postId: data.post.id } }),
		() => {
			setIsOpen(false);
			setNote("");
			toast.success("Post restored. The author has been told.");
		},
	);

	return (
		<StaffCard title="Removed from Community">
			{data.canRestore ? (
				<>
					<p className="text-muted-foreground text-sm">
						Readers can't see this post. Restoring puts it back where it was and
						tells the author. It doesn't lift a posting restriction.
					</p>
					<StaffButton
						className="mt-3"
						onClick={() => setIsOpen(true)}
						variant="outline"
					>
						Restore post
					</StaffButton>
					<StaffFormDialog
						canSubmit={Boolean(note.trim())}
						description="The author will be told. This is recorded in the audit log under your name."
						onOpenChange={setIsOpen}
						onSubmit={() => restore.mutate(undefined)}
						open={isOpen}
						pending={restore.isPending}
						submitLabel="Restore post"
						title="Restore this post"
					>
						<ReasonField onChange={setNote} value={note} />
					</StaffFormDialog>
				</>
			) : (
				<p className="text-muted-foreground text-sm">
					{data.author.isDeleted
						? "The author deleted their account, so this post can't be restored."
						: "This is your own post, so another moderator decides whether to restore it."}
				</p>
			)}
		</StaffCard>
	);
}

function History({ data }: { data: ReportedPost }) {
	const events = [
		...data.history.map((action) => ({
			at: action.at,
			key: `action-${action.id}`,
			note: action.note,
			text: [
				action.label,
				action.rule ? `(${action.rule})` : null,
				`by ${action.moderatorName}`,
			]
				.filter(Boolean)
				.join(" "),
		})),
		...data.reports.map((report) => ({
			at: report.at,
			key: `report-${report.id}`,
			note: null,
			text: `Reported by ${report.reporterName}`,
		})),
		...data.author.earlierRemovals.map((removal) => ({
			at: removal.at,
			key: `earlier-${removal.id}`,
			note: null,
			text: `Earlier post by this author removed: "${removal.title}"${removal.rule ? ` (${removal.rule})` : ""}`,
		})),
	].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

	return (
		<ul className="divide-y divide-border-subtle">
			{events.map((event) => (
				<li
					className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 first:pt-0 last:pb-0"
					key={event.key}
				>
					<span className="min-w-0 flex-1 basis-60 text-sm">
						{event.text}
						{event.note ? (
							<span className="mt-0.5 block text-muted-foreground text-xs">
								{event.note}
							</span>
						) : null}
					</span>
					<time
						className="shrink-0 text-muted-foreground text-xs"
						dateTime={new Date(event.at).toISOString()}
						title={formatStaffDateTime(event.at)}
					>
						{formatTimeAgo(event.at)}
					</time>
				</li>
			))}
		</ul>
	);
}
