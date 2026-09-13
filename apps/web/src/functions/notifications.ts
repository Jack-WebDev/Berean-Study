import { createDb } from "@berean-study/db";
import {
	getNotificationInbox as getNotificationInboxFromDb,
	markAllNotificationsRead as markAllNotificationsReadInDb,
	markNotificationRead as markNotificationReadInDb,
} from "@berean-study/db/notifications";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

const notificationIdSchema = z.object({
	id: z.number().int().positive(),
});

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getNotificationInbox = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getNotificationInboxFromDb(createDb(), requireUserId(context.session)),
	);

export const getRecentNotifications = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getNotificationInboxFromDb(createDb(), requireUserId(context.session), 5),
	);

export const markNotificationRead = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(notificationIdSchema)
	.handler(({ context, data }) =>
		markNotificationReadInDb(
			createDb(),
			requireUserId(context.session),
			data.id,
		),
	);

export const markAllNotificationsRead = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		markAllNotificationsReadInDb(createDb(), requireUserId(context.session)),
	);
