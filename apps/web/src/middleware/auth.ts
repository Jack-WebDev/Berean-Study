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

export function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

/**
 * Stops a server function unless the signed-in person holds at least one of
 * these permissions.
 *
 * This is the real security check for a plain "you need this permission" rule.
 * Route guards and hidden sidebar links only tidy up the interface, because
 * anyone can call a server function directly.
 *
 * When the permission needed depends on the input or the data, such as "passing
 * a chapter is proofreading, but publishing it too needs publication.publish",
 * check it in the db function that does the step instead, where it's tested.
 * Don't add it here or in the handler.
 */
export function requirePermission(
	...anyOf: [PermissionKey, ...PermissionKey[]]
) {
	return createMiddleware()
		.middleware([authMiddleware])
		.server(async ({ context, next }) => {
			const userId = requireUserId(context.session);
			const permissionKeys = await getPermissionKeys(db, userId);
			if (!anyOf.some((key) => permissionKeys.includes(key))) {
				throw new Error("You don't have permission to do this.");
			}

			return next({ context: { permissionKeys, userId } });
		});
}
