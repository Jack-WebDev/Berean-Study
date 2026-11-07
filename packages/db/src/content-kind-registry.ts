import { eq } from "drizzle-orm";
import type { z } from "zod";

import type { PermissionKey } from "./access-catalogue";
import {
	type BookOverview,
	bookOverviewSchema,
	emptyBookOverview,
	overviewFields,
} from "./book-overview";
import type { DbExecutor } from "./db-executor";
import { claimKind, excerptKind, sourceKind } from "./evidence-kinds";
import { GovernanceError } from "./governance-error";
import { books } from "./schema/books";

/** Everything the review engine needs to know about one kind of content. */
export type ContentKindDefinition<TBody> = {
	label: string;
	body: z.ZodType<TBody>;
	empty: TBody;
	/** Original-language and textual content needs an extra specialist check. */
	requiresOriginalLanguageCheck: boolean;
	/** Each part of the content as text, in reading order, for comparing revisions. */
	fields(body: TBody): { label: string; text: string }[];
	/** Refuses a draft that isn't finished enough for someone else to review. */
	assertReadyForReview(
		body: TBody,
		context: { client: DbExecutor; scopeKey: string },
	): void | Promise<void>;
	/** A name for this content. Also refuses a scope that doesn't exist. */
	title(client: DbExecutor, scopeKey: string, body?: TBody): Promise<string>;
	/** When the name comes from the wording. Readers' copy keeps it until a new revision goes live. */
	titleFollowsBody?: boolean;
	/** Who can write this. Without this, it's whoever can write content. */
	writePermissions?: { create: PermissionKey; revise: PermissionKey };
	/** Refuses a draft that can't be saved at all right now. */
	assertCanDraft?(
		client: DbExecutor,
		scopeKey: string,
		body: TBody,
	): Promise<void>;
	/** Keeps anything derived from the wording in step, in the same transaction. */
	afterDraftSaved?(
		client: DbExecutor,
		input: { body: TBody; revisionId: number },
	): Promise<void>;
	/** Refuses publishing when something this rests on isn't ready. */
	assertReadyToPublish?(
		client: DbExecutor,
		input: { body: TBody; scopeKey: string },
	): Promise<void>;
	afterPublished?(
		client: DbExecutor,
		input: { revisionId: number; scopeKey: string },
	): Promise<void>;
	/** Refuses withdrawing content that something published still depends on. */
	assertCanWithdraw?(client: DbExecutor, scopeKey: string): Promise<void>;
	/**
	 * For content that only exists through its revisions. Removes what's behind it
	 * once its last draft is thrown away, or refuses if something depends on it.
	 */
	removeWhenEmpty?(client: DbExecutor, scopeKey: string): Promise<void>;
};

const defaultWritePermissions = {
	create: "content.write",
	revise: "content.revise",
} as const satisfies { create: PermissionKey; revise: PermissionKey };

/** Hides each kind's body type behind one checked parse, so kinds can share a registry. */
function contentKind<TBody>(definition: ContentKindDefinition<TBody>) {
	const parse = (raw: unknown) => definition.body.parse(raw);
	return {
		label: definition.label,
		requiresOriginalLanguageCheck: definition.requiresOriginalLanguageCheck,
		parse,
		empty: definition.empty,
		fields: (raw: unknown) => definition.fields(parse(raw)),
		assertReadyForReview: async (
			raw: unknown,
			context: { client: DbExecutor; scopeKey: string },
		) => definition.assertReadyForReview(parse(raw), context),
		title: (client: DbExecutor, scopeKey: string, raw?: unknown) =>
			definition.title(
				client,
				scopeKey,
				raw === undefined ? undefined : parse(raw),
			),
		titleFollowsBody: definition.titleFollowsBody ?? false,
		writePermissions: definition.writePermissions ?? defaultWritePermissions,
		assertCanDraft: async (
			client: DbExecutor,
			scopeKey: string,
			raw: unknown,
		) => definition.assertCanDraft?.(client, scopeKey, parse(raw)),
		afterDraftSaved: async (
			client: DbExecutor,
			input: { body: unknown; revisionId: number },
		) =>
			definition.afterDraftSaved?.(client, {
				body: parse(input.body),
				revisionId: input.revisionId,
			}),
		assertReadyToPublish: async (
			client: DbExecutor,
			input: { body: unknown; scopeKey: string },
		) =>
			definition.assertReadyToPublish?.(client, {
				body: parse(input.body),
				scopeKey: input.scopeKey,
			}),
		afterPublished: async (
			client: DbExecutor,
			input: { revisionId: number; scopeKey: string },
		) => definition.afterPublished?.(client, input),
		assertCanWithdraw: async (client: DbExecutor, scopeKey: string) =>
			definition.assertCanWithdraw?.(client, scopeKey),
		removeWhenEmpty: definition.removeWhenEmpty,
	};
}

const contentKinds = {
	source: contentKind(sourceKind),
	source_excerpt: contentKind(excerptKind),
	claim: contentKind(claimKind),
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

/** The shape of one kind's wording. */
export type ContentBody<TKind extends ContentKindName> = ReturnType<
	(typeof contentKinds)[TKind]["parse"]
>;

export function contentKindNamed(name: string) {
	if (name in contentKinds) return contentKinds[name as ContentKindName];
	throw new Error(`Unknown content kind: ${name}`);
}
