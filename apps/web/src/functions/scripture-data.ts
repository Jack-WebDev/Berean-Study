import { db } from "@berean-study/db";
import { scriptureDataReaders } from "@berean-study/db/access-catalogue";
import { bookGroups } from "@berean-study/db/scripture-catalogue";
import {
	getBookStructure as getBookStructureFromDb,
	getScriptureBook as getScriptureBookFromDb,
	listScriptureBooks as listScriptureBooksFromDb,
	suggestBookChange as suggestBookChangeInDb,
	updateBookRecord as updateBookRecordInDb,
} from "@berean-study/db/scripture-data";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requirePermission } from "@/middleware/auth";

const canReadScriptureData = () => requirePermission(...scriptureDataReaders);

const slugSchema = z.string().trim().min(1).max(100);

export const listScriptureBooks = createServerFn({ method: "GET" })
	.middleware([canReadScriptureData()])
	.handler(() => listScriptureBooksFromDb(db));

export const getScriptureBook = createServerFn({ method: "GET" })
	.middleware([canReadScriptureData()])
	.validator(z.object({ slug: slugSchema }))
	.handler(({ data }) => getScriptureBookFromDb(db, data.slug));

export const getBookStructure = createServerFn({ method: "GET" })
	.middleware([canReadScriptureData()])
	.validator(
		z.object({
			slug: slugSchema,
			chapter: z.number().int().positive().optional(),
			verse: z.number().int().positive().optional(),
		}),
	)
	.handler(({ data }) => getBookStructureFromDb(db, data));

export const updateBookRecord = createServerFn({ method: "POST" })
	.middleware([requirePermission("scripture.manage")])
	.validator(
		z.object({
			slug: slugSchema,
			name: z.string().trim().min(1).max(100),
			fullTitle: z.string().trim().min(1).max(200),
			testament: z.enum(["old", "new"]),
			group: z.enum(bookGroups),
			aliases: z.array(z.string().trim().min(1).max(50)).max(30),
		}),
	)
	.handler(({ context, data }) =>
		updateBookRecordInDb(db, { ...data, actorUserId: context.userId }),
	);

export const suggestBookChange = createServerFn({ method: "POST" })
	.middleware([canReadScriptureData()])
	.validator(
		z.object({
			slug: slugSchema,
			suggestion: z.string().trim().min(1).max(1000),
		}),
	)
	.handler(({ context, data }) =>
		suggestBookChangeInDb(db, { ...data, actorUserId: context.userId }),
	);
