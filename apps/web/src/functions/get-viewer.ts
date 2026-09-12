import { getEffectivePermissionKeys } from "@berean-study/db/effective-permissions";
import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

/**
 * The authenticated identity and the capabilities granted through all of the
 * user's roles. Role names intentionally do not leave this boundary.
 */
export const getViewer = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		if (!context.session) {
			return null;
		}

		return {
			session: context.session,
			permissionKeys: await getEffectivePermissionKeys(context.session.user.id),
		};
	});
