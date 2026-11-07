import { eq } from "drizzle-orm";

import {
	assertCitedEvidenceLive,
	assertCitedExcerptsExist,
	assertCitedSourcesUsable,
	pinRevisionCitations,
	syncRevisionCitations,
} from "./cited-evidence";
import {
	type CommentaryBody,
	type CommentaryKind,
	collectCitations,
	collectScriptureReferences,
	commentaryBodySchema,
	commentaryFields,
	commentaryKindLabels,
	commentaryProblems,
	containsOriginalTerm,
	emptyCommentaryBody,
	parseCommentaryScopeKey,
} from "./commentary-body";
import type { ContentKindDefinition } from "./content-kind-registry";
import {
	assertLinkedContentExists,
	assertLinkedContentLive,
	linkedContentIn,
} from "./content-links";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { formatPassageReference } from "./passages";
import { books } from "./schema/books";
import { resolveScriptureReference } from "./scripture-reference";

function scopeFrom(kind: CommentaryKind, scopeKey: string) {
	const scope = parseCommentaryScopeKey(kind, scopeKey);
	if (!scope)
		throw new GovernanceError("This commentary's verses can't be read.");
	return scope;
}

/** What a commentary covers, in words. Also refuses a book that doesn't exist. */
export async function commentaryScopeLabel(
	client: DbExecutor,
	kind: CommentaryKind,
	scopeKey: string,
) {
	const scope = scopeFrom(kind, scopeKey);
	const [book] = await client
		.select({ name: books.name })
		.from(books)
		.where(eq(books.slug, scope.bookSlug));
	if (!book) throw new GovernanceError("This book no longer exists.");
	return {
		bookName: book.name,
		label:
			scope.kind === "book_introduction"
				? `Introduction to ${book.name}`
				: formatPassageReference(
						book.name,
						[scope.from.chapter, scope.from.verse],
						[scope.to.chapter, scope.to.verse],
					),
	};
}

const linksOf = (body: CommentaryBody) =>
	linkedContentIn(body.sections.map((section) => section.body));

function commentaryKind(kind: CommentaryKind) {
	return {
		label: commentaryKindLabels[kind],
		body: commentaryBodySchema,
		empty: emptyCommentaryBody,
		requiresOriginalLanguageCheck: containsOriginalTerm,
		fields: commentaryFields,
		titleFollowsBody: true,
		async title(client, scopeKey, body) {
			const { label } = await commentaryScopeLabel(client, kind, scopeKey);
			return body?.title || label;
		},
		assertCanDraft: (client, _scopeKey, body) =>
			assertCitedExcerptsExist(client, collectCitations(body)),
		afterDraftSaved: (client, { body, revisionId }) =>
			syncRevisionCitations(client, revisionId, collectCitations(body)),
		async assertReadyForReview(body, { client, scopeKey }) {
			const [problem] = commentaryProblems(scopeFrom(kind, scopeKey), body);
			if (problem) {
				throw new GovernanceError(`Before review: ${problem.toLowerCase()}.`);
			}
			for (const { label } of collectScriptureReferences(body)) {
				await resolveScriptureReference(client, label);
			}
			await assertCitedSourcesUsable(client, collectCitations(body));
			await assertLinkedContentExists(client, linksOf(body));
		},
		async assertReadyToPublish(client, { body }) {
			await assertCitedEvidenceLive(
				client,
				collectCitations(body),
				"A commentary",
			);
			await assertLinkedContentLive(client, linksOf(body), "A commentary");
		},
		afterPublished: (client, { revisionId }) =>
			pinRevisionCitations(client, revisionId),
	} satisfies ContentKindDefinition<CommentaryBody>;
}

export const bookIntroductionKind = commentaryKind("book_introduction");
export const passageCommentaryKind = commentaryKind("passage_commentary");
export const verseCommentaryKind = commentaryKind("verse_commentary");
