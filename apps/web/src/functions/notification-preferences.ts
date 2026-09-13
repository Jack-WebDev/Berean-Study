import { createDb } from "@berean-study/db";
import {
	getNotificationPreferences as getNotificationPreferencesFromDb,
	saveNotificationPreferences as saveNotificationPreferencesToDb,
} from "@berean-study/db/notification-settings";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

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
});

export const getNotificationPreferences = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return getNotificationPreferencesFromDb(
			createDb(),
			context.session.user.id,
		);
	});

export const updateNotificationPreferences = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(notificationPreferencesSchema)
	.handler(async ({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");

		return saveNotificationPreferencesToDb(
			createDb(),
			context.session.user.id,
			data,
		);
	});
