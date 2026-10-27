import {
	getDocumentVerseBlocks,
	getPlainText,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { count, eq, inArray } from "drizzle-orm";

import type { db } from "./index";
import { passages } from "./schema/passages";
import { prayerReflections } from "./schema/prayer_reflections";
import { prayers } from "./schema/prayers";
import { testimonies } from "./schema/testimonies";
import { userPreferences } from "./schema/user_preferences";

type DbClient = typeof db;
type Transaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export type PrayerJournalCounts = {
	prayers: number;
	reflections: number;
	testimonies: number;
};

/** How many entries each Prayer Journal tab has, for the tab badges. */
export async function getPrayerJournalCounts(
	db: DbClient,
	userId: string,
): Promise<PrayerJournalCounts> {
	const [[prayerRow], [testimonyRow], [reflectionRow]] = await Promise.all([
		db
			.select({ total: count() })
			.from(prayers)
			.where(eq(prayers.userId, userId)),
		db
			.select({ total: count() })
			.from(testimonies)
			.where(eq(testimonies.userId, userId)),
		db
			.select({ total: count() })
			.from(prayerReflections)
			.where(eq(prayerReflections.userId, userId)),
	]);
	return {
		prayers: Number(prayerRow?.total ?? 0),
		reflections: Number(reflectionRow?.total ?? 0),
		testimonies: Number(testimonyRow?.total ?? 0),
	};
}

export async function getReflectionReminder(db: DbClient, userId: string) {
	const [row] = await db
		.select({ enabled: userPreferences.reflectionRemindersEnabled })
		.from(userPreferences)
		.where(eq(userPreferences.userId, userId))
		.limit(1);
	return row?.enabled ?? false;
}

/**
 * Saves whether the member wants a monthly reminder to reflect.
 * TODO: nothing sends the reminder yet; only the choice is stored.
 */
export async function setReflectionReminder(
	db: DbClient,
	userId: string,
	enabled: boolean,
) {
	await db
		.insert(userPreferences)
		.values({ reflectionRemindersEnabled: enabled, userId })
		.onConflictDoUpdate({
			set: { reflectionRemindersEnabled: enabled },
			target: userPreferences.userId,
		});
	return enabled;
}

/** The text saved alongside a body so entries can be searched and previewed. */
export function toSearchText(content: RichTextDocument) {
	return getPlainText(content);
}

/**
 * The passages quoted by the body's verse blocks, in order, keeping only ones
 * that exist. A verse block pasted from elsewhere may point at a passage this
 * database doesn't have; saving the entry shouldn't fail because of it.
 */
export async function getQuotedPassageIds(
	tx: DbClient | Transaction,
	content: RichTextDocument,
): Promise<number[]> {
	const quoted = [
		...new Set(
			getDocumentVerseBlocks(content).map(
				({ attributes }) => attributes.passageId,
			),
		),
	];
	if (quoted.length === 0) return [];
	const rows = await tx
		.select({ id: passages.id })
		.from(passages)
		.where(inArray(passages.id, quoted));
	const existing = new Set(rows.map((row) => row.id));
	return quoted.filter((id) => existing.has(id));
}
