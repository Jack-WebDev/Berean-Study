import { createDb } from "@berean-study/db";
import { listRecentLibraryActivity } from "@berean-study/db/recent-library-activity";
import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

export const getRecentLibraryActivity = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return listRecentLibraryActivity(createDb(), context.session.user.id);
	});
