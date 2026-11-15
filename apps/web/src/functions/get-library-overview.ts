import { db } from "@berean-study/db";
import { getLibraryDestinationCounts as getLibraryDestinationCountsFromDb } from "@berean-study/db/library-destination-counts";
import {
	getLibraryReadingState,
	listRecentPassages,
} from "@berean-study/db/reader-home";
import { listRecentLibraryActivity } from "@berean-study/db/recent-library-activity";
import { createServerFn } from "@tanstack/react-start";

import { authMiddleware, requireUserId } from "@/middleware/auth";

export const getContinueReading = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		const userId = requireUserId(context.session);
		return getLibraryReadingState(db, userId);
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
		return listRecentPassages(db, userId);
	});
