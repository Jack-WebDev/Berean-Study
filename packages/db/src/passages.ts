import { asc, desc, eq, inArray } from "drizzle-orm";

import type { createDb } from "./index";
import { books } from "./schema/books";
import { canonicalRelationships } from "./schema/canonical_relationships";
import { crossReferences } from "./schema/cross_references";
import { passages } from "./schema/passages";
import { themePassages } from "./schema/theme_passages";
import { themes } from "./schema/themes";

type DbClient = ReturnType<typeof createDb>;

export type PassageOption = {
	id: number;
	label: string;
};

export type PassageStudyContext = {
	passage: PassageOption;
	relatedPassages: PassageOption[];
	themes: string[];
};

export async function getPassageOptions(
	db: DbClient,
): Promise<PassageOption[]> {
	const rows = await db
		.select({
			bookName: books.name,
			id: passages.id,
			title: passages.title,
		})
		.from(passages)
		.innerJoin(books, eq(books.id, passages.bookId))
		.orderBy(asc(books.id), asc(passages.id));

	return rows.map((passage) => ({
		id: passage.id,
		label: passage.title ?? passage.bookName,
	}));
}

/**
 * Returns the published study material associated with a conceptual passage.
 * Personal note data deliberately does not participate in this query.
 */
export async function getPassageStudyContext(
	db: DbClient,
	passageId: number,
): Promise<PassageStudyContext | null> {
	const [
		passageRows,
		passageThemes,
		outgoingCrossReferences,
		incomingCrossReferences,
		outgoingCanonicalRelationships,
		incomingCanonicalRelationships,
	] = await Promise.all([
		db
			.select({ bookName: books.name, id: passages.id, title: passages.title })
			.from(passages)
			.innerJoin(books, eq(books.id, passages.bookId))
			.where(eq(passages.id, passageId))
			.limit(1),
		db
			.select({ name: themes.name })
			.from(themePassages)
			.innerJoin(themes, eq(themes.id, themePassages.themeId))
			.where(eq(themePassages.passageId, passageId))
			.orderBy(asc(themes.name)),
		db
			.select({ id: crossReferences.relatedPassageId })
			.from(crossReferences)
			.where(eq(crossReferences.passageId, passageId)),
		db
			.select({ id: crossReferences.passageId })
			.from(crossReferences)
			.where(eq(crossReferences.relatedPassageId, passageId)),
		db
			.select({ id: canonicalRelationships.targetPassageId })
			.from(canonicalRelationships)
			.where(eq(canonicalRelationships.sourcePassageId, passageId)),
		db
			.select({ id: canonicalRelationships.sourcePassageId })
			.from(canonicalRelationships)
			.where(eq(canonicalRelationships.targetPassageId, passageId)),
	]);

	const [passage] = passageRows;
	if (!passage) return null;

	const relatedPassageIds = new Set(
		[
			...outgoingCrossReferences,
			...incomingCrossReferences,
			...outgoingCanonicalRelationships,
			...incomingCanonicalRelationships,
		].map((relatedPassage) => relatedPassage.id),
	);
	const relatedPassages = relatedPassageIds.size
		? await db
				.select({
					bookName: books.name,
					id: passages.id,
					title: passages.title,
				})
				.from(passages)
				.innerJoin(books, eq(books.id, passages.bookId))
				.where(inArray(passages.id, [...relatedPassageIds]))
				.orderBy(desc(passages.id))
				.limit(6)
		: [];

	return {
		passage: toPassageOption(passage),
		relatedPassages: relatedPassages.map(toPassageOption),
		themes: passageThemes.map((theme) => theme.name),
	};
}

function toPassageOption(passage: {
	bookName: string;
	id: number;
	title: string | null;
}): PassageOption {
	return {
		id: passage.id,
		label: passage.title ?? passage.bookName,
	};
}
