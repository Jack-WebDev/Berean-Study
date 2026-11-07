import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { recordAudit } from "./audit";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { user } from "./schema/auth";
import { books } from "./schema/books";
import { chapters } from "./schema/chapters";
import { translations } from "./schema/translations";
import { versePresence } from "./schema/verse_presence";
import { verseTextRevisions } from "./schema/verse_text_revisions";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";
import { versificationSystems } from "./schema/versification_systems";
import {
	hasOwnText,
	protestantBookCatalogue,
	type VersePresenceKind,
	type VerseTextStatus,
} from "./scripture-catalogue";
import { linkedContentCounts } from "./scripture-data";
import {
	getTranslation,
	listSupportedTranslations,
} from "./translations-admin";
import {
	type ChapterAddress,
	chapterName,
	currentPublishingBlock,
	getBookBySlug,
	loadChapterVerses,
	lockChapter,
	openRevisionStatuses,
	resolveChapter,
} from "./verse-text-rows";
import { HIGHEST_VERSE_NUMBER } from "./verse-text-tools";

const FOREIGN_KEY_VIOLATION = "23503";

const catalogueSlugs = protestantBookCatalogue.map(({ slug }) => slug);

/** How far each translation has got with one chapter. */
async function chapterProgressByTranslation(
	client: DbExecutor,
	chapterId: number,
) {
	const verseRows = await client
		.select({ id: verses.id })
		.from(verses)
		.where(eq(verses.chapterId, chapterId));
	const verseIds = verseRows.map(({ id }) => id);
	if (verseIds.length === 0) {
		return () => ({ entered: 0, total: 0 });
	}

	const published = await client
		.select({
			translationId: verseTexts.translationId,
			verseId: verseTexts.verseId,
		})
		.from(verseTexts)
		.where(inArray(verseTexts.verseId, verseIds));
	const open = await client
		.select({
			translationId: verseTextRevisions.translationId,
			verseId: verseTextRevisions.verseId,
		})
		.from(verseTextRevisions)
		.where(
			and(
				inArray(verseTextRevisions.verseId, verseIds),
				inArray(verseTextRevisions.status, [...openRevisionStatuses]),
			),
		);
	const exceptions = await client
		.select({
			translationId: versePresence.translationId,
			kind: versePresence.kind,
		})
		.from(versePresence)
		.where(inArray(versePresence.verseId, verseIds));

	return (translationId: number) => {
		const withText = new Set(
			[...published, ...open]
				.filter((row) => row.translationId === translationId)
				.map(({ verseId }) => verseId),
		);
		const withoutOwnText = exceptions.filter(
			(row) =>
				row.translationId === translationId &&
				!hasOwnText(row.kind as VersePresenceKind),
		).length;
		return { entered: withText.size, total: verseIds.length - withoutOwnText };
	};
}

/** Each chapter of a book with where it stands in one translation, for the chapter buttons. */
async function listChapterStates(
	client: DbExecutor,
	bookId: number,
	translation: { id: number; versificationSystemId: number },
) {
	const rows = await client
		.select({
			number: chapters.number,
			verseId: verses.id,
			published: verseTexts.verseId,
			open: verseTextRevisions.id,
			kind: versePresence.kind,
		})
		.from(chapters)
		.leftJoin(verses, eq(verses.chapterId, chapters.id))
		.leftJoin(
			verseTexts,
			and(
				eq(verseTexts.verseId, verses.id),
				eq(verseTexts.translationId, translation.id),
			),
		)
		.leftJoin(
			verseTextRevisions,
			and(
				eq(verseTextRevisions.verseId, verses.id),
				eq(verseTextRevisions.translationId, translation.id),
				inArray(verseTextRevisions.status, [...openRevisionStatuses]),
			),
		)
		.leftJoin(
			versePresence,
			and(
				eq(versePresence.verseId, verses.id),
				eq(versePresence.translationId, translation.id),
			),
		)
		.where(
			and(
				eq(chapters.bookId, bookId),
				eq(chapters.versificationSystemId, translation.versificationSystemId),
			),
		)
		.orderBy(asc(chapters.number));

	const byChapter = new Map<number, typeof rows>();
	for (const row of rows) {
		byChapter.set(row.number, [...(byChapter.get(row.number) ?? []), row]);
	}

	return [...byChapter].map(([number, chapterRows]) => {
		const slots = chapterRows.filter(
			(row) =>
				row.verseId !== null &&
				hasOwnText(row.kind as VersePresenceKind | null),
		);
		const published = slots.filter((row) => row.published !== null).length;
		const started = slots.some(
			(row) => row.published !== null || row.open !== null,
		);
		return {
			number,
			state:
				slots.length > 0 && published === slots.length
					? ("published" as const)
					: started
						? ("in_progress" as const)
						: ("empty" as const),
		};
	});
}

/**
 * A verse is safe to remove only when nothing has ever been done with it: no text
 * in any translation, and no recorded difference. Links to it are caught when the
 * delete is attempted.
 */
async function verseHasNoContent(client: DbExecutor, verseId: number) {
	const [revision] = await client
		.select({ id: verseTextRevisions.id })
		.from(verseTextRevisions)
		.where(eq(verseTextRevisions.verseId, verseId))
		.limit(1);
	const [published] = await client
		.select({ id: verseTexts.verseId })
		.from(verseTexts)
		.where(eq(verseTexts.verseId, verseId))
		.limit(1);
	const [exception] = await client
		.select({ id: versePresence.verseId })
		.from(versePresence)
		.where(eq(versePresence.verseId, verseId))
		.limit(1);
	return !revision && !published && !exception;
}

/** Everything the Scripture entry screen shows for one chapter of one translation. */
export async function getEntryChapter(
	client: DbExecutor,
	input: { abbreviation?: string; chapter?: number; slug?: string },
	viewerUserId: string,
) {
	const supported = await listSupportedTranslations(client);
	const translation =
		supported.find((row) => row.abbreviation === input.abbreviation) ??
		supported[0];
	if (!translation) return null;

	const bookRows = await client
		.select({
			id: books.id,
			name: books.name,
			slug: books.slug,
			expectedChapters: books.expectedChapters,
		})
		.from(books)
		.where(inArray(books.slug, catalogueSlugs));
	const bookList = catalogueSlugs.flatMap((slug) =>
		bookRows.filter((row) => row.slug === slug),
	);
	const book = bookList.find((row) => row.slug === input.slug) ?? bookList[0];
	if (!book) return null;

	const chapterStates = await listChapterStates(client, book.id, translation);
	const chosenNumber =
		chapterStates.find(({ number }) => number === input.chapter)?.number ??
		chapterStates[0]?.number ??
		null;
	const lastChapter = chapterStates.at(-1)?.number ?? 0;
	const nextChapter =
		book.expectedChapters !== null && lastChapter < book.expectedChapters
			? lastChapter + 1
			: null;

	const [chapter] =
		chosenNumber === null
			? []
			: await client
					.select({ id: chapters.id })
					.from(chapters)
					.where(
						and(
							eq(chapters.bookId, book.id),
							eq(
								chapters.versificationSystemId,
								translation.versificationSystemId,
							),
							eq(chapters.number, chosenNumber),
						),
					);

	const rows = chapter
		? await loadChapterVerses(client, chapter.id, translation.id)
		: [];
	const progress = chapter
		? await chapterProgressByTranslation(client, chapter.id)
		: () => ({ entered: 0, total: 0 });
	const lastVerse = rows.at(-1);

	return {
		books: bookList.map(({ name, slug }) => ({ name, slug })),
		book: { name: book.name, slug: book.slug },
		chapter: chosenNumber,
		chapters: chapterStates,
		// Only an empty last chapter can be taken back, and only if nothing links to it.
		canRemoveChapter: chosenNumber === lastChapter && rows.length === 0,
		canRemoveLastVerse: lastVerse
			? await verseHasNoContent(client, lastVerse.verseId)
			: false,
		nextChapter,
		nextVerse: (lastVerse?.number ?? 0) + 1,
		translation: {
			abbreviation: translation.abbreviation,
			name: translation.name,
			publishingBlock: currentPublishingBlock(translation),
		},
		translations: supported.map((row) => ({
			abbreviation: row.abbreviation,
			...progress(row.id),
		})),
		verses: rows.map((row) => ({
			number: row.number,
			status: row.status,
			// What the person works on: the wording in progress, or else what readers see.
			text: row.revisionText ?? row.publishedText ?? "",
			isCorrection: row.correctionReason !== null,
			enteredByName: row.enteredByName,
			enteredByMe: row.enteredByUserId === viewerUserId,
			suggestedText: row.suggestedText,
			proofNote: row.proofNote,
			returnedByName: row.returnedByName,
			presenceKind: row.presenceKind as VersePresenceKind | null,
			includedInVerse: row.includedInVerse,
			needsOwnText: row.needsOwnText,
		})),
	};
}

/**
 * Adds the next chapter of a book. Chapters beyond the book's known length are
 * numbering exceptions, which need a second Superadmin through a structure change.
 */
export async function addChapter(
	client: DbExecutor,
	input: { abbreviation: string; actorUserId: string; slug: string },
) {
	return client.transaction(async (tx) => {
		const translation = await getTranslation(tx, input.abbreviation);
		const book = await getBookBySlug(tx, input.slug);
		await tx
			.select({ id: books.id })
			.from(books)
			.where(eq(books.id, book.id))
			.for("update");

		const [last] = await tx
			.select({ value: max(chapters.number) })
			.from(chapters)
			.where(
				and(
					eq(chapters.bookId, book.id),
					eq(chapters.versificationSystemId, translation.versificationSystemId),
				),
			);
		const number = (last?.value ?? 0) + 1;
		if (book.expectedChapters === null) {
			throw new GovernanceError(
				`None of the six translations include ${book.name}.`,
			);
		}
		if (number > book.expectedChapters) {
			throw new GovernanceError(
				`${book.name} has ${book.expectedChapters} chapters. Adding another is a numbering exception, which needs a structure change confirmed by a second Superadmin.`,
			);
		}

		const [chapter] = await tx
			.insert(chapters)
			.values({
				bookId: book.id,
				number,
				versificationSystemId: translation.versificationSystemId,
			})
			.returning({ id: chapters.id });
		if (!chapter) throw new Error("Could not add the chapter.");

		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "chapter.added",
			targetType: "chapter",
			targetId: chapter.id,
			details: { name: `${book.name} ${number}` },
		});
		return { number };
	});
}

async function insertNextVerses(
	tx: DbExecutor,
	input: {
		actorUserId: string;
		bookName: string;
		chapterId: number;
		chapterNumber: number;
		upTo?: number;
	},
) {
	const [last] = await tx
		.select({ value: max(verses.number) })
		.from(verses)
		.where(eq(verses.chapterId, input.chapterId));
	const first = (last?.value ?? 0) + 1;
	const through = input.upTo ?? first;
	if (through < first) return;
	if (through > HIGHEST_VERSE_NUMBER) {
		throw new GovernanceError(
			`Verse ${through} can't be right: no chapter goes past verse ${HIGHEST_VERSE_NUMBER}.`,
		);
	}

	const numbers = Array.from(
		{ length: through - first + 1 },
		(_, index) => first + index,
	);
	await tx
		.insert(verses)
		.values(numbers.map((number) => ({ chapterId: input.chapterId, number })));
	await recordAudit(tx, {
		actorUserId: input.actorUserId,
		action: "verse.added",
		targetType: "chapter",
		targetId: input.chapterId,
		details: {
			name: `${input.bookName} ${input.chapterNumber}`,
			verses: numbers,
		},
	});
}

/** Adds a verse at the end of a chapter. Verses can't be inserted, as that would renumber others. */
export async function addVerse(
	client: DbExecutor,
	input: ChapterAddress & { actorUserId: string },
) {
	await client.transaction(async (tx) => {
		const { book, chapter } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);
		await insertNextVerses(tx, {
			actorUserId: input.actorUserId,
			bookName: book.name,
			chapterId: chapter.id,
			chapterNumber: chapter.number,
		});
	});
}

function isForeignKeyViolation(error: unknown) {
	return (
		error instanceof Error &&
		error.cause instanceof Error &&
		"code" in error.cause &&
		error.cause.code === FOREIGN_KEY_VIOLATION
	);
}

/** Takes back a verse added by mistake, as long as it's last and nothing uses it. */
export async function removeLastVerse(
	client: DbExecutor,
	input: ChapterAddress & { actorUserId: string; verse: number },
) {
	await client.transaction(async (tx) => {
		const { book, chapter } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);
		const [last] = await tx
			.select({ id: verses.id, number: verses.number })
			.from(verses)
			.where(eq(verses.chapterId, chapter.id))
			.orderBy(desc(verses.number))
			.limit(1);
		if (!last || last.number !== input.verse) {
			throw new GovernanceError(
				"Only the last verse of a chapter can be removed, as removing any other would leave a gap.",
			);
		}
		if (!(await verseHasNoContent(tx, last.id))) {
			throw new GovernanceError(
				`Verse ${last.number} already has text in a translation, so it can't be removed here.`,
			);
		}

		try {
			await tx.transaction((attempt) =>
				attempt.delete(verses).where(eq(verses.id, last.id)),
			);
		} catch (error) {
			if (!isForeignKeyViolation(error)) throw error;
			throw new GovernanceError(
				`Other content links to verse ${last.number}, so it can't be removed.`,
			);
		}

		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "verse.removed",
			targetType: "chapter",
			targetId: chapter.id,
			details: {
				name: `${book.name} ${chapter.number}`,
				verses: [last.number],
			},
		});
	});
}

/** Takes back a chapter added by mistake, as long as it's last and has no verses. */
export async function removeLastChapter(
	client: DbExecutor,
	input: ChapterAddress & { actorUserId: string },
) {
	await client.transaction(async (tx) => {
		const { book, chapter, translation } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);
		const [last] = await tx
			.select({ value: max(chapters.number) })
			.from(chapters)
			.where(
				and(
					eq(chapters.bookId, book.id),
					eq(chapters.versificationSystemId, translation.versificationSystemId),
				),
			);
		if (last?.value !== chapter.number) {
			throw new GovernanceError(
				"Only the last chapter of a book can be removed.",
			);
		}
		const [verse] = await tx
			.select({ id: verses.id })
			.from(verses)
			.where(eq(verses.chapterId, chapter.id))
			.limit(1);
		if (verse) {
			throw new GovernanceError(
				"This chapter has verses, so it can't be removed.",
			);
		}

		try {
			await tx.transaction((attempt) =>
				attempt.delete(chapters).where(eq(chapters.id, chapter.id)),
			);
		} catch (error) {
			if (!isForeignKeyViolation(error)) throw error;
			throw new GovernanceError(
				"Other content links to this chapter, so it can't be removed.",
			);
		}

		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "chapter.removed",
			targetType: "chapter",
			targetId: chapter.id,
			details: { name: `${book.name} ${chapter.number}` },
		});
	});
}

export type VerseDraftInput = {
	number: number;
	text: string;
	/** The wording the person started from, so another person's edit is never overwritten. */
	baseText: string;
};

const lockedStatusMessages: Partial<
	Record<VerseTextStatus, (number: number) => string>
> = {
	submitted: (number) =>
		`Verse ${number} is with the proofreader, so it can't change right now.`,
	proofread: (number) =>
		`Verse ${number} has passed proofreading, so it can't change until it's published.`,
	published: (number) =>
		`Verse ${number} is published. Use Correct text to change it, so readers keep the current wording until the new one is checked.`,
};

/**
 * Saves wording as drafts. Blank text clears a draft. Only drafts and verses sent
 * back can change: once text is with a proofreader, it stays as they saw it.
 *
 * Pasting can add verses past the end of the chapter, which `addMissingVerses` allows.
 */
export async function saveVerseDrafts(
	client: DbExecutor,
	input: ChapterAddress & {
		actorUserId: string;
		addMissingVerses?: boolean;
		verses: VerseDraftInput[];
	},
) {
	if (input.verses.length === 0) return;

	await client.transaction(async (tx) => {
		const { book, chapter, translation } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);

		if (input.addMissingVerses) {
			await insertNextVerses(tx, {
				actorUserId: input.actorUserId,
				bookName: book.name,
				chapterId: chapter.id,
				chapterNumber: chapter.number,
				upTo: Math.max(...input.verses.map(({ number }) => number)),
			});
		}

		const rows = await loadChapterVerses(tx, chapter.id, translation.id);
		for (const verse of input.verses) {
			const row = rows.find(({ number }) => number === verse.number);
			if (!row) {
				throw new GovernanceError(`Verse ${verse.number} doesn't exist yet.`);
			}
			if (!row.needsOwnText) {
				throw new GovernanceError(
					`Verse ${verse.number} has no text of its own in ${translation.abbreviation}.`,
				);
			}

			const locked = lockedStatusMessages[row.status];
			if (locked && (row.revisionId !== null || verse.text.trim())) {
				throw new GovernanceError(locked(verse.number));
			}

			const current = row.revisionText ?? "";
			if (verse.baseText !== current) {
				throw new GovernanceError(
					`Someone else has changed verse ${verse.number} since you opened this chapter. Reload to see their wording.`,
				);
			}

			const text = verse.text.trim();
			if (row.revisionId === null) {
				if (!text) continue;
				await tx.insert(verseTextRevisions).values({
					enteredByUserId: input.actorUserId,
					text,
					translationId: translation.id,
					verseId: row.verseId,
				});
				continue;
			}

			if (!text) {
				await tx
					.delete(verseTextRevisions)
					.where(eq(verseTextRevisions.id, row.revisionId));
				continue;
			}

			const changed = text !== current;
			if (!changed && row.status === "draft") continue;
			await tx
				.update(verseTextRevisions)
				.set({
					// Accepting a sent-back verse as it stands isn't rewriting it, so
					// the name stays with whoever wrote those words.
					enteredByUserId: changed
						? input.actorUserId
						: (row.enteredByUserId ?? input.actorUserId),
					proofMark: null,
					proofreadAt: null,
					proofreadByUserId: null,
					status: "draft",
					text,
					updatedAt: new Date(),
				})
				.where(eq(verseTextRevisions.id, row.revisionId));
		}
	});
}

/** Sends a chapter's drafts to be checked by someone else. */
export async function sendChapterForProofreading(
	client: DbExecutor,
	input: ChapterAddress & { actorUserId: string },
) {
	return client.transaction(async (tx) => {
		const { book, chapter, translation } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);

		const rows = await loadChapterVerses(tx, chapter.id, translation.id);
		const drafts = rows.filter(({ status }) => status === "draft");
		if (drafts.length === 0) {
			throw new GovernanceError(
				rows.some(({ status }) => status === "needs_fix")
					? "The verses here were sent back with a question. Accept the correction or keep your wording first."
					: "There are no drafts to send in this chapter.",
			);
		}

		const now = new Date();
		await tx
			.update(verseTextRevisions)
			.set({
				proofMark: null,
				proofNote: null,
				proofreadAt: null,
				proofreadByUserId: null,
				returnedByUserId: null,
				status: "submitted",
				submittedAt: now,
				suggestedText: null,
				updatedAt: now,
			})
			.where(
				inArray(
					verseTextRevisions.id,
					drafts.flatMap(({ revisionId }) => revisionId ?? []),
				),
			);

		const sent = drafts.map(({ number }) => number);
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "verse_text.entered",
			targetType: "chapter",
			targetId: chapter.id,
			details: { name: chapterName(book, chapter, translation), verses: sent },
		});
		return { sent: sent.length };
	});
}

/**
 * Proposes new wording for a published verse. It goes straight to proofreading,
 * and readers keep seeing the current text until it is published.
 */
export async function proposeVerseCorrection(
	client: DbExecutor,
	input: ChapterAddress & {
		actorUserId: string;
		checkedAgainst: string;
		reason: string;
		text: string;
		verse: number;
	},
) {
	const text = input.text.trim();
	const reason = input.reason.trim();
	if (!text) throw new GovernanceError("A correction can't be blank.");
	if (!reason) throw new GovernanceError("Say why the text needs correcting.");

	await client.transaction(async (tx) => {
		const { book, chapter, translation } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);

		const rows = await loadChapterVerses(tx, chapter.id, translation.id);
		const row = rows.find(({ number }) => number === input.verse);
		if (!row) throw new GovernanceError("This verse no longer exists.");
		if (row.publishedText === null) {
			throw new GovernanceError(
				"This verse isn't published yet, so there's nothing to correct.",
			);
		}
		if (row.revisionId !== null) {
			throw new GovernanceError(
				"This verse already has a change in progress. Finish that one first.",
			);
		}
		if (text === row.publishedText) {
			throw new GovernanceError(
				"This is the same as the published text, so there's nothing to send.",
			);
		}

		const [published] = await tx
			.select({ id: verseTextRevisions.id })
			.from(verseTextRevisions)
			.where(
				and(
					eq(verseTextRevisions.translationId, translation.id),
					eq(verseTextRevisions.verseId, row.verseId),
					eq(verseTextRevisions.status, "published"),
				),
			);

		const now = new Date();
		await tx.insert(verseTextRevisions).values({
			basedOnRevisionId: published?.id ?? null,
			checkedAgainst: input.checkedAgainst.trim() || null,
			correctionReason: reason,
			enteredByUserId: input.actorUserId,
			status: "submitted",
			submittedAt: now,
			text,
			translationId: translation.id,
			verseId: row.verseId,
		});
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "verse_text.corrected",
			targetType: "verse",
			targetId: row.verseId,
			details: {
				name: `${book.name} ${chapter.number}:${row.number} · ${translation.abbreviation}`,
				reason,
			},
		});
	});
}

/** One verse in all six translations, with its history. Returns null when there's no such verse. */
export async function getVerseAcrossTranslations(
	client: DbExecutor,
	input: { chapter: number; slug: string; verse: number },
	viewerUserId: string,
) {
	const supported = await listSupportedTranslations(client);
	const anchor = supported[0];
	if (!anchor) return null;

	const [location] = await client
		.select({
			bookName: books.name,
			bookSlug: books.slug,
			shortName: books.shortName,
			chapterId: chapters.id,
			verseId: verses.id,
			versification: versificationSystems.name,
		})
		.from(verses)
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(books, eq(books.id, chapters.bookId))
		.innerJoin(
			versificationSystems,
			eq(versificationSystems.id, chapters.versificationSystemId),
		)
		.where(
			and(
				eq(books.slug, input.slug),
				eq(chapters.versificationSystemId, anchor.versificationSystemId),
				eq(chapters.number, input.chapter),
				eq(verses.number, input.verse),
			),
		);
	if (!location) return null;

	const perTranslation = [];
	for (const translation of supported) {
		const rows = await loadChapterVerses(
			client,
			location.chapterId,
			translation.id,
		);
		const row = rows.find(({ number }) => number === input.verse);
		perTranslation.push({
			abbreviation: translation.abbreviation,
			name: translation.name,
			status: row?.status ?? ("empty" as const),
			publishedText: row?.publishedText ?? null,
			revisionText: row?.revisionText ?? null,
			enteredByName: row?.enteredByName ?? null,
			enteredByMe: row?.enteredByUserId === viewerUserId,
			correctionReason: row?.correctionReason ?? null,
			presenceKind: (row?.presenceKind ?? null) as VersePresenceKind | null,
			includedInVerse: row?.includedInVerse ?? null,
			needsOwnText: row?.needsOwnText ?? true,
		});
	}

	const position = sql`(${chapters.number}, ${verses.number})`;
	const here = sql`(${input.chapter}::smallint, ${input.verse}::integer)`;
	const neighbour = (direction: "after" | "before") =>
		client
			.select({ chapter: chapters.number, verse: verses.number })
			.from(verses)
			.innerJoin(chapters, eq(chapters.id, verses.chapterId))
			.innerJoin(books, eq(books.id, chapters.bookId))
			.where(
				and(
					eq(books.slug, input.slug),
					eq(chapters.versificationSystemId, anchor.versificationSystemId),
					direction === "after"
						? sql`${position} > ${here}`
						: sql`${position} < ${here}`,
				),
			)
			.orderBy(
				direction === "after" ? asc(chapters.number) : desc(chapters.number),
				direction === "after" ? asc(verses.number) : desc(verses.number),
			)
			.limit(1);
	const [previous] = await neighbour("before");
	const [next] = await neighbour("after");

	return {
		reference: `${location.bookName} ${input.chapter}:${input.verse}`,
		verseCode: `${location.shortName?.toUpperCase() ?? location.bookSlug}.${input.chapter}.${input.verse}`,
		book: { name: location.bookName, slug: location.bookSlug },
		chapter: input.chapter,
		verse: input.verse,
		versification: location.versification,
		previous: previous ?? null,
		next: next ?? null,
		translations: perTranslation,
		publishedIn: perTranslation.filter(({ publishedText }) => publishedText)
			.length,
		linked: await linkedContentCounts(client, location.verseId),
		history: await verseHistory(client, location.verseId),
	};
}

/** What has happened to a verse's text, newest first. Names are read live. */
async function verseHistory(client: DbExecutor, verseId: number) {
	const enterer = alias(user, "enterer");
	const proofreader = alias(user, "proofreader");
	const publisher = alias(user, "publisher");
	const revisions = await client
		.select({
			abbreviation: translations.abbreviation,
			reason: verseTextRevisions.correctionReason,
			createdAt: verseTextRevisions.createdAt,
			enteredBy: enterer.name,
			proofreadAt: verseTextRevisions.proofreadAt,
			proofreadBy: proofreader.name,
			proofMark: verseTextRevisions.proofMark,
			publishedAt: verseTextRevisions.publishedAt,
			publishedBy: publisher.name,
		})
		.from(verseTextRevisions)
		.innerJoin(
			translations,
			eq(translations.id, verseTextRevisions.translationId),
		)
		.innerJoin(enterer, eq(enterer.id, verseTextRevisions.enteredByUserId))
		.leftJoin(
			proofreader,
			eq(proofreader.id, verseTextRevisions.proofreadByUserId),
		)
		.leftJoin(publisher, eq(publisher.id, verseTextRevisions.publishedByUserId))
		.where(eq(verseTextRevisions.verseId, verseId));

	const events = revisions.flatMap((revision) => {
		const list = [
			{
				at: revision.createdAt,
				by: revision.enteredBy,
				label: revision.reason
					? `${revision.abbreviation}: correction proposed. ${revision.reason}`
					: `${revision.abbreviation}: entered`,
			},
		];
		if (
			revision.proofreadAt &&
			revision.proofreadBy &&
			revision.proofMark === "matches"
		) {
			list.push({
				at: revision.proofreadAt,
				by: revision.proofreadBy,
				label: `${revision.abbreviation}: proofread`,
			});
		}
		if (revision.publishedAt && revision.publishedBy) {
			list.push({
				at: revision.publishedAt,
				by: revision.publishedBy,
				label: `${revision.abbreviation}: published`,
			});
		}
		return list;
	});
	return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
