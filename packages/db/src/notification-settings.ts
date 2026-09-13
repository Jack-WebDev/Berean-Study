import { and, eq, isNull } from "drizzle-orm";

import type { createDb } from "./index";
import {
	defaultNotificationPreferences,
	type NotificationPreferences,
} from "./notification-preferences";
import { session, user } from "./schema/auth";
import { userPreferences } from "./schema/user_preferences";

type DbClient = ReturnType<typeof createDb>;

function toNotificationPreferences(
	preferences: typeof userPreferences.$inferSelect | undefined,
): NotificationPreferences {
	if (!preferences) return { ...defaultNotificationPreferences };

	return {
		email: preferences.emailNotificationsEnabled,
		push: preferences.pushNotificationsEnabled,
		comments: preferences.commentaryNotificationsEnabled,
		updates: preferences.contentUpdateNotificationsEnabled,
		resources: preferences.resourceNotificationsEnabled,
		replies: preferences.replyNotificationsEnabled,
		mentions: preferences.mentionNotificationsEnabled,
		reports: preferences.reportNotificationsEnabled,
		security: preferences.securityNotificationsEnabled,
		account: preferences.accountNotificationsEnabled,
	};
}

function toPreferenceColumns(preferences: NotificationPreferences) {
	return {
		emailNotificationsEnabled: preferences.email,
		pushNotificationsEnabled: preferences.push,
		commentaryNotificationsEnabled: preferences.comments,
		contentUpdateNotificationsEnabled: preferences.updates,
		resourceNotificationsEnabled: preferences.resources,
		replyNotificationsEnabled: preferences.replies,
		mentionNotificationsEnabled: preferences.mentions,
		reportNotificationsEnabled: preferences.reports,
		securityNotificationsEnabled: preferences.security,
		accountNotificationsEnabled: preferences.account,
	};
}

export async function getNotificationPreferences(
	db: DbClient,
	userId: string,
): Promise<NotificationPreferences> {
	const [preferences] = await db
		.select()
		.from(userPreferences)
		.where(eq(userPreferences.userId, userId))
		.limit(1);

	return toNotificationPreferences(preferences);
}

export async function saveNotificationPreferences(
	db: DbClient,
	userId: string,
	preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
	const values = toPreferenceColumns(preferences);

	await db
		.insert(userPreferences)
		.values({ userId, ...values })
		.onConflictDoUpdate({
			target: userPreferences.userId,
			set: values,
		});

	return preferences;
}

export async function claimSecurityEmailDelivery(
	db: DbClient,
	sessionId: string,
): Promise<boolean> {
	const [claimedSession] = await db
		.update(session)
		.set({ securityEmailNotificationAttemptedAt: new Date() })
		.where(
			and(
				eq(session.id, sessionId),
				isNull(session.securityEmailNotificationAttemptedAt),
			),
		)
		.returning({ id: session.id });

	return Boolean(claimedSession);
}

export async function getNotificationRecipient(db: DbClient, userId: string) {
	const [recipient] = await db
		.select({ email: user.email, name: user.name })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	return recipient;
}
