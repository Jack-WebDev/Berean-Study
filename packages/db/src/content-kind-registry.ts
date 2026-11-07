import { eq } from "drizzle-orm";
import type { z } from "zod";

import {
	type BookOverview,
	bookOverviewSchema,
	emptyBookOverview,
	overviewFields,
} from "./book-overview";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { books } from "./schema/books";

/** Everything the review engine needs to know about one kind of content. */
type ContentKindDefinition<TBody> = {
	label: string;
	body: z.ZodType<TBody>;
	empty: TBody;
	/** Original-language and textual content needs an extra specialist check. */
	requiresOriginalLanguageCheck: boolean;
	/** Each part of the content as text, in reading order, for comparing revisions. */
	fields(body: TBody): { label: string; text: string }[];
	/** Refuses a draft that isn't finished enough for someone else to review. */
	assertReadyForReview(body: TBody): void;
	/** A name for this content. Also refuses a scope that doesn't exist. */
	title(client: DbExecutor, scopeKey: string): Promise<string>;
};

/** Hides each kind's body type behind one checked parse, so kinds can share a registry. */
function contentKind<TBody>(definition: ContentKindDefinition<TBody>) {
	const parse = (raw: unknown) => definition.body.parse(raw);
	return {
		label: definition.label,
		requiresOriginalLanguageCheck: definition.requiresOriginalLanguageCheck,
		parse,
		empty: definition.empty,
		fields: (raw: unknown) => definition.fields(parse(raw)),
		assertReadyForReview: (raw: unknown) =>
			definition.assertReadyForReview(parse(raw)),
		title: definition.title,
	};
}

const contentKinds = {
	book_overview: contentKind<BookOverview>({
		label: "Book overview",
		body: bookOverviewSchema,
		empty: emptyBookOverview,
		requiresOriginalLanguageCheck: false,
		fields: overviewFields,
		assertReadyForReview({ summary }) {
			if (!summary) {
				throw new GovernanceError(
					"Add a one-line summary before sending this for review.",
				);
			}
		},
		async title(client, scopeKey) {
			const [book] = await client
				.select({ name: books.name })
				.from(books)
				.where(eq(books.slug, scopeKey));
			if (!book) throw new GovernanceError("This book no longer exists.");
			return `${book.name} overview`;
		},
	}),
};

export type ContentKindName = keyof typeof contentKinds;

export function contentKindNamed(name: string) {
	if (name in contentKinds) return contentKinds[name as ContentKindName];
	throw new Error(`Unknown content kind: ${name}`);
}
