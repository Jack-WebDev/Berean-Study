import { bookmarks } from "../schema/bookmarks";
import { db, numberId, rows, type SeedContext, textId } from "./utils";
export async function seedBookmarks(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(bookmarks).values(
		rows(count, (i) => ({
			userId: textId(context, "users", i),
			passageId: numberId(context, "passages", i),
		})),
	);
	return;
}
