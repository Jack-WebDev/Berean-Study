import { and, eq } from "drizzle-orm";
import type { TranslationHandling } from "./change-kinds/translation-handling";
import { handlingLabel, isOwnVerse } from "./change-kinds/translation-handling";
import {
	chapterVerseNumbers,
	structureChapter,
	verseAdditionKind,
	verseAdditionPayload,
	verseAdditionReference,
} from "./change-kinds/verse-addition";
import {
	currentVerseHandling,
	sameHandling,
	verseHandlingKind,
	verseHandlingPayload,
} from "./change-kinds/verse-handling";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { user } from "./schema/auth";
import { books } from "./schema/books";
import { changeProposals } from "./schema/change_proposals";
import { verses } from "./schema/verses";
import { linkedContentCounts } from "./scripture-data";
import { listProposals, proposeChange } from "./two-person";

export type { TranslationHandling };

const structureKinds = ["verse_addition", "verse_handling"] as const;

/** Proposes adding verses at the end of a chapter. Nothing else can move. */
export async function proposeVerseAddition(
	client: DbExecutor,
	input: {
		actorUserId: string;
		chapter: number;
		handling: TranslationHandling[];
		lastVerse: number;
		reason: string;
		slug: string;
	},
) {
	const { chapter } = await structureChapter(client, input.slug, input.chapter);
	const numbers = await chapterVerseNumbers(client, chapter.id);

	return proposeChange(client, {
		kind: "verse_addition",
		payload: {
			bookSlug: input.slug,
			chapter: input.chapter,
			firstVerse: (numbers[0] ?? 0) + 1,
			handling: input.handling,
			lastVerse: input.lastVerse,
		},
		proposerUserId: input.actorUserId,
		reason: input.reason,
	});
}

/** Proposes a different answer for how the six translations handle one verse. */
export async function proposeVerseHandling(
	client: DbExecutor,
	input: {
		actorUserId: string;
		chapter: number;
		handling: TranslationHandling[];
		reason: string;
		slug: string;
		verse: number;
	},
) {
	const before = await currentVerseHandling(client, {
		bookSlug: input.slug,
		chapter: input.chapter,
		verse: input.verse,
	});
	if (sameHandling(input.handling, before.rows)) {
		throw new GovernanceError("Nothing changes, so there's nothing to send.");
	}

	return proposeChange(client, {
		kind: "verse_handling",
		payload: {
			after: input.handling,
			before: before.rows.map(({ abbreviation, includedInVerse, kind }) => ({
				abbreviation,
				includedInVerse,
				kind,
			})),
			bookSlug: input.slug,
			chapter: input.chapter,
			verse: input.verse,
		},
		proposerUserId: input.actorUserId,
		reason: input.reason,
	});
}

/** Structure changes waiting for a second Superadmin. */
export async function listStructureChanges(
	client: DbExecutor,
	viewerUserId: string,
) {
	const proposals = await listProposals(client, {
		kinds: structureKinds,
		status: "proposed",
	});
	return proposals.map(({ createdAt, description, id, proposerUserId }) => ({
		createdAt,
		description,
		id,
		proposedByMe: proposerUserId === viewerUserId,
	}));
}

/** How the six translations handle a verse now. Returns null when there's no such verse. */
export async function getVerseHandling(
	client: DbExecutor,
	input: { chapter: number; slug: string; verse: number },
) {
	const [book] = await client
		.select({ name: books.name })
		.from(books)
		.where(eq(books.slug, input.slug));
	if (!book) return null;

	try {
		const { chapterId, rows } = await currentVerseHandling(client, {
			bookSlug: input.slug,
			chapter: input.chapter,
			verse: input.verse,
		});
		return {
			otherVerses: (await chapterVerseNumbers(client, chapterId))
				.filter((number) => number !== input.verse)
				.sort((a, b) => a - b),
			reference: `${book.name} ${input.chapter}:${input.verse}`,
			rows,
		};
	} catch (error) {
		if (error instanceof GovernanceError) return null;
		throw error;
	}
}

/** Whether what's proposed could still be applied, in words the decider can act on. */
async function stillAllowedCheck(check: () => Promise<void>) {
	try {
		await check();
		return { ok: true, text: "Still fits the Scripture as it stands now" };
	} catch (error) {
		if (!(error instanceof GovernanceError)) throw error;
		return { ok: false, text: error.message };
	}
}

function proposerCheck(proposedByMe: boolean) {
	return proposedByMe
		? {
				ok: false,
				text: "You proposed this, so a different Superadmin has to confirm it",
			}
		: { ok: true, text: "Proposer and confirmer are different people" };
}

async function linksOnVerseCheck(
	client: DbExecutor,
	input: { chapterId: number; verse: number },
) {
	const [neighbour] = await client
		.select({ id: verses.id })
		.from(verses)
		.where(
			and(
				eq(verses.chapterId, input.chapterId),
				eq(verses.number, input.verse),
			),
		);
	if (!neighbour) return null;
	const { commentary, crossReferences, themes } = await linkedContentCounts(
		client,
		neighbour.id,
	);
	const links = commentary + crossReferences + themes;
	return links > 0
		? {
				ok: false,
				text: `${links} linked ${links === 1 ? "item" : "items"} on verse ${input.verse} to review afterwards`,
			}
		: { ok: true, text: `No linked content on verse ${input.verse} to review` };
}

/** Everything the second Superadmin needs to decide one structure change. */
export async function getStructureChange(
	client: DbExecutor,
	proposalId: number,
	viewerUserId: string,
) {
	const [proposal] = await client
		.select()
		.from(changeProposals)
		.where(eq(changeProposals.id, proposalId));
	if (
		!proposal ||
		!(structureKinds as readonly string[]).includes(proposal.kind)
	) {
		return null;
	}

	const [proposer] = await client
		.select({ name: user.name })
		.from(user)
		.where(eq(user.id, proposal.proposerUserId));
	const [decider] = proposal.decidedByUserId
		? await client
				.select({ name: user.name })
				.from(user)
				.where(eq(user.id, proposal.decidedByUserId))
		: [];
	const proposedByMe = proposal.proposerUserId === viewerUserId;
	const isOpen = proposal.status === "proposed";

	const shared = {
		createdAt: proposal.createdAt,
		decidedAt: proposal.decidedAt,
		deciderName: decider?.name ?? null,
		decisionNote: proposal.decisionNote,
		id: proposal.id,
		proposedByMe,
		proposerName: proposer?.name ?? "Someone",
		reason: proposal.reason,
		status: proposal.status,
	};

	if (proposal.kind === "verse_addition") {
		const payload = verseAdditionPayload.parse(proposal.payload);
		const [book] = await client
			.select({ name: books.name, slug: books.slug })
			.from(books)
			.where(eq(books.slug, payload.bookSlug));
		const bookName = book?.name ?? payload.bookSlug;
		const single = payload.firstVerse === payload.lastVerse;
		const chapterName = `${bookName} ${payload.chapter}`;
		const ownCount = payload.handling.filter(({ kind }) =>
			isOwnVerse(kind),
		).length;
		const { chapter } = await structureChapter(
			client,
			payload.bookSlug,
			payload.chapter,
		);
		const checks = [
			{ ok: true, text: "Added at the end, so no verse is renumbered" },
			{ ok: true, text: "All six translations have an answer" },
			{
				ok: true,
				text: `Empty verse slots appear in Scripture entry for ${ownCount} translations`,
			},
			proposerCheck(proposedByMe),
			await linksOnVerseCheck(client, {
				chapterId: chapter.id,
				verse: payload.firstVerse - 1,
			}),
			isOpen
				? await stillAllowedCheck(() =>
						verseAdditionKind.assertAllowed(client, payload),
					)
				: null,
		];
		return {
			...shared,
			after: `${chapterName} · ${payload.lastVerse} verses`,
			before: `${chapterName} · ${payload.firstVerse - 1} verses`,
			bookSlug: payload.bookSlug,
			chapter: payload.chapter,
			checks: checks.filter((check) => check !== null),
			title: `Add ${single ? "verse" : "verses"} ${verseAdditionReference(bookName, payload)}`,
			translations: payload.handling.map((handling) => ({
				abbreviation: handling.abbreviation,
				label: handlingLabel(handling, "Own verse, text entered afterwards"),
				previous: null,
			})),
		};
	}

	const payload = verseHandlingPayload.parse(proposal.payload);
	const [book] = await client
		.select({ name: books.name })
		.from(books)
		.where(eq(books.slug, payload.bookSlug));
	const reference = `${book?.name ?? payload.bookSlug} ${payload.chapter}:${payload.verse}`;
	const ownLabel = "Own verse";
	const checks = [
		{ ok: true, text: "No verse is renumbered" },
		{ ok: true, text: "All six translations have an answer" },
		proposerCheck(proposedByMe),
		isOpen
			? await stillAllowedCheck(() =>
					verseHandlingKind.assertAllowed(client, payload),
				)
			: null,
	];
	return {
		...shared,
		after: null,
		before: null,
		bookSlug: payload.bookSlug,
		chapter: payload.chapter,
		checks: checks.filter((check) => check !== null),
		title: `Change how translations handle ${reference}`,
		translations: payload.after.map((handling) => {
			const previous = payload.before.find(
				({ abbreviation }) => abbreviation === handling.abbreviation,
			);
			const label = handlingLabel(handling, ownLabel);
			const previousLabel = previous ? handlingLabel(previous, ownLabel) : null;
			return {
				abbreviation: handling.abbreviation,
				label,
				previous: previousLabel === label ? null : previousLabel,
			};
		}),
	};
}
