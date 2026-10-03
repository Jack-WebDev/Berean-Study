import { db } from "@berean-study/db";
import {
	getPassageOptions as getPassageOptionsFromDb,
	getPassageStudyContext as getPassageStudyContextFromDb,
} from "@berean-study/db/passages";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

export const getPassageOptions = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => {
		if (!context.session) throw new Error("Unauthorized");
		return getPassageOptionsFromDb(db);
	});

export const getPassageStudyContext = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ passageId: z.number().int().positive() }))
	.handler(({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");
		return getPassageStudyContextFromDb(db, data.passageId);
	});
