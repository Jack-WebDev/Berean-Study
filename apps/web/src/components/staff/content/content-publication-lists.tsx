import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { publishRevision } from "@/functions/content";
import {
	approvedContentQueryOptions,
	liveContentQueryOptions,
} from "@/queries/content";

import { foundationalConfirmationsQueryOptions } from "@/queries/study-content";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { RevisionList, useContentMutation } from "./content-display";

/** Approved content waiting to go live, and what readers can see now. */
export function ContentPublicationLists({
	permissionKeys,
}: {
	permissionKeys: readonly PermissionKey[];
}) {
	const { data: approved } = useSuspenseQuery(approvedContentQueryOptions());
	const { data: live } = useSuspenseQuery(liveContentQueryOptions());
	const canPublish = permissionKeys.includes("publication.publish");
	const canConfirm = permissionKeys.includes("content.confirm_foundational");
	const { data: confirmations = [] } = useQuery({
		...foundationalConfirmationsQueryOptions(),
		enabled: canConfirm,
	});
	const publish = useContentMutation(
		(revisionId: number) => publishRevision({ data: { revisionId } }),
		() => toast.success("Published. Readers can see this now."),
	);

	return (
		<>
			{confirmations.length > 0 ? (
				<StaffCard title="Waiting for a second Superadmin">
					<ul className="divide-y divide-border-subtle">
						{confirmations.map((confirmation) => (
							<li
								className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
								key={confirmation.id}
							>
								<span className="min-w-0 text-sm">
									<span className="block font-medium">
										{confirmation.description}
									</span>
									<span className="block text-muted-foreground text-xs">
										{confirmation.proposedByMe
											? "You proposed this, so someone else decides it. "
											: ""}
										{confirmation.reason}
									</span>
								</span>
								<Link
									className={staffLinkClassName}
									to={confirmation.destination as never}
								>
									Open
								</Link>
							</li>
						))}
					</ul>
				</StaffCard>
			) : null}
			<RevisionList
				actions={(row) =>
					canPublish ? (
						<StaffButton
							disabled={publish.isPending}
							onClick={() => publish.mutate(row.revisionId)}
						>
							Publish Revision #{row.number}
						</StaffButton>
					) : null
				}
				emptyMessage="Nothing is waiting. Content appears here once it's approved."
				rows={approved}
				title="Content ready to publish"
			/>
			<RevisionList
				emptyMessage="Nothing is live yet."
				rows={live}
				title="Live content"
			/>
		</>
	);
}
