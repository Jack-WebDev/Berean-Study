import { db } from "@berean-study/db";
import {
	getNotificationPreferences as getNotificationPreferencesFromDb,
	saveNotificationPreferences as saveNotificationPreferencesToDb,
} from "@berean-study/db/notification-settings";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware, requireUserId } from "@/middleware/auth";

const notificationPreferencesSchema = z.object({
	email: z.boolean(),
	push: z.boolean(),
	comments: z.boolean(),
	updates: z.boolean(),
	resources: z.boolean(),
	replies: z.boolean(),
	mentions: z.boolean(),
	reports: z.boolean(),
	security: z.boolean(),
	account: z.boolean(),
	emailTopics: z.object({
		comments: z.boolean(),
		updates: z.boolean(),
		resources: z.boolean(),
		replies: z.boolean(),
		mentions: z.boolean(),
		reports: z.boolean(),
		security: z.boolean(),
		account: z.boolean(),
	}),
});

export const getNotificationPreferences = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const userId = requireUserId(context.session);
		return getNotificationPreferencesFromDb(db, userId);
	});

export const updateNotificationPreferences = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(notificationPreferencesSchema)
	.handler(async ({ context, data }) => {
		const userId = requireUserId(context.session);
		return saveNotificationPreferencesToDb(db, userId, data);
	});
