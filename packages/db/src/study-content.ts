import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getPermissionKeys } from "./access";
import {
	canonicalRelationshipBodySchema,
	canonicalRelationshipLabels,
	connectionScopeKey,
	crossReferenceBodySchema,
	crossReferenceKindLabels,
	parseConnectionScopeKey,
} from "./connection-body";
import {
	type ContentBody,
	type ContentKindName,
	contentKindNamed,
} from "./content-kind-registry";
import { contentAtPassage } from "./content-links";
import { getContentState, listContentRecords } from "./content-queues";
import { type ContentScope, saveDraft } from "./content-workflow";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import {
	type ThemePassageRole,
	themeBodySchema,
	themePassageRoleLabels,
} from "./interpretation-body";
import {
	type PassageRange,
	parsePassageKey,
	THROUGH_CHAPTER_END,
} from "./passage-key";
import { user } from "./schema/auth";
import { books } from "./schema/books";
import { canonBooks } from "./schema/canon_books";
import { canonTraditions } from "./schema/canon_traditions";
import { chapters } from "./schema/chapters";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { themes } from "./schema/themes";
import { translations } from "./schema/translations";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";
import { readPassageKey, resolvePassage } from "./scripture-reference";
import { newRecordKey, readConnectionScope } from "./study-kinds";
import { listProposals, proposeChange } from "./two-person";

const connectionKinds = ["cross_reference", "canonical_relationship"] as const;
export type ConnectionKind = (typeof connectionKinds)[number];

const languageKinds = [
	"original_language_note",
	"textual_note",
	"textual_variant",
] as const;

/** Connections, questions, themes and language content, for everyone who edits them. */
export const studyKinds = [
	...connectionKinds,
	...languageKinds,
	"interpretive_question",
	"theme",
] as const satisfies readonly ContentKindName[];
export type StudyKind = (typeof studyKinds)[number];

/** A passage's words in one translation, if they've been published. */
export async function publishedPassageText(
	client: DbExecutor,
	passage: PassageRange,
	abbreviation = "KJV",
) {
	const { from, to } = passage;
	const rows = await client
		.select({ text: verseTexts.text })
		.from(verseTexts)
		.innerJoin(translations, eq(translations.id, verseTexts.translationId))
		.innerJoin(verses, eq(verses.id, verseTexts.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(books, eq(books.id, chapters.bookId))
		.where(
			and(
				eq(translations.abbreviation, abbreviation),
				eq(books.slug, passage.bookSlug),
				sql`(${chapters.number}, ${verses.number}) >= (${from.chapter}, ${from.verse})`,
				sql`(${chapters.number}, ${verses.number}) <= (${to.chapter}, ${to.verse})`,
			),
		)
		.orderBy(asc(chapters.number), asc(verses.number))
		.limit(60);
	return rows.length > 0 ? rows.map(({ text }) => text).join(" ") : null;
}

/** Checks what someone typed, and shows them which verses it means. */
export async function previewPassage(client: DbExecutor, text: string) {
	const { key, label, passage } = await resolvePassage(client, text);
	return {
		key,
		label,
		text:
			passage.to.verse === THROUGH_CHAPTER_END
				? null
				: await publishedPassageText(client, passage),
	};
}

async function connectionEnd(client: DbExecutor, text: string) {
	const resolved = await resolvePassage(client, text);
	if (resolved.passage.to.verse === THROUGH_CHAPTER_END) {
		throw new GovernanceError(
			`Include the verse in "${text}", like Romans 8:28. A connection joins verses, not whole chapters.`,
		);
	}
	return resolved;
}

async function connectionExists(
	client: DbExecutor,
	kind: ConnectionKind,
	scopeKey: string,
) {
	const [item] = await client
		.select({ id: contentItems.id })
		.from(contentItems)
		.where(
			and(eq(contentItems.kind, kind), eq(contentItems.scopeKey, scopeKey)),
		);
	return Boolean(item);
}

/**
 * Turns two typed passages into a connection's address. If that connection already
 * exists, in either direction, it's the one to open, so `existed` says so.
 */
export async function resolveConnection(
	client: DbExecutor,
	input: { first: string; kind: ConnectionKind; second: string },
) {
	const one = await connectionEnd(client, input.first);
	const two = await connectionEnd(client, input.second);
	if (one.key === two.key) {
		throw new GovernanceError("A passage can't connect to itself.");
	}

	if (input.kind === "cross_reference") {
		const scopeKey = connectionScopeKey("cross_reference", one.key, two.key);
		const reverse = connectionScopeKey("cross_reference", two.key, one.key);
		if (await connectionExists(client, input.kind, reverse)) {
			return { existed: true, scopeKey: reverse };
		}
		return {
			existed: await connectionExists(client, input.kind, scopeKey),
			scopeKey,
		};
	}

	if (one.testament === two.testament) {
		throw new GovernanceError(
			"A canonical relationship joins a New Testament passage to an Old Testament one.",
		);
	}
	// Either order is clear enough, so people don't have to think about which comes first.
	const [newer, older] = one.testament === "new" ? [one, two] : [two, one];
	const scopeKey = connectionScopeKey(
		"canonical_relationship",
		newer.key,
		older.key,
	);
	return {
		existed: await connectionExists(client, input.kind, scopeKey),
		scopeKey,
	};
}

/** Saves a draft of any study record. A new one that has no address yet is given one. */
export async function saveStudyDraft(
	client: DbExecutor,
	input: {
		actorUserId: string;
		body: unknown;
		kind: StudyKind;
		scopeKey: string | null;
	},
) {
	if (input.scopeKey) {
		const saved = await saveDraft(client, {
			...input,
			scopeKey: input.scopeKey,
		});
		return { ...saved, scopeKey: input.scopeKey };
	}
	if (
		input.kind === "cross_reference" ||
		input.kind === "canonical_relationship"
	) {
		throw new GovernanceError("Choose both passages first.");
	}
	return client.transaction(async (tx) => {
		let scopeKey: string = newRecordKey();
		if (input.kind === "theme") {
			const [theme] = await tx
				.insert(themes)
				.values({})
				.returning({ id: themes.id });
			if (!theme) throw new Error("Could not start the theme.");
			scopeKey = String(theme.id);
		}
		const saved = await saveDraft(tx, { ...input, scopeKey });
		return { ...saved, scopeKey };
	});
}

/** Where a record stands. Null if the address can't be one. */
export async function getStudyRecord<TKind extends StudyKind>(
	client: DbExecutor,
	scope: ContentScope<TKind>,
	viewerUserId: string,
) {
	try {
		const state = await getContentState(client, scope, viewerUserId);
		return { body: state.body as ContentBody<TKind>, state };
	} catch (error) {
		if (error instanceof GovernanceError) return null;
		throw error;
	}
}

/** A connection's two passages and where it stands, for its editor. */
export async function getConnectionRecord(
	client: DbExecutor,
	scope: { kind: ConnectionKind; scopeKey: string },
	viewerUserId: string,
) {
	const record = await getStudyRecord(client, scope, viewerUserId);
	if (!record) return null;
	const { first, second } = await readConnectionScope(
		client,
		scope.kind,
		scope.scopeKey,
	);
	return {
		...record,
		first: {
			key: first.key,
			label: first.label,
			text: await publishedPassageText(client, first.passage),
		},
		second: {
			key: second.key,
			label: second.label,
			text: await publishedPassageText(client, second.passage),
		},
	};
}

/** Pages open from a stored address or from what someone typed. Null if it's neither. */
async function readPassageLoosely(client: DbExecutor, text: string) {
	try {
		return parsePassageKey(text)
			? await readPassageKey(client, text)
			: await resolvePassage(client, text);
	} catch (error) {
		if (error instanceof GovernanceError) return null;
		throw error;
	}
}

function otherEnd(kind: ConnectionKind, scopeKey: string, key: string) {
	const ends = parseConnectionScopeKey(kind, scopeKey);
	if (!ends) return null;
	return ends.first === key ? ends.second : ends.first;
}

/** What the Connections page lists for one passage. Null if the address can't be one. */
export async function getPassageConnections(
	client: DbExecutor,
	passage: string,
) {
	const reference = await readPassageLoosely(client, passage);
	if (!reference) return null;
	const { key } = reference;
	const rows = await contentAtPassage(
		client,
		{
			bookId: reference.bookId,
			from: reference.passage.from,
			to: reference.passage.to,
		},
		{ kinds: [...connectionKinds, "theme"], revision: "latest" },
	);

	const items = [];
	for (const row of rows) {
		const base = {
			contentItemId: row.contentItemId,
			hasLive: row.liveRevisionId !== null,
			kind: row.kind as ConnectionKind | "theme",
			number: row.number,
			revisionId: row.revisionId,
			scopeKey: row.scopeKey,
			status: row.status,
			target: row.title,
		};
		if (row.kind === "theme") {
			const body = themeBodySchema.parse(row.body);
			items.push({
				...base,
				meta: `${body.passages.length} ${body.passages.length === 1 ? "passage" : "passages"}`,
			});
			continue;
		}
		const kind = row.kind as ConnectionKind;
		const other = otherEnd(kind, row.scopeKey, key);
		const label = other
			? (await readPassageKey(client, other)).label
			: row.title;
		const meta =
			kind === "cross_reference"
				? crossReferenceMeta(row.body, row.showsToReaders)
				: canonicalMeta(row.body);
		items.push({ ...base, meta, target: label });
	}

	return {
		bookName: reference.bookName,
		items,
		key,
		label: reference.label,
		testament: reference.testament,
		text: await publishedPassageText(client, reference.passage),
	};
}

function crossReferenceMeta(raw: unknown, showsToReaders: boolean) {
	const body = crossReferenceBodySchema.parse(raw);
	const kind = body.kind ? crossReferenceKindLabels[body.kind] : "Kind not set";
	return showsToReaders ? kind : `${kind} · Readers don't see this one here`;
}

function canonicalMeta(raw: unknown) {
	const body = canonicalRelationshipBodySchema.parse(raw);
	return body.relationship
		? canonicalRelationshipLabels[body.relationship]
		: "Relationship not set";
}

/** Language content on one passage, grouped by the Language & text page's tabs. */
export async function getPassageLanguage(client: DbExecutor, passage: string) {
	const reference = await readPassageLoosely(client, passage);
	if (!reference) return null;
	const { key } = reference;
	const rows = await contentAtPassage(
		client,
		{
			bookId: reference.bookId,
			from: reference.passage.from,
			to: reference.passage.to,
		},
		{ kinds: languageKinds, revision: "latest" },
	);
	return {
		bookName: reference.bookName,
		items: rows.map((row) => ({
			contentItemId: row.contentItemId,
			hasLive: row.liveRevisionId !== null,
			kind: row.kind as (typeof languageKinds)[number],
			number: row.number,
			scopeKey: row.scopeKey,
			status: row.status,
			title: row.title,
		})),
		key,
		label: reference.label,
		text: await publishedPassageText(client, reference.passage),
	};
}

/** Records that exist of these kinds, to open, revise or place in other writing. */
export function listStudyRecords(
	client: DbExecutor,
	filter: { kinds: readonly StudyKind[]; search?: string },
) {
	return listContentRecords(client, filter);
}

/** Each book's place in the Protestant canon, by name, for showing passages in order. */
async function bookPositions(client: DbExecutor) {
	const rows = await client
		.select({ name: books.name, position: canonBooks.canonicalOrder })
		.from(canonBooks)
		.innerJoin(books, eq(books.id, canonBooks.bookId))
		.innerJoin(canonTraditions, eq(canonTraditions.id, canonBooks.canonId))
		.where(eq(canonTraditions.slug, "protestant"));
	return Object.fromEntries(rows.map(({ name, position }) => [name, position]));
}

/** Themes that aren't merged away, with what's needed to choose between them. */
export async function listThemes(
	client: DbExecutor,
	filter: { search?: string } = {},
) {
	const rows = await listContentRecords(client, {
		kinds: ["theme"],
		search: filter.search,
	});
	if (rows.length === 0) return [];
	const merged = await client
		.select({ id: themes.id })
		.from(themes)
		.where(
			and(
				eq(themes.status, "merged"),
				inArray(
					themes.id,
					rows.map(({ scopeKey }) => Number(scopeKey)),
				),
			),
		);
	const mergedIds = new Set(merged.map(({ id }) => String(id)));
	return rows.filter(({ scopeKey }) => !mergedIds.has(scopeKey));
}

/** Everything the theme editor needs. Null if there's no such theme. */
export async function getThemeEditor(
	client: DbExecutor,
	input: { themeId: number | null },
	viewerUserId: string,
) {
	const context = {
		bookPositions: await bookPositions(client),
		otherThemes: (await listThemes(client)).filter(
			({ scopeKey }) => scopeKey !== String(input.themeId),
		),
	};
	if (input.themeId === null) {
		return {
			...context,
			body: contentKindNamed("theme").empty as ContentBody<"theme">,
			mergedInto: null,
			pendingMerge: null,
			state: null,
			themeId: null,
		};
	}

	const [theme] = await client
		.select({
			mergedIntoThemeId: themes.mergedIntoThemeId,
			status: themes.status,
		})
		.from(themes)
		.where(eq(themes.id, input.themeId));
	if (!theme) return null;
	const record = await getStudyRecord(
		client,
		{ kind: "theme", scopeKey: String(input.themeId) },
		viewerUserId,
	);
	if (!record) return null;

	const [proposal] = await listProposals(client, {
		kinds: ["theme_merge"],
		status: "proposed",
		target: { id: String(input.themeId), type: "theme" },
	});
	const [proposer] = proposal
		? await client
				.select({ name: user.name })
				.from(user)
				.where(eq(user.id, proposal.proposerUserId))
		: [];
	return {
		...context,
		...record,
		mergedInto: theme.mergedIntoThemeId,
		pendingMerge: proposal
			? {
					description: proposal.description,
					id: proposal.id,
					proposedByMe: proposal.proposerUserId === viewerUserId,
					proposerName: proposer?.name ?? "Someone",
					reason: proposal.reason,
				}
			: null,
		themeId: input.themeId,
	};
}

/** Adds a passage from a verse's Connections page. It goes in the theme's draft, like any edit. */
export async function addPassageToTheme(
	client: DbExecutor,
	input: {
		actorUserId: string;
		key: string;
		passage: string;
		role: ThemePassageRole;
		themeId: number;
		why: string;
	},
) {
	const { label } = await resolvePassage(client, input.passage);
	const scope = { kind: "theme" as const, scopeKey: String(input.themeId) };
	const record = await getStudyRecord(client, scope, input.actorUserId);
	if (!record) throw new GovernanceError("This theme no longer exists.");
	if (record.body.passages.some(({ reference }) => reference === label)) {
		throw new GovernanceError(
			`${label} is already in ${record.state.title}, as ${themePassageRoleLabels[input.role].toLowerCase()} or another role. Open the theme to change it.`,
		);
	}
	return saveDraft(client, {
		...scope,
		actorUserId: input.actorUserId,
		body: {
			...record.body,
			passages: [
				...record.body.passages,
				{
					key: input.key,
					reference: label,
					role: input.role,
					why: input.why.trim(),
				},
			],
		},
	});
}

async function requireFoundationalConfirmer(
	client: DbExecutor,
	userId: string,
) {
	const keys = await getPermissionKeys(client, userId);
	if (!keys.includes("content.confirm_foundational")) {
		throw new GovernanceError(
			"Only a Superadmin can send this for confirmation.",
		);
	}
}

/** Asks a second Superadmin to agree to publish a stance change or theme rename. */
export async function requestPublicationConfirmation(
	client: DbExecutor,
	input: {
		actorUserId: string;
		contentItemId: number;
		reason: string;
		revisionId: number;
	},
) {
	await client.transaction(async (tx) => {
		await requireFoundationalConfirmer(tx, input.actorUserId);
		await proposeChange(tx, {
			kind: "guarded_publication",
			payload: {
				contentItemId: input.contentItemId,
				revisionId: input.revisionId,
			},
			proposerUserId: input.actorUserId,
			reason: input.reason,
		});
	});
}

/** Proposes merging one published theme into another. A second Superadmin decides. */
export async function proposeThemeMerge(
	client: DbExecutor,
	input: {
		actorUserId: string;
		intoThemeId: number;
		reason: string;
		themeId: number;
	},
) {
	await client.transaction(async (tx) => {
		await requireFoundationalConfirmer(tx, input.actorUserId);
		await proposeChange(tx, {
			kind: "theme_merge",
			payload: { intoThemeId: input.intoThemeId, themeId: input.themeId },
			proposerUserId: input.actorUserId,
			reason: input.reason,
		});
	});
}

/**
 * Foundational changes waiting on a second Superadmin, for the Publication page. A
 * revision sent back after being sent for confirmation can never be confirmed, and
 * its fix is a new revision, so it's left out.
 */
export async function listFoundationalConfirmations(
	client: DbExecutor,
	viewerUserId: string,
) {
	const proposals = await listProposals(client, {
		kinds: ["guarded_publication", "theme_merge"],
		status: "proposed",
	});
	const revisionIds = proposals.flatMap(({ kind, targetId }) =>
		kind === "guarded_publication" ? [Number(targetId)] : [],
	);
	const approved =
		revisionIds.length > 0
			? await client
					.select({ id: contentRevisions.id })
					.from(contentRevisions)
					.where(
						and(
							inArray(contentRevisions.id, revisionIds),
							eq(contentRevisions.status, "approved"),
						),
					)
			: [];
	const stillOpen = new Set(approved.map(({ id }) => String(id)));
	return proposals
		.filter(
			({ kind, targetId }) =>
				kind !== "guarded_publication" || stillOpen.has(targetId),
		)
		.map(({ description, destination, id, proposerUserId, reason, title }) => ({
			description,
			destination,
			id,
			proposedByMe: proposerUserId === viewerUserId,
			reason,
			title,
		}));
}
