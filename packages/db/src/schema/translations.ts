import { relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { verseTexts } from "./verse_texts";
import { versificationSystems } from "./versification_systems";

export const translations = pgTable(
	"translations",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),

		versificationSystemId: integer("versification_system_id")
			.notNull()
			.references(() => versificationSystems.id, {
				onDelete: "restrict",
			}),

		name: text().notNull(),

		abbreviation: text().notNull(),

		slug: text().notNull(),

		edition: text(),

		rightsHolder: text("rights_holder"),

		/** Exact wording shown to readers, as the rights holder requires it. */
		copyrightNotice: text("copyright_notice"),

		/** Publishing a licensed translation needs the rights holder's permission. */
		licensed: boolean().notNull().default(false),

		permissionRecordedAt: timestamp("permission_recorded_at", {
			withTimezone: true,
		}),

		permissionRecordedByUserId: text(
			"permission_recorded_by_user_id",
		).references(() => user.id, { onDelete: "restrict" }),

		licenceEndsOn: date("licence_ends_on", { mode: "string" }),

		quotationLimits: text("quotation_limits"),
	},
	(table) => [
		unique("translations_name_unique").on(table.name),

		unique("translations_abbreviation_unique").on(table.abbreviation),

		unique("translations_slug_unique").on(table.slug),

		index("translations_versification_system_id_idx").on(
			table.versificationSystemId,
		),

		check("translations_name_not_empty_check", sql`btrim(${table.name}) <> ''`),

		check(
			"translations_abbreviation_not_empty_check",
			sql`btrim(${table.abbreviation}) <> ''`,
		),

		check("translations_slug_not_empty_check", sql`btrim(${table.slug}) <> ''`),

		check(
			"translations_permission_state_check",
			sql`(${table.permissionRecordedAt} IS NULL) = (${table.permissionRecordedByUserId} IS NULL)`,
		),
	],
);

export const translationsRelations = relations(translations, ({ many }) => ({
	verseTexts: many(verseTexts),
}));
