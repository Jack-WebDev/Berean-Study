import { integer, pgTable, primaryKey } from "drizzle-orm/pg-core";

import { claims } from "./claims";
import { contentRevisions } from "./content_revisions";

export const claimUsages = pgTable(
	"claim_usages",
	{
		claimId: integer()
			.notNull()
			.references(() => claims.id, {
				onDelete: "restrict",
			}),

		contentRevisionId: integer()
			.notNull()
			.references(() => contentRevisions.id, {
				onDelete: "restrict",
			}),
	},
	(table) => [
		primaryKey({
			columns: [table.claimId, table.contentRevisionId],
		}),
	],
);
