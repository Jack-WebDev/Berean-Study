import { sql } from "drizzle-orm";
import {
	check,
	integer,
	pgTable,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Manuscript witnesses used in textual-critical evidence.
 *
 * Examples:
 * 𝔓66
 * 𝔓75
 * א
 * A
 * B
 */
export const manuscripts = pgTable(
	"manuscripts",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

		/**
		 * Standard manuscript siglum used in textual-critical discussion.
		 */
		siglum: text("siglum").notNull(),

		/**
		 * Human-readable manuscript name where one is commonly useful.
		 *
		 * Examples:
		 * Codex Sinaiticus
		 * Codex Vaticanus
		 *
		 * Nullable because the siglum is sufficient identification
		 * for some witnesses.
		 */
		name: text("name"),
	},
	(table) => [
		uniqueIndex("manuscripts_siglum_unique").on(table.siglum),

		check("manuscripts_siglum_not_blank", sql`btrim(${table.siglum}) <> ''`),

		check(
			"manuscripts_name_not_blank",
			sql`${table.name} IS NULL OR btrim(${table.name}) <> ''`,
		),
	],
);
