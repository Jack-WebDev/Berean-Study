import { pgTable, text } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const contributors = pgTable("contributors", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
});
