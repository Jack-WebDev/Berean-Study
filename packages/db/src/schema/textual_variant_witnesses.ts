import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { manuscripts } from "./manuscripts";
import { textualVariants } from "./textual_variants";

/**
 * Records manuscript support for a particular textual reading.
 *
 * This is the textual apparatus relationship:
 *
 * variant A ← 𝔓66
 * variant A ← B
 * variant B ← A
 */
export const textualVariantWitnesses = pgTable(
	"textual_variant_witnesses",
	{
		textualVariantId: integer("textual_variant_id")
			.notNull()
			.references(() => textualVariants.id, {
				onDelete: "cascade",
			}),

		manuscriptId: integer("manuscript_id")
			.notNull()
			.references(() => manuscripts.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.textualVariantId, table.manuscriptId],
		}),

		index("textual_variant_witnesses_manuscript_id_idx").on(table.manuscriptId),
	],
);
