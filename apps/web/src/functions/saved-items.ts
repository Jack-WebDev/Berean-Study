import { createDb } from "@berean-study/db";
import { listSavedItems as listSavedItemsFromDb } from "@berean-study/db/saved-items";
import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

export const getSavedItems = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return listSavedItemsFromDb(createDb(), context.session.user.id);
	});
