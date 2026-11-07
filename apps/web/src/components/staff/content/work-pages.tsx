import { contentIssueTypeLabels } from "@berean-study/db/content-kinds";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";
import { assignReviewer, assignWriter, closeIssue } from "@/functions/content";
import { formatStaffDate } from "@/lib/format";
import {
	assignablePeopleQueryOptions,
	assignmentsQueryOptions,
	editorialQueueQueryOptions,
	myWorkQueryOptions,
	openIssuesQueryOptions,
	reviewQueueQueryOptions,
} from "@/queries/content";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import {
	RevisionList,
	type RevisionRow,
	useContentMutation,
} from "./content-display";

export function MyWorkPage() {
	const { data } = useSuspenseQuery(myWorkQueryOptions());
	return (
		<StaffPage
			actions={
				<>
					<Link className={staffLinkClassName} to="/admin/scripture">
						Book overviews
					</Link>
					<Link
						className={cn(
							staffLinkClassName,
							"bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
						)}
						to="/work/new"
					>
						+ New
					</Link>
				</>
			}
			description="Your writing that's still on its way to readers. Anything sent back with changes comes first."
			section="Contributor"
			title="My Work"
		>
			<RevisionList
				emptyMessage="Nothing in progress. Choose + New to start something."
				rows={data}
				title="In progress"
			/>
		</StaffPage>
	);
}

export function ReviewsPage() {
	const { data } = useSuspenseQuery(reviewQueueQueryOptions());
	return (
		<StaffPage
			description="Work waiting for a reviewer, oldest first. You can pick up any of it, and you never see your own here."
			section="Contributor"
			title="Reviews"
		>
			<RevisionList
				emptyMessage="Nothing is waiting for review."
				rows={data}
				title="Waiting for review"
			/>
		</StaffPage>
	);
}

export function AssignmentsPage() {
	const { data } = useSuspenseQuery(assignmentsQueryOptions());
	return (
		<StaffPage
			description="Work someone has asked you to take on. It leaves this list once it moves along."
			section="Contributor"
			title="Assignments"
		>
			<RevisionList
				emptyMessage="Nothing has been assigned to you."
				rows={data}
				title="Assigned to you"
			/>
		</StaffPage>
	);
}

export function EditorialQueuePage() {
	const { data } = useSuspenseQuery(editorialQueueQueryOptions());
	return (
		<StaffPage
			description="All content on its way to readers, whatever step it's on. Assigning asks someone to take it on. Anyone with review permission can still pick it up."
			section="Administration"
			title="Editorial"
		>
			<RevisionList
				actions={(row) => <AssignButton row={row} />}
				emptyMessage="Nothing is in progress."
				rows={data}
				title="In progress"
			/>
		</StaffPage>
	);
}

export function AssignButton({ row }: { row: RevisionRow }) {
	const forReview = row.status === "submitted" || row.status === "in_review";
	const forWriter = row.status === "draft";
	const [open, setOpen] = useState(false);
	if (!forReview && !forWriter) return null;

	return (
		<>
			<StaffButton onClick={() => setOpen(true)} variant="outline">
				{forWriter ? "Hand to a writer" : "Assign a reviewer"}
			</StaffButton>
			{open ? (
				<AssignDialog
					forWriter={forWriter}
					onClose={() => setOpen(false)}
					row={row}
				/>
			) : null}
		</>
	);
}

function AssignDialog({
	forWriter,
	onClose,
	row,
}: {
	forWriter: boolean;
	onClose: () => void;
	row: RevisionRow;
}) {
	const selectId = useId();
	const { data } = useSuspenseQuery(assignablePeopleQueryOptions());
	const [assigneeUserId, setAssigneeUserId] = useState("");
	const people = forWriter ? data.writers : data.reviewers;
	const options = people.filter(({ name }) => name !== row.author);

	const assign = useContentMutation(
		() => {
			const input = {
				data: { assigneeUserId, revisionId: row.revisionId },
			};
			return forWriter ? assignWriter(input) : assignReviewer(input);
		},
		() => {
			toast.success("Assigned. They've been told.");
			onClose();
		},
	);

	return (
		<StaffFormDialog
			canSubmit={assigneeUserId !== ""}
			description={
				forWriter
					? `${row.title} moves to them, and they become its author.`
					: `${row.title} shows up in their Assignments. Others can still pick it up.`
			}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
			onSubmit={() => assign.mutate(undefined)}
			open
			pending={assign.isPending}
			submitLabel="Assign"
			title={forWriter ? "Hand to a writer" : "Assign a reviewer"}
		>
			<div className="space-y-2">
				<label className="font-semibold text-sm" htmlFor={selectId}>
					Person
				</label>
				<select
					className="block h-11 w-full rounded-[0.625rem] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					id={selectId}
					onChange={(event) => setAssigneeUserId(event.target.value)}
					value={assigneeUserId}
				>
					<option disabled value="">
						Choose someone…
					</option>
					{options.map(({ id, name }) => (
						<option key={id} value={id}>
							{name}
						</option>
					))}
				</select>
			</div>
		</StaffFormDialog>
	);
}

export function ContentIssuesPage() {
	const { data } = useSuspenseQuery(openIssuesQueryOptions());
	const close = useContentMutation(
		(input: { issueId: number; outcome: "dismissed" | "resolved" }) =>
			closeIssue({ data: input }),
		(_result, { outcome }) =>
			toast.success(outcome === "resolved" ? "Resolved." : "Dismissed."),
	);

	return (
		<StaffPage
			description="Problems raised about content. They don't stop publishing, so nothing here blocks anyone."
			section="Administration"
			title="Content Issues"
		>
			<StaffCard title="Open">
				{data.length === 0 ? (
					<p className="text-muted-foreground text-sm">No open issues.</p>
				) : (
					<ul className="divide-y divide-border-subtle">
						{data.map((issue) => (
							<li
								className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
								key={issue.id}
							>
								<div className="min-w-0 flex-1 basis-64">
									<p className="font-semibold text-sm">
										{issue.title} · Revision #{issue.number}
									</p>
									<p className="mt-0.5 text-sm">{issue.description}</p>
									<p className="mt-0.5 text-muted-foreground text-xs">
										{contentIssueTypeLabels[issue.issueType]} ·{" "}
										{issue.reportedBy ?? "Deleted member"} ·{" "}
										{formatStaffDate(issue.createdAt)}
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<Link
										className={staffLinkClassName}
										params={{
											contentId: String(issue.contentItemId),
											revisionId: String(issue.revisionId),
										}}
										search={{ tab: "issues" }}
										to="/admin/editorial/$contentId/revisions/$revisionId"
									>
										Open
									</Link>
									<StaffButton
										disabled={close.isPending}
										onClick={() =>
											close.mutate({ issueId: issue.id, outcome: "resolved" })
										}
										variant="outline"
									>
										Resolve
									</StaffButton>
									<StaffButton
										disabled={close.isPending}
										onClick={() =>
											close.mutate({ issueId: issue.id, outcome: "dismissed" })
										}
										variant="ghost"
									>
										Dismiss
									</StaffButton>
								</div>
							</li>
						))}
					</ul>
				)}
			</StaffCard>
		</StaffPage>
	);
}
