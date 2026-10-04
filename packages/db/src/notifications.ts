import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNull,
	lt,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { db } from "./index";
import type { NotificationPreferenceKey } from "./notification-preferences";
import { getNotificationPreferences } from "./notification-settings";
import { notifications } from "./schema/notifications";

type DbClient = typeof db;

export const notificationCategories = [
	"community",
	"reading",
	"saved",
	"security",
] as const;

export type NotificationCategory = (typeof notificationCategories)[number];

export type NotificationPageInput = {
	category?: NotificationCategory;
	cursor?: { createdAt: Date; id: number };
	limit?: number;
	query?: string;
	unreadOnly?: boolean;
};

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
	if (!preferences.push || !preferences[preference]) return null;

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

/**
 * Returns one bounded page of a user's inbox plus the counts needed by the
 * notification filters. The cursor keeps a growing inbox from becoming an
 * unbounded browser payload.
 */
export async function getNotificationPage(
	db: DbClient,
	userId: string,
	{
		category,
		cursor,
		limit = 20,
		query,
		unreadOnly = false,
	}: NotificationPageInput = {},
) {
	const conditions: SQL[] = [eq(notifications.userId, userId)];
	const normalizedQuery = query?.trim();

	if (category) conditions.push(categoryCondition(category));
	if (unreadOnly) conditions.push(isNull(notifications.readAt));
	if (normalizedQuery) {
		const pattern = `%${normalizedQuery}%`;
		const matchesQuery = or(
			ilike(notifications.title, pattern),
			ilike(notifications.body, pattern),
		);
		if (matchesQuery) conditions.push(matchesQuery);
	}
	if (cursor) {
		const isOlderThanCursor = or(
			lt(notifications.createdAt, cursor.createdAt),
			and(
				eq(notifications.createdAt, cursor.createdAt),
				lt(notifications.id, cursor.id),
			),
		);
		if (isOlderThanCursor) conditions.push(isOlderThanCursor);
	}

	const pageSize = Math.min(Math.max(limit, 1), 50);
	const [items, total, unread, ...categoryCounts] = await Promise.all([
		db
			.select()
			.from(notifications)
			.where(and(...conditions))
			.orderBy(desc(notifications.createdAt), desc(notifications.id))
			.limit(pageSize + 1),
		db
			.select({ value: count() })
			.from(notifications)
			.where(eq(notifications.userId, userId)),
		db
			.select({ value: count() })
			.from(notifications)
			.where(
				and(eq(notifications.userId, userId), isNull(notifications.readAt)),
			),
		...notificationCategories.map((item) =>
			db
				.select({ value: count() })
				.from(notifications)
				.where(and(eq(notifications.userId, userId), categoryCondition(item))),
		),
	]);

	const hasMore = items.length > pageSize;
	const page = hasMore ? items.slice(0, pageSize) : items;
	const lastItem = page.at(-1);

	return {
		notifications: page,
		totalCount: total[0]?.value ?? 0,
		unreadCount: unread[0]?.value ?? 0,
		categoryCounts: Object.fromEntries(
			notificationCategories.map((item, index) => [
				item,
				categoryCounts[index]?.[0]?.value ?? 0,
			]),
		) as Record<NotificationCategory, number>,
		nextCursor:
			hasMore && lastItem
				? { createdAt: lastItem.createdAt.toISOString(), id: lastItem.id }
				: null,
	};
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

export async function markNotificationUnread(
	db: DbClient,
	userId: string,
	notificationId: number,
) {
	const [notification] = await db
		.update(notifications)
		.set({ readAt: null })
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, userId),
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

function categoryCondition(category: NotificationCategory) {
	switch (category) {
		case "security":
			return kindsMatching("%security%", "%sign_in%", "%session%");
		case "community":
			return kindsMatching("%comment%", "%reply%", "%mention%", "%note%");
		case "reading":
			return kindsMatching("%reading%");
		case "saved":
			return kindsMatching("%saved%", "%bookmark%", "%collection%");
	}
}

function kindsMatching(...patterns: string[]) {
	return (
		or(...patterns.map((pattern) => ilike(notifications.kind, pattern))) ??
		sql`false`
	);
}
