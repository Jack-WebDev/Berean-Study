import { count, eq, isNull } from "drizzle-orm";

import type { PermissionKey } from "./access-catalogue";
import type { DbExecutor } from "./db-executor";
import { communityReports } from "./schema/community_reports";
import { contentIssues } from "./schema/content_issues";

export type StaffQueue = "contentIssues" | "communityReports";

/**
 * How many items are waiting in each staff queue, for the sidebar counts. Only
 * includes queues this person's permissions let them work on.
 */
export async function getStaffQueueCounts(
	client: DbExecutor,
	permissionKeys: readonly PermissionKey[],
) {
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

	return counts;
}
