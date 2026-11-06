import { db } from "@berean-study/db";
import { auditDomains } from "@berean-study/db/audit-catalogue";
import {
	exportAuditEntries as exportAuditEntriesFromDb,
	listAuditEntries as listAuditEntriesFromDb,
} from "@berean-study/db/audit-log";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const filterSchema = z.object({
	domain: z.enum(auditDomains).optional(),
	mine: z.boolean().optional(),
});

function viewerFrom(context: {
	permissionKeys: readonly string[];
	userId: string;
}) {
	return {
		canViewAll: context.permissionKeys.includes("audit.view_all"),
		userId: context.userId,
	};
}

export const listAuditEntries = createServerFn({ method: "GET" })
	.middleware([requirePermission("audit.view", "audit.view_all")])
	.validator(filterSchema.extend({ page: z.number().int().positive() }))
	.handler(({ context, data }) =>
		listAuditEntriesFromDb(db, viewerFrom(context), data),
	);

export const exportAuditEntries = createServerFn({ method: "GET" })
	.middleware([requirePermission("audit.view", "audit.view_all")])
	.validator(filterSchema)
	.handler(({ context, data }) =>
		exportAuditEntriesFromDb(db, viewerFrom(context), data),
	);
