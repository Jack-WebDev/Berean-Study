import { auth } from "@berean-study/auth";
import { db } from "@berean-study/db";
import { getPermissionKeys } from "@berean-study/db/access";
import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(
	async ({ next, request }) => {
		const session = await auth.api.getSession({
			headers: request.headers,
		});
		return next({
			context: { session },
		});
	},
);

/**
 * Stops a server function unless the signed-in person holds at least one of
 * these permissions.
 *
 * This is the real security check. Route guards and hidden sidebar links only
 * tidy up the interface, because anyone can call a server function directly.
 */
export function requirePermission(
	...anyOf: [PermissionKey, ...PermissionKey[]]
) {
	return createMiddleware()
		.middleware([authMiddleware])
		.server(async ({ context, next }) => {
			if (!context.session) throw new Error("Unauthorized");

			const userId = context.session.user.id;
			const permissionKeys = await getPermissionKeys(db, userId);
			if (!anyOf.some((key) => permissionKeys.includes(key))) {
				throw new Error("You don't have permission to do this.");
			}

			return next({ context: { permissionKeys, userId } });
		});
}
