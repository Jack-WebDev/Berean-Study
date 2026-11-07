import { randomUUID } from "node:crypto";

import {
	getDocumentCommentaryNodes,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { and, eq, ne, sql } from "drizzle-orm";
import type { z } from "zod";

import {
	assertCitedEvidenceLive,
	assertCitedExcerptsExist,
	assertCitedSourcesUsable,
	assertSourceUsable,
	getRecordItem,
	pinRevisionCitations,
	syncRevisionCitations,
} from "./cited-evidence";
import type { ChecklistItem } from "./commentary-body";
import {
	type CanonicalRelationshipBody,
	type CrossReferenceBody,
	canonicalRelationshipBodySchema,
	canonicalRelationshipChecklist,
	canonicalRelationshipFields,
	connectionScopeKey,
	crossReferenceBodySchema,
	crossReferenceChecklist,
	crossReferenceFields,
	emptyCanonicalRelationshipBody,
	emptyCrossReferenceBody,
	parseConnectionScopeKey,
} from "./connection-body";
import type { ContentKindDefinition } from "./content-kind-registry";
import {
	assertLinkedContentExists,
	assertLinkedContentLive,
	assertNotShownInPublishedContent,
	type LinkedContent,
	linkedContentIn,
	type RevisionPassage,
	syncRevisionPassages,
	syncRevisionSources,
} from "./content-links";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import {
	emptyQuestionBody,
	emptyThemeBody,
	type QuestionBody,
	questionBodySchema,
	questionChecklist,
	questionDocuments,
	questionFields,
	questionStanceChange,
	type ThemeBody,
	themeBodySchema,
	themeChecklist,
	themeDocuments,
	themeFields,
	themeRename,
} from "./interpretation-body";
import {
	emptyOriginalLanguageNoteBody,
	emptyTextualNoteBody,
	emptyTextualVariantBody,
	type OriginalLanguageNoteBody,
	originalLanguageNoteBodySchema,
	originalLanguageNoteChecklist,
	originalLanguageNoteFields,
	type TextualNoteBody,
	type TextualVariantBody,
	textualNoteBodySchema,
	textualNoteChecklist,
	textualNoteFields,
	textualVariantBodySchema,
	textualVariantChecklist,
	textualVariantFields,
} from "./language-body";
import { contentItems } from "./schema/content_items";
import { themes } from "./schema/themes";
import {
	readPassageKey,
	resolveScriptureReference,
} from "./scripture-reference";

/*
 * Connections, questions, themes and language notes in the review engine. They
 * differ in what they say, but all rest on evidence and verses in the same way.
 */

const originalLanguageWriters = {
	create: "content.original_language",
	revise: "content.original_language",
} as const;

/** Records with nothing else to identify them are named by a key made when first saved. */
export function newRecordKey() {
	return randomUUID();
}

const recordKeyPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function assertRecordKey(scopeKey: string) {
	if (!recordKeyPattern.test(scopeKey)) {
		throw new GovernanceError("This record no longer exists.");
	}
}

function shorten(text: string, length = 80) {
	return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

type StudyKindSpec<TBody> = {
	label: string;
	body: z.ZodType<TBody>;
	empty: TBody;
	checklist(body: TBody): ChecklistItem[];
	fields(body: TBody): { label: string; text: string }[];
	title(client: DbExecutor, scopeKey: string, body?: TBody): Promise<string>;
	titleFollowsBody?: boolean;
	/** Writing in this record, in the order readers meet it. */
	documents(body: TBody): RichTextDocument[];
	/** The verses this record is about. */
	passages(body: TBody, scopeKey: string): RevisionPassage[];
	/** Sources it names directly, apart from what it cites. */
	sourceIds?(body: TBody): number[];
	/** Other reviewed content it relies on, apart from what's placed in its writing. */
	links?(body: TBody): LinkedContent[];
	originalLanguage: boolean | "when_words_appear";
	writePermissions?: ContentKindDefinition<TBody>["writePermissions"];
	assertCanDraft?(
		client: DbExecutor,
		scopeKey: string,
		body: TBody,
	): Promise<void>;
	assertReady?(client: DbExecutor, body: TBody): Promise<void>;
	publicationConfirmation?(before: TBody, after: TBody): string | null;
	/** Published writing can place this kind, so it can't be taken down from under it. */
	canBeShownElsewhere?: boolean;
	removeWhenEmpty?(client: DbExecutor, scopeKey: string): Promise<void>;
};

function studyKind<TBody>(
	spec: StudyKindSpec<TBody>,
): ContentKindDefinition<TBody> {
	const citationsOf = (body: TBody) =>
		spec
			.documents(body)
			.flatMap((document) => getDocumentCommentaryNodes(document).citations);
	const linksOf = (body: TBody) => [
		...(spec.links?.(body) ?? []),
		...linkedContentIn(spec.documents(body)),
	];

	return {
		label: spec.label,
		body: spec.body,
		empty: spec.empty,
		fields: spec.fields,
		title: spec.title,
		titleFollowsBody: spec.titleFollowsBody ?? false,
		writePermissions: spec.writePermissions,
		publicationConfirmation: spec.publicationConfirmation,
		requiresOriginalLanguageCheck:
			spec.originalLanguage === "when_words_appear"
				? (body) =>
						spec
							.documents(body)
							.some(
								(document) =>
									getDocumentCommentaryNodes(document).originalTerms.length > 0,
							)
				: spec.originalLanguage,
		async assertCanDraft(client, scopeKey, body) {
			await spec.assertCanDraft?.(client, scopeKey, body);
			await assertCitedExcerptsExist(client, citationsOf(body));
		},
		async afterDraftSaved(client, { body, revisionId, scopeKey }) {
			await syncRevisionCitations(client, revisionId, citationsOf(body));
			await syncRevisionPassages(
				client,
				revisionId,
				spec.passages(body, scopeKey),
			);
			await syncRevisionSources(
				client,
				revisionId,
				spec.sourceIds?.(body) ?? [],
			);
		},
		async assertReadyForReview(body, { client, scopeKey }) {
			const problem = spec
				.checklist(body)
				.find(({ blocking, ok }) => blocking && !ok);
			if (problem) throw new GovernanceError(`Before review: ${problem.text}.`);

			for (const { reference } of spec.passages(body, scopeKey)) {
				if ("text" in reference) {
					await resolveScriptureReference(client, reference.text);
				}
			}
			for (const document of spec.documents(body)) {
				const { scriptureReferences } = getDocumentCommentaryNodes(document);
				for (const { label } of scriptureReferences) {
					await resolveScriptureReference(client, label);
				}
			}
			await assertCitedSourcesUsable(client, citationsOf(body));
			for (const sourceId of spec.sourceIds?.(body) ?? []) {
				await assertSourceUsable(client, sourceId);
			}
			await assertLinkedContentExists(client, linksOf(body));
			await spec.assertReady?.(client, body);
		},
		async assertReadyToPublish(client, { body }) {
			const what = `A ${spec.label.toLowerCase()}`;
			await assertCitedEvidenceLive(client, citationsOf(body), what);
			await assertLinkedContentLive(client, linksOf(body), what);
			for (const sourceId of spec.sourceIds?.(body) ?? []) {
				await assertSourceUsable(client, sourceId);
				const source = await getRecordItem(client, "source", sourceId);
				if (!source?.liveRevisionId) {
					throw new GovernanceError(
						`Publish "${source?.title ?? "the source"}" first. ${what} can't go live before what it rests on.`,
					);
				}
			}
		},
		afterPublished: (client, { revisionId }) =>
			pinRevisionCitations(client, revisionId),
		assertCanWithdraw: spec.canBeShownElsewhere
			? (client, scopeKey) => assertNotShownInPublishedContent(client, scopeKey)
			: undefined,
		// With no revisions left there's nothing to find it by, so it goes too.
		removeWhenEmpty: spec.removeWhenEmpty ?? (async () => undefined),
	};
}

/** Both passages of a connection, in words. Refuses a key that can't be one. */
export async function readConnectionScope(
	client: DbExecutor,
	kind: "canonical_relationship" | "cross_reference",
	scopeKey: string,
) {
	const keys = parseConnectionScopeKey(kind, scopeKey);
	if (!keys) throw new GovernanceError("This connection can't be read.");
	if (keys.first === keys.second) {
		throw new GovernanceError("A passage can't connect to itself.");
	}
	const first = await readPassageKey(client, keys.first);
	const second = await readPassageKey(client, keys.second);
	if (
		kind === "canonical_relationship" &&
		(first.testament !== "new" || second.testament !== "old")
	) {
		throw new GovernanceError(
			"A canonical relationship runs from a New Testament passage to an Old Testament one.",
		);
	}
	return { first, second };
}

export const crossReferenceKind = studyKind<CrossReferenceBody>({
	label: "Cross-reference",
	body: crossReferenceBodySchema,
	empty: emptyCrossReferenceBody,
	checklist: crossReferenceChecklist,
	fields: crossReferenceFields,
	documents: () => [],
	originalLanguage: false,
	canBeShownElsewhere: true,
	passages(body, scopeKey) {
		const keys = parseConnectionScopeKey("cross_reference", scopeKey);
		if (!keys) return [];
		return [
			{ reference: { key: keys.first } },
			{ reference: { key: keys.second }, showsToReaders: body.twoWay },
		];
	},
	async title(client, scopeKey) {
		const { first, second } = await readConnectionScope(
			client,
			"cross_reference",
			scopeKey,
		);
		return `${first.label} → ${second.label}`;
	},
	async assertCanDraft(client, scopeKey) {
		const { first, second } = await readConnectionScope(
			client,
			"cross_reference",
			scopeKey,
		);
		const reverse = connectionScopeKey(
			"cross_reference",
			second.key,
			first.key,
		);
		const [existing] = await client
			.select({ id: contentItems.id })
			.from(contentItems)
			.where(
				and(
					eq(contentItems.kind, "cross_reference"),
					eq(contentItems.scopeKey, reverse),
				),
			);
		if (existing) {
			throw new GovernanceError(
				`${second.label} already links to ${first.label}. Open that one, and show it both ways if it should be.`,
			);
		}
	},
});

export const canonicalRelationshipKind = studyKind<CanonicalRelationshipBody>({
	label: "Canonical relationship",
	body: canonicalRelationshipBodySchema,
	empty: emptyCanonicalRelationshipBody,
	checklist: canonicalRelationshipChecklist,
	fields: canonicalRelationshipFields,
	documents: () => [],
	originalLanguage: false,
	passages(_body, scopeKey) {
		const keys = parseConnectionScopeKey("canonical_relationship", scopeKey);
		if (!keys) return [];
		return [
			{ reference: { key: keys.first } },
			{ reference: { key: keys.second } },
		];
	},
	async title(client, scopeKey) {
		const { first, second } = await readConnectionScope(
			client,
			"canonical_relationship",
			scopeKey,
		);
		return `${second.label} in ${first.label}`;
	},
	async assertCanDraft(client, scopeKey) {
		await readConnectionScope(client, "canonical_relationship", scopeKey);
	},
});

export const questionKind = studyKind<QuestionBody>({
	label: "Interpretive question",
	body: questionBodySchema,
	empty: emptyQuestionBody,
	checklist: questionChecklist,
	fields: questionFields,
	documents: questionDocuments,
	originalLanguage: "when_words_appear",
	titleFollowsBody: true,
	canBeShownElsewhere: true,
	publicationConfirmation: questionStanceChange,
	passages: ({ passage }) =>
		passage ? [{ reference: { text: passage } }] : [],
	sourceIds: ({ views }) =>
		views.flatMap(({ heldBy }) => heldBy.map(({ sourceId }) => sourceId)),
	async title(_client, scopeKey, body) {
		assertRecordKey(scopeKey);
		return body?.question ? shorten(body.question) : "Untitled question";
	},
});

function themeIdFrom(scopeKey: string) {
	const id = Number(scopeKey);
	if (!Number.isInteger(id) || id < 1) {
		throw new GovernanceError("This theme no longer exists.");
	}
	return id;
}

async function getThemeRow(client: DbExecutor, scopeKey: string) {
	const [theme] = await client
		.select({ id: themes.id, status: themes.status })
		.from(themes)
		.where(eq(themes.id, themeIdFrom(scopeKey)));
	if (!theme) throw new GovernanceError("This theme no longer exists.");
	return theme;
}

async function assertThemeNameFree(
	client: DbExecutor,
	scopeKey: string,
	name: string,
) {
	if (!name) return;
	const [taken] = await client
		.select({ title: contentItems.title })
		.from(contentItems)
		.innerJoin(themes, eq(contentItems.scopeKey, sql`${themes.id}::text`))
		.where(
			and(
				eq(contentItems.kind, "theme"),
				eq(themes.status, "active"),
				ne(contentItems.scopeKey, scopeKey),
				sql`lower(${contentItems.title}) = lower(${name})`,
			),
		)
		.limit(1);
	if (taken) {
		throw new GovernanceError(
			`A theme called "${taken.title}" already exists.`,
		);
	}
}

export const themeKind = studyKind<ThemeBody>({
	label: "Theme",
	body: themeBodySchema,
	empty: emptyThemeBody,
	checklist: themeChecklist,
	fields: themeFields,
	documents: themeDocuments,
	originalLanguage: "when_words_appear",
	titleFollowsBody: true,
	publicationConfirmation: themeRename,
	passages: ({ passages }) =>
		passages.map(({ reference }) => ({ reference: { text: reference } })),
	async title(client, scopeKey, body) {
		await getThemeRow(client, scopeKey);
		return body?.name || "Untitled theme";
	},
	async assertCanDraft(client, scopeKey, body) {
		const theme = await getThemeRow(client, scopeKey);
		if (theme.status === "merged") {
			throw new GovernanceError(
				"This theme was merged into another one. Edit that one instead.",
			);
		}
		await assertThemeNameFree(client, scopeKey, body.name);
	},
	async assertReady(client, body) {
		for (const { name, themeId } of body.relatedThemes) {
			const related = await getThemeRow(client, String(themeId));
			if (related.status === "merged") {
				throw new GovernanceError(
					`"${name}" was merged into another theme. Choose that one instead.`,
				);
			}
		}
	},
	async removeWhenEmpty(client, scopeKey) {
		await client.delete(themes).where(eq(themes.id, themeIdFrom(scopeKey)));
	},
});

export const originalLanguageNoteKind = studyKind<OriginalLanguageNoteBody>({
	label: "Original-language note",
	body: originalLanguageNoteBodySchema,
	empty: emptyOriginalLanguageNoteBody,
	checklist: originalLanguageNoteChecklist,
	fields: originalLanguageNoteFields,
	documents: ({ note }) => [note],
	originalLanguage: true,
	writePermissions: originalLanguageWriters,
	titleFollowsBody: true,
	canBeShownElsewhere: true,
	passages: ({ passage }) =>
		passage ? [{ reference: { text: passage } }] : [],
	async title(_client, scopeKey, body) {
		assertRecordKey(scopeKey);
		if (!body?.word) return "Untitled note";
		return body.passage ? `${body.word} · ${body.passage}` : body.word;
	},
});

export const textualNoteKind = studyKind<TextualNoteBody>({
	label: "Textual note",
	body: textualNoteBodySchema,
	empty: emptyTextualNoteBody,
	checklist: textualNoteChecklist,
	fields: textualNoteFields,
	documents: ({ note }) => [note],
	originalLanguage: true,
	writePermissions: originalLanguageWriters,
	titleFollowsBody: true,
	canBeShownElsewhere: true,
	passages: ({ passage }) =>
		passage ? [{ reference: { text: passage } }] : [],
	links: ({ relatedVariant }) =>
		relatedVariant
			? [
					{
						kind: "textual_variant",
						label: `The variant ${relatedVariant.label}`,
						scopeKey: relatedVariant.scopeKey,
					},
				]
			: [],
	async title(_client, scopeKey, body) {
		assertRecordKey(scopeKey);
		return body?.heading ? shorten(body.heading) : "Untitled textual note";
	},
});

export const textualVariantKind = studyKind<TextualVariantBody>({
	label: "Textual variant",
	body: textualVariantBodySchema,
	empty: emptyTextualVariantBody,
	checklist: textualVariantChecklist,
	fields: textualVariantFields,
	documents: ({ reason }) => [reason],
	originalLanguage: true,
	writePermissions: originalLanguageWriters,
	titleFollowsBody: true,
	canBeShownElsewhere: true,
	passages: ({ passage }) =>
		passage ? [{ reference: { text: passage } }] : [],
	async title(_client, scopeKey, body) {
		assertRecordKey(scopeKey);
		return body?.location ? shorten(body.location) : "Untitled variant";
	},
});
