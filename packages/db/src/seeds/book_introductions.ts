import { bookIntroductions } from "../schema/book_introductions";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedBookIntroductions(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db
		.insert(bookIntroductions)
		.values(rows(count, (i) => ({ bookId: numberId(context, "books", i) })));
	return;
}
