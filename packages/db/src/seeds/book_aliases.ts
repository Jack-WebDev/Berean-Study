import { bookAliases } from "../schema/book_aliases";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedBookAliases(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(bookAliases).values(
		rows(count, (i) => ({
			bookId: numberId(context, "books", i),
			alias: `Seed Alias ${i + 1}`,
		})),
	);
	return;
}
