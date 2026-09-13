import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { createDb } from "./index";
import type { NotificationPreferenceKey } from "./notification-preferences";
import { getNotificationPreferences } from "./notification-settings";
import { notifications } from "./schema/notifications";

type DbClient = ReturnType<typeof createDb>;

export type CreateNotificationInput = {
	body: string;
	destination?: string;
	kind: string;
	title: string;
	userId: string;
};

function assertInternalDestination(destination: string | undefined) {
	if (destination && !destination.startsWith("/")) {
		throw new Error("Notification destinations must be internal paths.");
	}
}

/**
 * Creates a required in-app notification after its domain operation succeeds.
 * Callers should use the same transaction as that domain operation when one is
 * available.
 */
export async function createNotification(
	db: DbClient,
	input: CreateNotificationInput,
) {
	assertInternalDestination(input.destination);

	const [notification] = await db
		.insert(notifications)
		.values(input)
		.returning();

	return notification;
}

/** Creates an optional notification only when its recipient has enabled it. */
export async function createOptionalNotification(
	db: DbClient,
	input: CreateNotificationInput,
	preference: Exclude<NotificationPreferenceKey, "email" | "push">,
) {
	const preferences = await getNotificationPreferences(db, input.userId);
	if (!preferences[preference]) return null;

	return createNotification(db, input);
}

export async function getNotificationInbox(
	db: DbClient,
	userId: string,
	limit = 50,
) {
	const [items, unread] = await Promise.all([
		db
			.select()
			.from(notifications)
			.where(eq(notifications.userId, userId))
			.orderBy(desc(notifications.createdAt), desc(notifications.id))
			.limit(limit),
		db
			.select({ value: count() })
			.from(notifications)
			.where(
				and(eq(notifications.userId, userId), isNull(notifications.readAt)),
			),
	]);

	return { notifications: items, unreadCount: unread[0]?.value ?? 0 };
}

export async function markNotificationRead(
	db: DbClient,
	userId: string,
	notificationId: number,
) {
	const [notification] = await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, userId),
				isNull(notifications.readAt),
			),
		)
		.returning({ id: notifications.id });

	return Boolean(notification);
}

export async function markAllNotificationsRead(db: DbClient, userId: string) {
	const updated = await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
		.returning({ id: notifications.id });

	return updated.length;
}
