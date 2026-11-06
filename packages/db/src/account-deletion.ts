import { and, eq, notExists } from "drizzle-orm";

import { recordAudit } from "./audit";
import type { DbExecutor } from "./db-executor";
import { assertSuperadminsRemainAfterRemoving } from "./role-rules";
import { account, session, twoFactor, user, verification } from "./schema/auth";
import { bookmarks } from "./schema/bookmarks";
import { collections } from "./schema/collections";
import { communityPostBookmarks } from "./schema/community_post_bookmarks";
import { communityPosts } from "./schema/community_posts";
import { communityReports } from "./schema/community_reports";
import { highlights } from "./schema/highlights";
import { userNoteTags } from "./schema/note_tags";
import { notes } from "./schema/notes";
import { notifications } from "./schema/notifications";
import { prayerReflections } from "./schema/prayer_reflections";
import { prayers } from "./schema/prayers";
import { readingHistory } from "./schema/reading_history";
import { readingPositions } from "./schema/reading_positions";
import { studyTrails } from "./schema/study_trails";
import { testimonies } from "./schema/testimonies";
import { userPreferences } from "./schema/user_preferences";
import { userRoles } from "./schema/user_roles";

const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Everything a real delete would have removed, so retiring an account erases the
 * same things. A test compares this list against the database, so a new table
 * holding personal data can't be forgotten.
 */
export const erasedOnRetirement = [
	{ table: session, userIdColumn: session.userId },
	{ table: account, userIdColumn: account.userId },
	{ table: twoFactor, userIdColumn: twoFactor.userId },
	{ table: notifications, userIdColumn: notifications.userId },
	{ table: bookmarks, userIdColumn: bookmarks.userId },
	{ table: userNoteTags, userIdColumn: userNoteTags.userId },
	{ table: prayerReflections, userIdColumn: prayerReflections.userId },
	{ table: prayers, userIdColumn: prayers.userId },
	{ table: readingPositions, userIdColumn: readingPositions.userId },
	{ table: readingHistory, userIdColumn: readingHistory.userId },
	{ table: studyTrails, userIdColumn: studyTrails.userId },
	{ table: userPreferences, userIdColumn: userPreferences.userId },
	{ table: highlights, userIdColumn: highlights.userId },
	{ table: notes, userIdColumn: notes.userId },
	{ table: collections, userIdColumn: collections.userId },
	{ table: testimonies, userIdColumn: testimonies.userId },
	{
		table: communityPostBookmarks,
		userIdColumn: communityPostBookmarks.userId,
	},
	{ table: userRoles, userIdColumn: userRoles.userId },
];

function isForeignKeyViolation(error: unknown) {
	return (
		error instanceof Error &&
		error.cause instanceof Error &&
		"code" in error.cause &&
		error.cause.code === FOREIGN_KEY_VIOLATION
	);
}

/**
 * Deletes someone's account at their request.
 *
 * With no record of staff or moderation activity, the account simply goes. If the
 * database refuses because that record depends on it, the account is retired
 * instead: everything personal is erased, and what remains shows "Deleted member",
 * so the audit log and editorial history stay complete.
 */
export async function deleteAccount(client: DbExecutor, userId: string) {
	return client.transaction(async (tx) => {
		await assertSuperadminsRemainAfterRemoving(tx, userId);

		try {
			// A nested transaction, so a refusal doesn't abort the outer one.
			await tx.transaction((attempt) =>
				attempt.delete(user).where(eq(user.id, userId)),
			);
			return "deleted" as const;
		} catch (error) {
			if (!isForeignKeyViolation(error)) throw error;
		}

		await retireAccount(tx, userId);
		return "retired" as const;
	});
}

async function retireAccount(tx: DbExecutor, userId: string) {
	const [person] = await tx
		.select({ email: user.email })
		.from(user)
		.where(eq(user.id, userId));
	if (!person) return;

	// Recorded first, while the entry can still capture the role they held.
	await recordAudit(tx, {
		actorUserId: userId,
		action: "user.account_retired",
		targetType: "user",
		targetId: userId,
	});

	await tx
		.delete(verification)
		.where(eq(verification.identifier, person.email));
	for (const { table, userIdColumn } of erasedOnRetirement) {
		await tx.delete(table).where(eq(userIdColumn, userId));
	}

	// Reports must keep pointing at the post they were about, so a reported post
	// stays as an empty, removed shell. Other posts go entirely.
	await tx
		.delete(communityPosts)
		.where(
			and(
				eq(communityPosts.authorUserId, userId),
				notExists(
					tx
						.select({ id: communityReports.id })
						.from(communityReports)
						.where(eq(communityReports.communityPostId, communityPosts.id)),
				),
			),
		);
	await tx
		.update(communityPosts)
		.set({ snapshot: {}, removedAt: new Date() })
		.where(eq(communityPosts.authorUserId, userId));

	await tx
		.update(user)
		.set({
			name: "Deleted member",
			email: `deleted-${userId}@deleted.invalid`,
			emailVerified: false,
			image: null,
			twoFactorEnabled: false,
			deletedAt: new Date(),
		})
		.where(eq(user.id, userId));
}
