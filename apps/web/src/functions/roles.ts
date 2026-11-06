import { db } from "@berean-study/db";
import { isPermissionKey } from "@berean-study/db/access-catalogue";
import {
	createRole as createRoleInDb,
	getRoleMatrix as getRoleMatrixFromDb,
	saveRolePermissions as saveRolePermissionsInDb,
} from "@berean-study/db/role-admin";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

export const getRoleMatrix = createServerFn({ method: "GET" })
	.middleware([requirePermission("roles.manage")])
	.handler(() => getRoleMatrixFromDb(db));

export const saveRolePermissions = createServerFn({ method: "POST" })
	.middleware([requirePermission("roles.manage")])
	.validator(
		z.object({
			changes: z
				.array(
					z.object({
						roleId: z.number().int().positive(),
						permission: z.string().refine(isPermissionKey),
						granted: z.boolean(),
					}),
				)
				.min(1)
				.max(500),
			reason: z.string().trim().min(1).max(1000),
		}),
	)
	.handler(({ context, data }) =>
		saveRolePermissionsInDb(db, { ...data, actorUserId: context.userId }),
	);

export const createRole = createServerFn({ method: "POST" })
	.middleware([requirePermission("roles.manage")])
	.validator(
		z.object({
			name: z.string().trim().min(1).max(60),
			description: z.string().trim().max(200),
		}),
	)
	.handler(({ context, data }) =>
		createRoleInDb(db, { ...data, actorUserId: context.userId }),
	);
