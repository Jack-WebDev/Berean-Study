import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { recordAudit } from "./audit";
import { isBeyondProtestantCanon } from "./canon-limits";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { createNotification } from "./notifications";
import { user } from "./schema/auth";
import { books } from "./schema/books";
import { chapters } from "./schema/chapters";
import { translations } from "./schema/translations";
import { verseTextRevisions } from "./schema/verse_text_revisions";
import { verseTexts } from "./schema/verse_texts";
import { verses } from "./schema/verses";
import { translationCatalogue } from "./scripture-catalogue";
import {
	type ChapterAddress,
	chapterName,
	currentPublishingBlock,
	loadChapterVerses,
	lockChapter,
	resolveChapter,
	versesBlockingPublication,
} from "./verse-text-rows";
import { formatVerseList } from "./verse-text-tools";

const blockMessages = {
	permission_not_recorded: (abbreviation: string) =>
		`${abbreviation} can't be published until the rights holder's permission is recorded on the Translations page.`,
	licence_ended: (abbreviation: string) =>
		`The licence for ${abbreviation} has ended, so it can't be published until it's renewed.`,
};

export function publishingBlockMessage(
	block: keyof typeof blockMessages,
	abbreviation: string,
) {
	return blockMessages[block](abbreviation);
}

function entryAddress(address: ChapterAddress) {
	const search = new URLSearchParams({
		book: address.slug,
		chapter: String(address.chapter),
		t: address.abbreviation,
	});
	return `/work/scripture?${search}`;
}

/** Everything a proofreader needs for one chapter of one translation. */
export async function getProofreadingChapter(
	client: DbExecutor,
	address: ChapterAddress,
	viewerUserId: string,
) {
	const { book, chapter, translation } = await resolveChapter(client, address);
	const rows = await loadChapterVerses(client, chapter.id, translation.id);
	const inProofreading = rows.filter(({ status }) =>
		["submitted", "needs_fix", "proofread"].includes(status),
	);
	const round = rows.filter(({ status }) => status === "submitted");
	const needingText = rows.filter(({ needsOwnText }) => needsOwnText);
	const withText = needingText.filter(
		({ status }) => status !== "empty",
	).length;
	const enterers = [
		...new Set(inProofreading.flatMap((row) => row.enteredByName ?? [])),
	];

	return {
		book: { name: book.name, slug: book.slug },
		chapter: chapter.number,
		noTextSourceYet: await isBeyondProtestantCanon(
			client,
			book.id,
			chapter.number,
		),
		translation: {
			abbreviation: translation.abbreviation,
			name: translation.name,
			publishingBlock: currentPublishingBlock(translation),
		},
		enterers,
		verses: inProofreading.map((row) => ({
			number: row.number,
			status: row.status,
			text: row.revisionText ?? "",
			publishedText: row.publishedText,
			enteredByName: row.enteredByName,
			enteredByMe: row.enteredByUserId === viewerUserId,
			proofMark: row.proofMark,
			proofreadByName: row.proofreadByName,
			proofreadByMe: row.proofreadByUserId === viewerUserId,
			suggestedText: row.suggestedText,
			proofNote: row.proofNote,
			correctionReason: row.correctionReason,
			checkedAgainst: row.checkedAgainst,
		})),
		progress: {
			checked: round.filter(({ proofMark }) => proofMark !== null).length,
			needFix: round.filter(({ proofMark }) => proofMark === "needs_fix")
				.length,
			total: round.length,
		},
		viewerHasChecked: round.some(
			({ proofreadByUserId }) => proofreadByUserId === viewerUserId,
		),
		passedVerses: rows.filter(({ status }) => status === "proofread").length,
		versesBlockingPublication: versesBlockingPublication(rows),
		verseCount: { entered: withText, total: needingText.length },
	};
}

export type ProofMarkInput =
	| { mark: "matches" }
	| { mark: "needs_fix"; note: string; suggestedText: string }
	| { mark: null };

/** Records one verse's result. Marks are kept, so a long chapter can be checked over several sittings. */
export async function markVerse(
	client: DbExecutor,
	input: ChapterAddress & {
		actorUserId: string;
		result: ProofMarkInput;
		verse: number;
	},
) {
	await client.transaction(async (tx) => {
		const { chapter, translation } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);

		const rows = await loadChapterVerses(tx, chapter.id, translation.id);
		const row = rows.find(({ number }) => number === input.verse);
		if (row?.status !== "submitted" || row.revisionId === null) {
			throw new GovernanceError(
				`Verse ${input.verse} isn't waiting for proofreading any more.`,
			);
		}
		if (row.enteredByUserId === input.actorUserId) {
			throw new GovernanceError(
				"You entered this verse, so someone else has to proofread it.",
			);
		}

		const { result } = input;
		if (result.mark === null) {
			await tx
				.update(verseTextRevisions)
				.set({
					proofMark: null,
					proofNote: null,
					proofreadAt: null,
					proofreadByUserId: null,
					suggestedText: null,
					updatedAt: new Date(),
				})
				.where(eq(verseTextRevisions.id, row.revisionId));
			return;
		}

		let suggestedText: string | null = null;
		let proofNote: string | null = null;
		if (result.mark === "needs_fix") {
			const suggested = result.suggestedText.trim();
			proofNote = result.note.trim() || null;
			suggestedText =
				suggested && suggested !== row.revisionText ? suggested : null;
			if (!suggestedText && !proofNote) {
				throw new GovernanceError(
					"Type the corrected wording or add a note, so the person who entered it knows what to fix.",
				);
			}
		}

		const now = new Date();
		await tx
			.update(verseTextRevisions)
			.set({
				proofMark: result.mark,
				proofNote,
				proofreadAt: now,
				proofreadByUserId: input.actorUserId,
				suggestedText,
				updatedAt: now,
			})
			.where(eq(verseTextRevisions.id, row.revisionId));
	});
}

/**
 * Returns the verses marked as needing a fix. The rest of the chapter keeps its
 * marks, so only what changes has to be checked again.
 */
export async function sendBackVerses(
	client: DbExecutor,
	input: ChapterAddress & { actorUserId: string },
) {
	return client.transaction(async (tx) => {
		const { book, chapter, translation } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);

		const rows = await loadChapterVerses(tx, chapter.id, translation.id);
		const toReturn = rows.filter(
			(row) => row.status === "submitted" && row.proofMark === "needs_fix",
		);
		if (toReturn.length === 0) {
			throw new GovernanceError("No verses here are marked as needing a fix.");
		}

		// Each row keeps the proofreader who marked it, who may not be who pressed this.
		for (const row of toReturn) {
			await tx
				.update(verseTextRevisions)
				.set({
					returnedByUserId: row.proofreadByUserId,
					status: "needs_fix",
					updatedAt: new Date(),
				})
				.where(eq(verseTextRevisions.id, row.revisionId as number));
		}

		const numbers = toReturn.map(({ number }) => number);
		const name = chapterName(book, chapter, translation);
		const enterers = new Set(
			toReturn.flatMap(({ enteredByUserId }) => enteredByUserId ?? []),
		);
		for (const userId of enterers) {
			if (userId === input.actorUserId) continue;
			const theirs = toReturn
				.filter(({ enteredByUserId }) => enteredByUserId === userId)
				.map(({ number }) => number);
			await createNotification(tx, {
				userId,
				kind: "scripture_sent_back",
				title: `Verses to fix in ${name}`,
				body: `Verses ${formatVerseList(theirs)} came back from proofreading with notes.`,
				destination: entryAddress(input),
			});
		}

		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "verse_text.sent_back",
			targetType: "chapter",
			targetId: chapter.id,
			details: { name, verses: numbers },
		});
		return { sent: numbers.length };
	});
}

async function publishChapterInTransaction(
	tx: DbExecutor,
	input: ChapterAddress & { actorUserId: string },
) {
	const { book, chapter, translation } = await resolveChapter(tx, input);
	await lockChapter(tx, chapter.id);

	const block = currentPublishingBlock(translation);
	if (block) {
		throw new GovernanceError(
			publishingBlockMessage(block, translation.abbreviation),
		);
	}

	const rows = await loadChapterVerses(tx, chapter.id, translation.id);
	const passed = rows.filter(({ status }) => status === "proofread");
	if (passed.length === 0) {
		throw new GovernanceError(
			"Nothing in this chapter has passed proofreading.",
		);
	}
	const blocking = versesBlockingPublication(rows);
	if (blocking.length > 0) {
		throw new GovernanceError(
			`Readers would see gaps: verses ${formatVerseList(blocking)} haven't passed proofreading yet.`,
		);
	}

	const now = new Date();
	for (const row of passed) {
		await tx
			.update(verseTextRevisions)
			.set({ status: "superseded", updatedAt: now })
			.where(
				and(
					eq(verseTextRevisions.translationId, translation.id),
					eq(verseTextRevisions.verseId, row.verseId),
					eq(verseTextRevisions.status, "published"),
				),
			);
		await tx
			.update(verseTextRevisions)
			.set({
				publishedAt: now,
				publishedByUserId: input.actorUserId,
				status: "published",
				updatedAt: now,
			})
			.where(eq(verseTextRevisions.id, row.revisionId as number));
		await tx
			.insert(verseTexts)
			.values({
				text: row.revisionText as string,
				translationId: translation.id,
				verseId: row.verseId,
			})
			.onConflictDoUpdate({
				target: [verseTexts.translationId, verseTexts.verseId],
				set: { text: row.revisionText as string },
			});
	}

	const numbers = passed.map(({ number }) => number);
	await recordAudit(tx, {
		actorUserId: input.actorUserId,
		action: "verse_text.published",
		targetType: "chapter",
		targetId: chapter.id,
		details: {
			name: chapterName(book, chapter, translation),
			revisionIds: passed.map(({ revisionId }) => revisionId),
			verses: numbers,
		},
	});
	return { published: numbers.length };
}

/** Copies a chapter's proofread text to where readers see it. */
export async function publishChapter(
	client: DbExecutor,
	input: ChapterAddress & { actorUserId: string },
) {
	return client.transaction((tx) => publishChapterInTransaction(tx, input));
}

/**
 * Passes the verses in this round once all are checked and none need a fix. With
 * `publish`, the chapter also goes live, and nothing changes if it can't.
 */
export async function passChapter(
	client: DbExecutor,
	input: ChapterAddress & { actorUserId: string; publish: boolean },
) {
	return client.transaction(async (tx) => {
		const { book, chapter, translation } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);

		const rows = await loadChapterVerses(tx, chapter.id, translation.id);
		const round = rows.filter(({ status }) => status === "submitted");
		if (round.length === 0) {
			throw new GovernanceError(
				"Nothing in this chapter is waiting for proofreading.",
			);
		}
		const unchecked = round.filter(({ proofMark }) => proofMark === null);
		if (unchecked.length > 0) {
			throw new GovernanceError(
				`Verses ${formatVerseList(unchecked.map(({ number }) => number))} haven't been checked yet.`,
			);
		}
		if (round.some(({ proofMark }) => proofMark === "needs_fix")) {
			throw new GovernanceError(
				"Some verses need a fix. Send them back before passing the chapter.",
			);
		}
		// Otherwise the person who entered the text could pass it on someone else's
		// checks, without having read any of it themselves.
		if (
			!round.some(
				({ proofreadByUserId }) => proofreadByUserId === input.actorUserId,
			)
		) {
			throw new GovernanceError(
				"Check at least one verse yourself before passing this chapter.",
			);
		}

		await tx
			.update(verseTextRevisions)
			.set({ status: "proofread", updatedAt: new Date() })
			.where(
				inArray(
					verseTextRevisions.id,
					round.flatMap(({ revisionId }) => revisionId ?? []),
				),
			);
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "verse_text.proofread",
			targetType: "chapter",
			targetId: chapter.id,
			details: {
				name: chapterName(book, chapter, translation),
				verses: round.map(({ number }) => number),
			},
		});

		if (input.publish) await publishChapterInTransaction(tx, input);
		return { passed: round.length };
	});
}

/**
 * Undoes a pass before anything reaches readers, for when a passed verse turns out
 * to be wrong. The verses go back to being checked with their marks kept, so a
 * long chapter doesn't have to be read again to change one verse.
 */
export async function reopenChapter(
	client: DbExecutor,
	input: ChapterAddress & { actorUserId: string; reason: string },
) {
	const reason = input.reason.trim();
	if (!reason) {
		throw new GovernanceError("Say why this chapter needs checking again.");
	}

	return client.transaction(async (tx) => {
		const { book, chapter, translation } = await resolveChapter(tx, input);
		await lockChapter(tx, chapter.id);

		const rows = await loadChapterVerses(tx, chapter.id, translation.id);
		const passed = rows.filter(({ status }) => status === "proofread");
		if (passed.length === 0) {
			throw new GovernanceError(
				"Nothing in this chapter is waiting to be published.",
			);
		}

		await tx
			.update(verseTextRevisions)
			.set({ status: "submitted", updatedAt: new Date() })
			.where(
				inArray(
					verseTextRevisions.id,
					passed.flatMap(({ revisionId }) => revisionId ?? []),
				),
			);

		const name = chapterName(book, chapter, translation);
		const proofreaders = new Set(
			passed.flatMap(({ proofreadByUserId }) => proofreadByUserId ?? []),
		);
		for (const userId of proofreaders) {
			if (userId === input.actorUserId) continue;
			await createNotification(tx, {
				userId,
				kind: "scripture_reopened",
				title: `${name} needs checking again`,
				body: reason,
				destination: `/work/scripture/proofreading/${input.abbreviation}/${input.slug}/${input.chapter}`,
			});
		}

		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "verse_text.reopened",
			targetType: "chapter",
			targetId: chapter.id,
			details: {
				name,
				reason,
				verses: passed.map(({ number }) => number),
			},
		});
		return { reopened: passed.length };
	});
}

const catalogueAbbreviations = translationCatalogue.map(
	({ abbreviation }) => abbreviation,
);

/** Every chapter with text somewhere between entry and publication, one row per verse. */
async function loadVersesInProgress(client: DbExecutor) {
	const enterer = alias(user, "enterer");
	return client
		.select({
			abbreviation: translations.abbreviation,
			translationId: translations.id,
			bookName: books.name,
			slug: books.slug,
			chapter: chapters.number,
			chapterId: chapters.id,
			status: verseTextRevisions.status,
			proofMark: verseTextRevisions.proofMark,
			enteredByUserId: verseTextRevisions.enteredByUserId,
			enteredByName: enterer.name,
		})
		.from(verseTextRevisions)
		.innerJoin(
			translations,
			eq(translations.id, verseTextRevisions.translationId),
		)
		.innerJoin(verses, eq(verses.id, verseTextRevisions.verseId))
		.innerJoin(chapters, eq(chapters.id, verses.chapterId))
		.innerJoin(books, eq(books.id, chapters.bookId))
		.innerJoin(enterer, eq(enterer.id, verseTextRevisions.enteredByUserId))
		.where(
			and(
				inArray(verseTextRevisions.status, [
					"submitted",
					"needs_fix",
					"proofread",
				]),
				inArray(translations.abbreviation, catalogueAbbreviations),
			),
		)
		.orderBy(asc(books.id), asc(chapters.number), asc(translations.id));
}

type VerseInProgress = Awaited<ReturnType<typeof loadVersesInProgress>>[number];

function groupByChapter(rows: readonly VerseInProgress[]) {
	const groups = new Map<string, VerseInProgress[]>();
	for (const row of rows) {
		const key = `${row.translationId}:${row.chapterId}`;
		groups.set(key, [...(groups.get(key) ?? []), row]);
	}
	return [...groups.values()];
}

function chapterSummary(group: readonly VerseInProgress[]) {
	const first = group[0] as VerseInProgress;
	return {
		abbreviation: first.abbreviation,
		bookName: first.bookName,
		slug: first.slug,
		chapter: first.chapter,
	};
}

/**
 * Chapters that have passed proofreading, with what's still in the way of each.
 * Only chapters with passed verses appear, so this stays short however much of
 * the Bible has been entered.
 */
export async function listChaptersReadyToPublish(client: DbExecutor) {
	const rows = await loadVersesInProgress(client);
	const passed = groupByChapter(rows).filter((group) =>
		group.some(({ status }) => status === "proofread"),
	);

	const ready = [];
	for (const group of passed) {
		const first = group[0] as VerseInProgress;
		const [translation] = await client
			.select()
			.from(translations)
			.where(eq(translations.id, first.translationId));
		const chapterVerses = await loadChapterVerses(
			client,
			first.chapterId,
			first.translationId,
		);
		ready.push({
			...chapterSummary(group),
			passedVerses: group.filter(({ status }) => status === "proofread").length,
			publishingBlock: translation ? currentPublishingBlock(translation) : null,
			versesBlockingPublication: versesBlockingPublication(chapterVerses),
		});
	}
	return ready;
}

/** The chapters in proofreading, and which are waiting on this person. */
export async function listProofreadingQueue(
	client: DbExecutor,
	viewerUserId: string,
) {
	const groups = groupByChapter(await loadVersesInProgress(client));

	const waiting = groups.flatMap((group) => {
		const round = group.filter(({ status }) => status === "submitted");
		if (round.length === 0) return [];
		return [
			{
				...chapterSummary(group),
				enterers: [...new Set(round.map((row) => row.enteredByName))],
				total: round.length,
				checked: round.filter(({ proofMark }) => proofMark !== null).length,
				needFix: round.filter(({ proofMark }) => proofMark === "needs_fix")
					.length,
				canCheck: round.filter(
					(row) =>
						row.enteredByUserId !== viewerUserId && row.proofMark === null,
				).length,
			},
		];
	});

	const sentBack = groups.flatMap((group) => {
		const returned = group.filter(({ status }) => status === "needs_fix");
		if (returned.length === 0) return [];
		return [
			{
				...chapterSummary(group),
				verses: returned.length,
				mine: returned.some(
					({ enteredByUserId }) => enteredByUserId === viewerUserId,
				),
				enterers: [...new Set(returned.map((row) => row.enteredByName))],
			},
		];
	});

	return { sentBack, waiting };
}

/** Chapters that need something from this person, for the sidebar count. */
export async function countChaptersWaitingOnPerson(
	client: DbExecutor,
	viewer: { canProofread: boolean; userId: string },
) {
	const groups = groupByChapter(await loadVersesInProgress(client));
	return groups.filter((group) =>
		group.some(
			(row) =>
				(viewer.canProofread &&
					row.status === "submitted" &&
					row.proofMark === null &&
					row.enteredByUserId !== viewer.userId) ||
				(row.status === "needs_fix" && row.enteredByUserId === viewer.userId),
		),
	).length;
}

/** Chapters that could go live right now, for the sidebar count. */
export async function countChaptersReadyToPublish(client: DbExecutor) {
	const chapters = await listChaptersReadyToPublish(client);
	return chapters.filter(
		(chapter) =>
			!chapter.publishingBlock &&
			chapter.versesBlockingPublication.length === 0,
	).length;
}
