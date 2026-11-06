import { db } from "@berean-study/db";
import { getPermissionKeys, getPrimaryRole } from "@berean-study/db/access";
import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

/**
 * The signed-in person and what they may do. Code decides access from
 * `permissionKeys`. `staffRoleLabel` is display text for the account chip, and is
 * empty for ordinary members so their sidebar stays as it was.
 */
export const getViewer = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		if (!context.session) {
			return null;
		}

		const userId = context.session.user.id;
		const [permissionKeys, primaryRole] = await Promise.all([
			getPermissionKeys(db, userId),
			getPrimaryRole(db, userId),
		]);

		return {
			session: context.session,
			permissionKeys,
			staffRoleLabel:
				primaryRole && !primaryRole.autoAssign ? primaryRole.name : null,
		};
	});
