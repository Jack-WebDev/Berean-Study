import { db } from "@berean-study/db";
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
		),
	])
	.handler(({ context }) =>
		getStaffQueueCountsFromDb(db, {
			permissionKeys: context.permissionKeys,
			userId: context.userId,
		}),
	);
