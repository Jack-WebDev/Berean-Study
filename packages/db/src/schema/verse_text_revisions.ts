import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import type {
	VerseProofMark,
	VerseRevisionStatus,
} from "../scripture-catalogue";
import { user } from "./auth";
import { translations } from "./translations";
import { verses } from "./verses";

/**
 * Verse text on its way to readers, and the record of what they were shown.
 *
 * Readers only ever see `verse_texts`. Text is typed here as a draft, checked by
 * a different person, and copied to `verse_texts` when its chapter is published.
 * A correction to published text starts a new revision, so readers keep the
 * current wording until the new one has been through the same steps.
 */
export const verseTextRevisions = pgTable(
	"verse_text_revisions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		translationId: integer("translation_id")
			.notNull()
			.references(() => translations.id, { onDelete: "restrict" }),

		verseId: integer("verse_id")
			.notNull()
			.references(() => verses.id, { onDelete: "restrict" }),

		text: text().notNull(),

		status: text().$type<VerseRevisionStatus>().notNull().default("draft"),

		/** Whoever last changed the wording, so they can't be the one to check it. */
		enteredByUserId: text("entered_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "restrict" }),

		/** The published revision a correction replaces. */
		basedOnRevisionId: integer("based_on_revision_id").references(
			(): AnyPgColumn => verseTextRevisions.id,
			{ onDelete: "restrict" },
		),

		correctionReason: text("correction_reason"),

		checkedAgainst: text("checked_against"),

		submittedAt: timestamp("submitted_at", { withTimezone: true }),

		proofMark: text("proof_mark").$type<VerseProofMark>(),

		proofreadByUserId: text("proofread_by_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		proofreadAt: timestamp("proofread_at", { withTimezone: true }),

		/** Corrected wording the proofreader proposes. It never replaces the text by itself. */
		suggestedText: text("suggested_text"),

		proofNote: text("proof_note"),

		returnedByUserId: text("returned_by_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		publishedByUserId: text("published_by_user_id").references(() => user.id, {
			onDelete: "restrict",
		}),

		publishedAt: timestamp("published_at", { withTimezone: true }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("verse_text_revisions_one_open_idx")
			.on(table.translationId, table.verseId)
			.where(
				sql`${table.status} IN ('draft', 'submitted', 'needs_fix', 'proofread')`,
			),

		uniqueIndex("verse_text_revisions_one_published_idx")
			.on(table.translationId, table.verseId)
			.where(sql`${table.status} = 'published'`),

		index("verse_text_revisions_verse_idx").on(table.verseId),

		index("verse_text_revisions_status_idx").on(table.status),

		check(
			"verse_text_revisions_status_check",
			sql`${table.status} IN (
				'draft',
				'submitted',
				'needs_fix',
				'proofread',
				'published',
				'superseded'
			)`,
		),

		check(
			"verse_text_revisions_text_not_blank_check",
			sql`btrim(${table.text}) <> ''`,
		),

		check(
			"verse_text_revisions_proof_mark_check",
			sql`${table.proofMark} IS NULL OR ${table.proofMark} IN ('matches', 'needs_fix')`,
		),

		check(
			"verse_text_revisions_mark_has_proofreader_check",
			sql`(${table.proofMark} IS NULL) = (${table.proofreadByUserId} IS NULL)
				AND (${table.proofMark} IS NULL) = (${table.proofreadAt} IS NULL)`,
		),

		// The rule at the heart of proofreading, kept here so no code path can skip it.
		check(
			"verse_text_revisions_second_person_check",
			sql`${table.proofreadByUserId} IS NULL OR ${table.proofreadByUserId} <> ${table.enteredByUserId}`,
		),

		check(
			"verse_text_revisions_passed_was_checked_check",
			sql`${table.status} NOT IN ('proofread', 'published', 'superseded') OR ${table.proofMark} = 'matches'`,
		),

		check(
			"verse_text_revisions_published_state_check",
			sql`${table.status} NOT IN ('published', 'superseded')
				OR (${table.publishedByUserId} IS NOT NULL AND ${table.publishedAt} IS NOT NULL)`,
		),
	],
);
