import { and, count, eq, isNull, ne } from "drizzle-orm";

import type { PermissionKey } from "./access-catalogue";
import type { DbExecutor } from "./db-executor";
import { changeProposals } from "./schema/change_proposals";
import { communityReports } from "./schema/community_reports";
import { contentIssues } from "./schema/content_issues";

export type StaffQueue =
	| "contentIssues"
	| "communityReports"
	| "pendingConfirmations";

/**
 * How many items are waiting in each staff queue, for the sidebar counts. Only
 * includes queues this person's permissions let them work on.
 */
export async function getStaffQueueCounts(
	client: DbExecutor,
	viewer: { permissionKeys: readonly PermissionKey[]; userId: string },
) {
	const { permissionKeys, userId } = viewer;
	const counts: Partial<Record<StaffQueue, number>> = {};

	if (permissionKeys.includes("issues.manage")) {
		const [result] = await client
			.select({ value: count() })
			.from(contentIssues)
			.where(eq(contentIssues.status, "open"));
		counts.contentIssues = result?.value ?? 0;
	}

	if (permissionKeys.includes("community.moderate")) {
		const [result] = await client
			.select({ value: count() })
			.from(communityReports)
			.where(isNull(communityReports.resolution));
		counts.communityReports = result?.value ?? 0;
	}

	if (permissionKeys.includes("admins.manage")) {
		// Your own proposals aren't waiting on you, because someone else must decide them.
		const [result] = await client
			.select({ value: count() })
			.from(changeProposals)
			.where(
				and(
					eq(changeProposals.status, "proposed"),
					ne(changeProposals.proposerUserId, userId),
				),
			);
		counts.pendingConfirmations = result?.value ?? 0;
	}

	return counts;
}
