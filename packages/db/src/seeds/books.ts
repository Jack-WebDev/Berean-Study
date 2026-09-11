import { books } from "../schema/books";
import { db, faker, rows, type SeedContext, save } from "./utils";
export async function seedBooks(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(books)
		.values(
			rows(count, (index) => ({
				name: `Seed Book ${index + 1}`,
				slug: `seed-book-${index + 1}-${faker.string.alphanumeric(6).toLowerCase()}`,
				testament: index % 2 === 0 ? ("old" as const) : ("new" as const),
			})),
		)
		.returning({ id: books.id });
	save(
		context,
		"books",
		inserted.map(({ id }) => id),
	);
	return;
}
