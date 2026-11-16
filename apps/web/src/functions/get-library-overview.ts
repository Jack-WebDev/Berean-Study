import { db } from "@berean-study/db";
import { getLibraryDestinationCounts as getLibraryDestinationCountsFromDb } from "@berean-study/db/library-destination-counts";
import { listRecentChapters } from "@berean-study/db/reader";
import { getLibraryReadingState as getLibraryReadingStateFromDb } from "@berean-study/db/reader-home";
import { listRecentLibraryActivity } from "@berean-study/db/recent-library-activity";
import { createServerFn } from "@tanstack/react-start";

import { authMiddleware, requireUserId } from "@/middleware/auth";

/** The member's place in the Bible and when they were last there, for the Library. */
export const getLibraryReadingState = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		const userId = requireUserId(context.session);
		return getLibraryReadingStateFromDb(db, userId);
	});

export const getLibraryDestinationCounts = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		const userId = requireUserId(context.session);
		return getLibraryDestinationCountsFromDb(db, userId);
	});

export const getRecentLibraryActivity = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		const userId = requireUserId(context.session);
		return listRecentLibraryActivity(db, userId);
	});

export const getRecentlyStudied = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		const userId = requireUserId(context.session);
		return listRecentChapters(db, userId, 5);
	});
