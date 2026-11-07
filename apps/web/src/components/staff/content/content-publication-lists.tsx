import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { publishRevision } from "@/functions/content";
import {
	approvedContentQueryOptions,
	liveContentQueryOptions,
} from "@/queries/content";

import { StaffButton } from "../staff-button";
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
	const publish = useContentMutation(
		(revisionId: number) => publishRevision({ data: { revisionId } }),
		() => toast.success("Published. Readers can see this now."),
	);

	return (
		<>
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
