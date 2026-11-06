import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { formatStaffDate } from "@/lib/format";
import { pendingChangesQueryOptions } from "@/queries/people";

import { StaffCard } from "../staff-card";
import { StatusChip } from "../status-chip";

/** Changes waiting for a second person. Your own are marked, since you can't decide them. */
export function PendingChanges({ viewerId }: { viewerId: string }) {
	const { data: changes } = useQuery(pendingChangesQueryOptions());

	if (!changes?.length) return null;

	return (
		<StaffCard className="mb-6" title="Waiting for a second Superadmin">
			<ul className="divide-y divide-border-subtle">
				{changes.map((change) => (
					<li
						className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
						key={change.id}
					>
						<div className="min-w-0">
							<Link
								className="font-medium text-sm underline-offset-4 hover:underline"
								to={change.destination}
							>
								{change.description}
							</Link>
							<p className="text-muted-foreground text-xs">
								{change.title}, proposed {formatStaffDate(change.createdAt)}
							</p>
						</div>
						<StatusChip
							tone={change.proposerUserId === viewerId ? "neutral" : "info"}
						>
							{change.proposerUserId === viewerId
								? "You proposed this"
								: "Needs your decision"}
						</StatusChip>
					</li>
				))}
			</ul>
		</StaffCard>
	);
}
