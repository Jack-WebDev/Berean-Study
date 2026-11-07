import { and, count, eq, inArray, ne } from "drizzle-orm";

import { recordAudit } from "./audit";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { books } from "./schema/books";
import { chapters } from "./schema/chapters";
import { translations } from "./schema/translations";
import { verseTextRevisions } from "./schema/verse_text_revisions";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";
import {
	protestantBookCatalogue,
	translationCatalogue,
	verseCountAcrossBible,
} from "./scripture-catalogue";

export type BookProgressState =
	| "published"
	| "proofreading"
	| "entering"
	| "not_started";

const catalogueAbbreviations = translationCatalogue.map(
	({ abbreviation }) => abbreviation,
);

/**
 * Why a translation's chapters can't be published, or null if they can. Only
 * licensed translations can be blocked: they need a recorded permission whose
 * licence hasn't ended. `today` is `YYYY-MM-DD`.
 */
export function publishingBlock(
	translation: {
		licensed: boolean;
		permissionRecordedAt: Date | null;
		licenceEndsOn: string | null;
	},
	today: string,
): "permission_not_recorded" | "licence_ended" | null {
	if (!translation.licensed) return null;
	if (!translation.permissionRecordedAt) return "permission_not_recorded";
	if (translation.licenceEndsOn && translation.licenceEndsOn < today) {
		return "licence_ended";
	}
	return null;
}

function progressState(
	publishedVerses: number,
	expectedVerses: number,
	work: { drafts: number; inProofreading: number },
): BookProgressState {
	if (work.inProofreading > 0) return "proofreading";
	if (work.drafts > 0) return "entering";
	if (publishedVerses === 0) return "not_started";
	return publishedVerses >= expectedVerses ? "published" : "entering";
}

/** The six supported translations, in catalogue order. */
export async function listSupportedTranslations(client: DbExecutor) {
	const rows = await client
		.select()
		.from(translations)
		.where(inArray(translations.abbreviation, catalogueAbbreviations));
	return catalogueAbbreviations.flatMap((candidate) =>
		rows.filter((row) => row.abbreviation === candidate),
	);
}

export function toDateString(date: Date) {
	return date.toISOString().slice(0, 10);
}

/**
 * The six translations with how much of each is published, and the details and
 * book-by-book progress of the chosen one. Falls back to the first translation.
 */
export async function getTranslationsOverview(
	client: DbExecutor,
	abbreviation?: string,
) {
	const ordered = await listSupportedTranslations(client);

	const publishedByBook = await client
		.select({
			translationId: verseTexts.translationId,
			slug: books.slug,
			value: count(),
		})
		.from(verseTexts)
		.innerJoin(verses, eq(verses.id, verseTexts.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(books, eq(books.id, chapters.bookId))
		.groupBy(verseTexts.translationId, books.slug);

	const workByBook = await client
		.select({
			translationId: verseTextRevisions.translationId,
			slug: books.slug,
			status: verseTextRevisions.status,
			value: count(),
		})
		.from(verseTextRevisions)
		.innerJoin(verses, eq(verses.id, verseTextRevisions.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(books, eq(books.id, chapters.bookId))
		.where(
			and(
				ne(verseTextRevisions.status, "published"),
				ne(verseTextRevisions.status, "superseded"),
			),
		)
		.groupBy(
			verseTextRevisions.translationId,
			books.slug,
			verseTextRevisions.status,
		);

	const list = ordered.map((row) => {
		const published = publishedByBook
			.filter(({ translationId }) => translationId === row.id)
			.reduce((total, { value }) => total + value, 0);
		return {
			abbreviation: row.abbreviation,
			name: row.name,
			publishedVerses: published,
			publishedShare: published / verseCountAcrossBible,
		};
	});

	const chosen =
		ordered.find((row) => row.abbreviation === abbreviation) ?? ordered[0];
	if (!chosen) return { list, selected: null };

	const bookProgress = protestantBookCatalogue.map((book) => {
		const publishedVerses =
			publishedByBook.find(
				({ translationId, slug }) =>
					translationId === chosen.id && slug === book.slug,
			)?.value ?? 0;
		const expectedVerses = book.expectedVerses ?? 0;
		const work = workByBook.filter(
			({ translationId, slug }) =>
				translationId === chosen.id && slug === book.slug,
		);
		const totalOf = (matches: (status: string) => boolean) =>
			work
				.filter(({ status }) => matches(status))
				.reduce((total, { value }) => total + value, 0);
		return {
			slug: book.slug,
			name: book.name,
			shortName: book.shortName,
			publishedVerses,
			expectedVerses,
			state: progressState(publishedVerses, expectedVerses, {
				drafts: totalOf((status) => status === "draft"),
				inProofreading: totalOf((status) => status !== "draft"),
			}),
		};
	});

	return {
		list,
		selected: {
			abbreviation: chosen.abbreviation,
			name: chosen.name,
			edition: chosen.edition,
			rightsHolder: chosen.rightsHolder,
			copyrightNotice: chosen.copyrightNotice,
			licensed: chosen.licensed,
			permissionRecordedAt: chosen.permissionRecordedAt,
			licenceEndsOn: chosen.licenceEndsOn,
			quotationLimits: chosen.quotationLimits,
			publishingBlock: publishingBlock(chosen, toDateString(new Date())),
			books: bookProgress,
		},
	};
}

export async function getTranslation(client: DbExecutor, abbreviation: string) {
	const [translation] = await client
		.select()
		.from(translations)
		.where(
			and(
				eq(translations.abbreviation, abbreviation),
				inArray(translations.abbreviation, catalogueAbbreviations),
			),
		);
	if (!translation) {
		throw new GovernanceError("This translation isn't supported.");
	}
	return translation;
}

function blankToNull(value: string) {
	return value.trim() || null;
}

/** Saves a translation's details, recording which ones changed. */
export async function updateTranslationDetails(
	client: DbExecutor,
	input: {
		actorUserId: string;
		abbreviation: string;
		name: string;
		edition: string;
		rightsHolder: string;
		copyrightNotice: string;
	},
) {
	const name = input.name.trim();
	if (!name) throw new GovernanceError("Give the translation a full name.");

	await client.transaction(async (tx) => {
		const current = await getTranslation(tx, input.abbreviation);
		const next = {
			name,
			edition: blankToNull(input.edition),
			rightsHolder: blankToNull(input.rightsHolder),
			copyrightNotice: blankToNull(input.copyrightNotice),
		};
		if (
			current.permissionRecordedAt &&
			(!next.rightsHolder || !next.copyrightNotice)
		) {
			throw new GovernanceError(
				"A recorded permission depends on the rights holder and copyright notice, so they can't be blank. Remove the permission first if it no longer applies.",
			);
		}
		const changed = (Object.keys(next) as (keyof typeof next)[]).filter(
			(field) => next[field] !== current[field],
		);
		if (changed.length === 0) return;

		await tx
			.update(translations)
			.set(next)
			.where(eq(translations.id, current.id));
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "translation.details_changed",
			targetType: "translation",
			targetId: current.id,
			details: { name: current.abbreviation, changed },
		});
	});
}

/**
 * Records that the rights holder has allowed publishing. Takes the details that
 * permission depends on, so it can't be recorded without them.
 */
export async function recordTranslationPermission(
	client: DbExecutor,
	input: {
		actorUserId: string;
		abbreviation: string;
		rightsHolder: string;
		copyrightNotice: string;
		licenceEndsOn: string | null;
		quotationLimits: string;
		reason: string;
	},
) {
	const rightsHolder = input.rightsHolder.trim();
	const copyrightNotice = input.copyrightNotice.trim();
	const reason = input.reason.trim();
	if (!rightsHolder) throw new GovernanceError("Name the rights holder.");
	if (!copyrightNotice) {
		throw new GovernanceError(
			"Add the exact copyright notice the rights holder requires.",
		);
	}
	if (!reason) {
		throw new GovernanceError(
			"Say where the permission is recorded, such as a letter or licence reference.",
		);
	}

	await client.transaction(async (tx) => {
		const current = await getTranslation(tx, input.abbreviation);
		if (!current.licensed) {
			throw new GovernanceError(
				`${current.abbreviation} doesn't need permission to publish.`,
			);
		}

		await tx
			.update(translations)
			.set({
				rightsHolder,
				copyrightNotice,
				licenceEndsOn: input.licenceEndsOn,
				quotationLimits: blankToNull(input.quotationLimits),
				permissionRecordedAt: new Date(),
				permissionRecordedByUserId: input.actorUserId,
			})
			.where(eq(translations.id, current.id));
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "translation.permission_recorded",
			targetType: "translation",
			targetId: current.id,
			details: {
				name: current.abbreviation,
				reason,
				licenceEndsOn: input.licenceEndsOn,
			},
		});
	});
}

/** Takes a permission back, for one recorded by mistake or withdrawn by the rights holder. */
export async function removeTranslationPermission(
	client: DbExecutor,
	input: { actorUserId: string; abbreviation: string; reason: string },
) {
	const reason = input.reason.trim();
	if (!reason) throw new GovernanceError("Give a reason for removing this.");

	await client.transaction(async (tx) => {
		const current = await getTranslation(tx, input.abbreviation);
		if (!current.permissionRecordedAt) {
			throw new GovernanceError(
				"No permission is recorded for this translation.",
			);
		}

		await tx
			.update(translations)
			.set({ permissionRecordedAt: null, permissionRecordedByUserId: null })
			.where(eq(translations.id, current.id));
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "translation.permission_removed",
			targetType: "translation",
			targetId: current.id,
			details: { name: current.abbreviation, reason },
		});
	});
}
