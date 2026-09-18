import { createDb } from "@berean-study/db";
import { getLibraryDestinationCounts as getLibraryDestinationCountsFromDb } from "@berean-study/db/library-destination-counts";
import {
	getLibraryReadingState,
	listRecentPassages,
} from "@berean-study/db/reader-home";
import { listRecentLibraryActivity } from "@berean-study/db/recent-library-activity";
import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "@/middleware/auth";

export const getContinueReading = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return getLibraryReadingState(createDb(), context.session.user.id);
	});

export const getLibraryDestinationCounts = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return getLibraryDestinationCountsFromDb(
			createDb(),
			context.session.user.id,
		);
	});

export const getRecentLibraryActivity = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return listRecentLibraryActivity(createDb(), context.session.user.id);
	});

export const getRecentlyStudied = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");

		return listRecentPassages(createDb(), context.session.user.id);
	});
