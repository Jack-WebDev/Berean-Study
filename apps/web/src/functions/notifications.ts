import { db } from "@berean-study/db";
import {
	getNotificationInbox as getNotificationInboxFromDb,
	getNotificationPage as getNotificationPageFromDb,
	markAllNotificationsRead as markAllNotificationsReadInDb,
	markNotificationRead as markNotificationReadInDb,
	markNotificationUnread as markNotificationUnreadInDb,
} from "@berean-study/db/notifications";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

const notificationIdSchema = z.object({
	id: z.number().int().positive(),
});

const notificationPageSchema = z.object({
	category: z.enum(["community", "reading", "saved", "security"]).optional(),
	cursor: z
		.object({
			createdAt: z.iso.datetime(),
			id: z.number().int().positive(),
		})
		.optional(),
	limit: z.number().int().min(1).max(50).optional(),
	query: z.string().trim().max(200).optional(),
	unreadOnly: z.boolean().optional(),
});

function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getNotificationInbox = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getNotificationInboxFromDb(db, requireUserId(context.session)),
	);

export const getRecentNotifications = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getNotificationInboxFromDb(db, requireUserId(context.session), 5),
	);

export const getNotificationPage = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(notificationPageSchema)
	.handler(({ context, data }) =>
		getNotificationPageFromDb(db, requireUserId(context.session), {
			...data,
			cursor: data.cursor
				? { ...data.cursor, createdAt: new Date(data.cursor.createdAt) }
				: undefined,
		}),
	);

export const markNotificationRead = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(notificationIdSchema)
	.handler(({ context, data }) =>
		markNotificationReadInDb(db, requireUserId(context.session), data.id),
	);

export const markNotificationUnread = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(notificationIdSchema)
	.handler(({ context, data }) =>
		markNotificationUnreadInDb(db, requireUserId(context.session), data.id),
	);

export const markAllNotificationsRead = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		markAllNotificationsReadInDb(db, requireUserId(context.session)),
	);
