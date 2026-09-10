import { index, integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { claims } from "./claims";
import { contentRevisions } from "./content_revisions";

export const claimUsages = pgTable(
	"claim_usages",
	{
		claimId: integer("claim_id")
			.notNull()
			.references(() => claims.id, {
				onDelete: "restrict",
			}),

		contentRevisionId: integer("content_revision_id")
			.notNull()
			.references(() => contentRevisions.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.claimId, table.contentRevisionId],
		}),

		index("claim_usages_content_revision_id_idx").on(table.contentRevisionId),
	],
);
