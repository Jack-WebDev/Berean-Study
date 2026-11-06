import { inArray, sql } from "drizzle-orm";

import type { DbExecutor } from "./db-executor";
import { bookAliases } from "./schema/book_aliases";
import { books } from "./schema/books";
import { canonBooks } from "./schema/canon_books";
import { canonTraditions } from "./schema/canon_traditions";
import { translations } from "./schema/translations";
import { versificationSystems } from "./schema/versification_systems";
import {
	bookCatalogue,
	canonCatalogue,
	translationCatalogue,
	versificationCatalogue,
} from "./scripture-catalogue";

/**
 * Adds any catalogue books, canons and translations that are missing. Safe to run
 * repeatedly, and it only ever adds: once a record exists it belongs to the
 * Superadmins, so their corrections to names, aliases and details are never
 * overwritten.
 *
 * Returns the ids in catalogue order.
 */
export async function applyScriptureCatalogue(client: DbExecutor) {
	return client.transaction(async (tx) => {
		await tx
			.insert(versificationSystems)
			.values(versificationCatalogue)
			.onConflictDoNothing();
		const [versification] = await tx
			.select({ id: versificationSystems.id })
			.from(versificationSystems)
			.where(
				sql`${versificationSystems.slug} = ${versificationCatalogue.slug}`,
			);
		if (!versification) throw new Error("Could not save the versification.");

		const addedBooks = await tx
			.insert(books)
			.values(
				bookCatalogue.map((definition) => ({
					name: definition.name,
					slug: definition.slug,
					testament: definition.testament,
					shortName: definition.shortName,
					fullTitle: definition.fullTitle,
					bookGroup: definition.group,
					expectedChapters: definition.expectedChapters,
					expectedVerses: definition.expectedVerses,
				})),
			)
			.onConflictDoNothing()
			.returning({ id: books.id, slug: books.slug });

		const aliasRows = addedBooks.flatMap(({ id, slug }) =>
			(
				bookCatalogue.find((definition) => definition.slug === slug)?.aliases ??
				[]
			).map((alias) => ({ bookId: id, alias })),
		);
		if (aliasRows.length > 0) {
			await tx.insert(bookAliases).values(aliasRows).onConflictDoNothing();
		}

		const allBooks = await tx
			.select({ id: books.id, slug: books.slug })
			.from(books)
			.where(
				inArray(
					books.slug,
					bookCatalogue.map(({ slug }) => slug),
				),
			);
		const bookIdBySlug = new Map(allBooks.map(({ id, slug }) => [slug, id]));

		const addedCanons = await tx
			.insert(canonTraditions)
			.values(canonCatalogue.map(({ name, slug }) => ({ name, slug })))
			.onConflictDoNothing()
			.returning({ id: canonTraditions.id, slug: canonTraditions.slug });
		for (const { id, slug } of addedCanons) {
			const definition = canonCatalogue.find((canon) => canon.slug === slug);
			const rows = (definition?.books ?? []).flatMap((bookSlug, index) => {
				const bookId = bookIdBySlug.get(bookSlug);
				return bookId
					? [{ canonId: id, bookId, canonicalOrder: index + 1 }]
					: [];
			});
			if (rows.length > 0) await tx.insert(canonBooks).values(rows);
		}

		await tx
			.insert(translations)
			.values(
				translationCatalogue.map((definition) => ({
					...definition,
					versificationSystemId: versification.id,
				})),
			)
			.onConflictDoNothing();

		const allCanons = await tx
			.select({ id: canonTraditions.id, slug: canonTraditions.slug })
			.from(canonTraditions)
			.where(
				inArray(
					canonTraditions.slug,
					canonCatalogue.map(({ slug }) => slug),
				),
			);
		const allTranslations = await tx
			.select({ id: translations.id, slug: translations.slug })
			.from(translations)
			.where(
				inArray(
					translations.slug,
					translationCatalogue.map(({ slug }) => slug),
				),
			);

		const inOrder = (
			catalogue: readonly { slug: string }[],
			rows: readonly { id: number; slug: string }[],
		) =>
			catalogue.flatMap(({ slug }) => {
				const row = rows.find((candidate) => candidate.slug === slug);
				return row ? [row.id] : [];
			});

		return {
			bookIds: inOrder(bookCatalogue, allBooks),
			canonIds: inOrder(canonCatalogue, allCanons),
			translationIds: inOrder(translationCatalogue, allTranslations),
			versificationId: versification.id,
		};
	});
}
