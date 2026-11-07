import { db } from "@berean-study/db";
import { getAdminOverview as getAdminOverviewFromDb } from "@berean-study/db/admin-overview";
import { getStaffQueueCounts as getStaffQueueCountsFromDb } from "@berean-study/db/staff-queues";
import { createServerFn } from "@tanstack/react-start";

import { requirePermission } from "@/middleware/auth";

export const getStaffQueueCounts = createServerFn({ method: "GET" })
	.middleware([
		requirePermission(
			"issues.manage",
			"community.moderate",
			"admins.manage",
			"scripture.enter",
			"scripture.proofread",
			"publication.publish",
			"canon.manage",
			"scripture.manage",
			"editorial.review",
			"editorial.assign",
			"content.write",
			"sources.retire",
		),
	])
	.handler(({ context }) =>
		getStaffQueueCountsFromDb(db, {
			permissionKeys: context.permissionKeys,
			userId: context.userId,
		}),
	);

/** Who may open Administration > Overview. Matches the sidebar link. */
export const getAdminOverview = createServerFn({ method: "GET" })
	.middleware([
		requirePermission(
			"editorial.assign",
			"publication.publish",
			"publication.withdraw",
			"issues.manage",
			"community.moderate",
			"contributors.manage",
		),
	])
	.handler(({ context }) =>
		getAdminOverviewFromDb(db, {
			permissionKeys: context.permissionKeys,
			userId: context.userId,
		}),
	);
