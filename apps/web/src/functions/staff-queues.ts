import { db } from "@berean-study/db";
import { getStaffQueueCounts as getStaffQueueCountsFromDb } from "@berean-study/db/staff-queues";
import { createServerFn } from "@tanstack/react-start";

import { requirePermission } from "@/middleware/auth";

export const getStaffQueueCounts = createServerFn({ method: "GET" })
	.middleware([requirePermission("issues.manage", "community.moderate")])
	.handler(({ context }) =>
		getStaffQueueCountsFromDb(db, context.permissionKeys),
	);
