import {
	type ContentRevisionStatus,
	contentRevisionStatusLabels,
} from "@berean-study/db/content-kinds";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { formatStaffDate } from "@/lib/format";
import { invalidateContent } from "@/queries/content";

import { staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StatusChip, type StatusTone } from "../status-chip";

const statusTones: Record<ContentRevisionStatus, StatusTone> = {
	draft: "neutral",
	submitted: "info",
	in_review: "info",
	changes_requested: "danger",
	approved: "success",
	published: "success",
	superseded: "neutral",
	withdrawn: "attention",
};

export function RevisionStatusChip({
	status,
}: {
	status: ContentRevisionStatus;
}) {
	return (
		<StatusChip tone={statusTones[status]}>
			{contentRevisionStatusLabels[status]}
		</StatusChip>
	);
}

/** Any step in the workflow shows its message on failure and refreshes what depends on it. */
export function useContentMutation<TVariables, TResult>(
	mutationFn: (variables: TVariables) => Promise<TResult>,
	onSuccess?: (result: TResult, variables: TVariables) => void,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onError: (error) => toast.error(error.message),
		onSettled: () => invalidateContent(queryClient),
		onSuccess,
	});
}

export type RevisionRow = {
	author: string;
	contentItemId: number;
	kindLabel: string;
	number: number;
	reviewer: string | null;
	revisionId: number;
	status: ContentRevisionStatus;
	submittedAt: Date | null;
	title: string;
};

/** The same row in every queue, so people learn it once. */
export function RevisionList({
	actions,
	emptyMessage,
	rows,
	title,
}: {
	actions?: (row: RevisionRow) => ReactNode;
	emptyMessage: string;
	rows: readonly RevisionRow[];
	title: string;
}) {
	return (
		<StaffCard title={title}>
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">{emptyMessage}</p>
			) : (
				<ul className="divide-y divide-border-subtle">
					{rows.map((row) => (
						<li
							className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
							key={row.revisionId}
						>
							<div className="min-w-0">
								<p className="flex flex-wrap items-center gap-2 font-semibold">
									{row.title}
									<RevisionStatusChip status={row.status} />
								</p>
								<p className="text-muted-foreground text-sm">
									{row.kindLabel} · Revision #{row.number} · {row.author}
									{row.submittedAt
										? ` · sent ${formatStaffDate(row.submittedAt)}`
										: ""}
									{row.reviewer ? ` · reviewer ${row.reviewer}` : ""}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{actions?.(row)}
								<Link
									className={staffLinkClassName}
									params={{
										contentId: String(row.contentItemId),
										revisionId: String(row.revisionId),
									}}
									to="/admin/editorial/$contentId/revisions/$revisionId"
								>
									Open
								</Link>
							</div>
						</li>
					))}
				</ul>
			)}
		</StaffCard>
	);
}
