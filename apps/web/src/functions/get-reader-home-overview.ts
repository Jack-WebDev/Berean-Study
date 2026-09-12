import { getReaderHomeOverview as getReaderHomeOverviewFromDb } from "@berean-study/db/reader-home";
import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

export const getReaderHomeOverview = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		if (!context.session) {
			return null;
		}

		return getReaderHomeOverviewFromDb(context.session.user.id);
	});
