import { canonBooks } from "../schema/canon_books";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedCanonBooks(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(canonBooks).values(
		rows(count, (i) => ({
			canonId: numberId(context, "canonTraditions", i),
			bookId: numberId(context, "books", i),
			canonicalOrder: i + 1,
		})),
	);
	return;
}
