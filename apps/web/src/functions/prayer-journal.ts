import { db } from "@berean-study/db";
import {
	getPrayerJournalCounts as getPrayerJournalCountsFromDb,
	getReflectionReminder as getReflectionReminderFromDb,
	setReflectionReminder as setReflectionReminderInDb,
} from "@berean-study/db/prayer-journal";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

export function requireUserId(session: { user: { id: string } } | null) {
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getPrayerJournalCounts = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getPrayerJournalCountsFromDb(db, requireUserId(context.session)),
	);

export const getReflectionReminder = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) =>
		getReflectionReminderFromDb(db, requireUserId(context.session)),
	);

export const setReflectionReminder = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ enabled: z.boolean() }))
	.handler(({ context, data }) =>
		setReflectionReminderInDb(db, requireUserId(context.session), data.enabled),
	);
