import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import type { DbExecutor } from "../src/db-executor";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import { getStaffQueueCounts } from "../src/staff-queues";
import {
	getStructureChange,
	listStructureChanges,
	proposeVerseAddition,
	proposeVerseHandling,
	type TranslationHandling,
} from "../src/structure-admin";
import { decideChange } from "../src/two-person";
import {
	addChapter,
	addVerse,
	getEntryChapter,
	saveVerseDrafts,
	sendChapterForProofreading,
} from "../src/verse-entry";
import {
	markVerse,
	passChapter,
	publishChapter,
} from "../src/verse-proofreading";
import {
	createPerson,
	inRolledBackTransactionWithoutScripture,
	withFreshCatalogue,
} from "./governance-helpers";

const thirdJohn = { chapter: 1, slug: "3-john" };

/** How 3 John 1:15 really differs: KJV and NKJV keep it inside verse 14. */
const greetingHandling: TranslationHandling[] = [
	{ abbreviation: "KJV", kind: "included_in", includedInVerse: 14 },
	{ abbreviation: "NKJV", kind: "included_in", includedInVerse: 14 },
	{ abbreviation: "ESV", kind: "own" },
	{ abbreviation: "NIV", kind: "own" },
	{ abbreviation: "NLT", kind: "own" },
	{ abbreviation: "NASB", kind: "own" },
];

const everyoneHasIt: TranslationHandling[] = greetingHandling.map(
	({ abbreviation }) => ({ abbreviation, kind: "own" }),
);

async function setUp(tx: DbExecutor) {
	await withFreshCatalogue(tx);
	await applyScriptureCatalogue(tx);
	const people = {
		first: await createPerson(tx, "Superadmin"),
		second: await createPerson(tx, "Superadmin"),
		contributor: await createPerson(tx, "Contributor"),
	};
	const address = { ...thirdJohn, abbreviation: "KJV" };
	await addChapter(tx, {
		abbreviation: "KJV",
		actorUserId: people.contributor.id,
		slug: "3-john",
	});
	for (let verse = 1; verse <= 14; verse += 1) {
		await addVerse(tx, { ...address, actorUserId: people.contributor.id });
	}
	return people;
}

function confirm(tx: DbExecutor, proposalId: number, deciderUserId: string) {
	return decideChange(tx, {
		decision: "confirm",
		deciderUserId,
		note: "Checked in printed editions.",
		proposalId,
	});
}

function proposeGreeting(tx: DbExecutor, actorUserId: string) {
	return proposeVerseAddition(tx, {
		...thirdJohn,
		actorUserId,
		handling: greetingHandling,
		lastVerse: 15,
		reason: "ESV, NIV, NLT and NASB print verse 15 on its own",
	});
}

async function verseFifteen(
	tx: DbExecutor,
	abbreviation: string,
	viewerUserId: string,
) {
	const entry = await getEntryChapter(
		tx,
		{ ...thirdJohn, abbreviation },
		viewerUserId,
	);
	return entry?.verses.find(({ number }) => number === 15);
}

afterAll(async () => {
	await pool.end();
});

describe("adding verses through a structure change", () => {
	it("adds nothing until a second Superadmin confirms", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);

			const proposalId = await proposeGreeting(tx, first.id);
			expect(await verseFifteen(tx, "ESV", first.id)).toBeUndefined();
			await expect(confirm(tx, proposalId, first.id)).rejects.toThrow(
				"someone else has to decide",
			);

			await confirm(tx, proposalId, second.id);
			expect((await verseFifteen(tx, "ESV", first.id))?.needsOwnText).toBe(
				true,
			);
		});
	});

	it("records how each translation handles the new verse", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			await confirm(tx, await proposeGreeting(tx, first.id), second.id);

			const kjv = await verseFifteen(tx, "KJV", first.id);
			expect(kjv).toMatchObject({
				includedInVerse: 14,
				needsOwnText: false,
				presenceKind: "included_in",
			});
		});
	});

	it("adds several verses at once", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			await confirm(
				tx,
				await proposeVerseAddition(tx, {
					...thirdJohn,
					actorUserId: first.id,
					handling: everyoneHasIt,
					lastVerse: 17,
					reason: "Reason",
				}),
				second.id,
			);

			const entry = await getEntryChapter(
				tx,
				{ ...thirdJohn, abbreviation: "ESV" },
				first.id,
			);
			expect(entry?.verses.at(-1)?.number).toBe(17);
		});
	});

	it("needs an answer from all six translations", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first } = await setUp(tx);
			await expect(
				proposeVerseAddition(tx, {
					...thirdJohn,
					actorUserId: first.id,
					handling: greetingHandling.slice(1),
					lastVerse: 15,
					reason: "Reason",
				}),
			).rejects.toThrow("all six");
		});
	});

	it("refuses to point a translation at a verse that doesn't exist", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first } = await setUp(tx);
			await expect(
				proposeVerseAddition(tx, {
					...thirdJohn,
					actorUserId: first.id,
					handling: [
						{ abbreviation: "KJV", kind: "included_in", includedInVerse: 40 },
						...everyoneHasIt.slice(1),
					],
					lastVerse: 15,
					reason: "Reason",
				}),
			).rejects.toThrow("verse 40");
		});
	});

	it("can't be applied once the chapter has moved on, so nothing renumbers", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { contributor, first, second } = await setUp(tx);
			const proposalId = await proposeGreeting(tx, first.id);

			await addVerse(tx, {
				...thirdJohn,
				abbreviation: "KJV",
				actorUserId: contributor.id,
			});

			await expect(confirm(tx, proposalId, second.id)).rejects.toThrow(
				"changed since",
			);
		});
	});

	it("adds nothing when sent back or rejected", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);

			await decideChange(tx, {
				decision: "return",
				deciderUserId: second.id,
				note: "Which printed edition?",
				proposalId: await proposeGreeting(tx, first.id),
			});
			await decideChange(tx, {
				decision: "reject",
				deciderUserId: second.id,
				note: "Not needed",
				proposalId: await proposeGreeting(tx, first.id),
			});

			expect(await verseFifteen(tx, "ESV", first.id)).toBeUndefined();
		});
	});
});

describe("changing how translations handle a verse", () => {
	async function withVerseFifteen(tx: DbExecutor) {
		const people = await setUp(tx);
		await addVerse(tx, {
			...thirdJohn,
			abbreviation: "KJV",
			actorUserId: people.contributor.id,
		});
		return people;
	}

	function proposeHandling(
		tx: DbExecutor,
		actorUserId: string,
		handling = greetingHandling,
	) {
		return proposeVerseHandling(tx, {
			...thirdJohn,
			actorUserId,
			handling,
			reason: "KJV keeps the greeting in verse 14",
			verse: 15,
		});
	}

	it("frees a chapter to publish once its extra verse is marked as part of another", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { contributor, first, second } = await withVerseFifteen(tx);
			const kjv = { ...thirdJohn, abbreviation: "KJV" };
			await saveVerseDrafts(tx, {
				...kjv,
				actorUserId: contributor.id,
				verses: Array.from({ length: 14 }, (_, index) => ({
					baseText: "",
					number: index + 1,
					text: "Text.",
				})),
			});
			await sendChapterForProofreading(tx, {
				...kjv,
				actorUserId: contributor.id,
			});
			for (let verse = 1; verse <= 14; verse += 1) {
				await markVerse(tx, {
					...kjv,
					actorUserId: first.id,
					result: { mark: "matches" },
					verse,
				});
			}
			await passChapter(tx, { ...kjv, actorUserId: first.id, publish: false });

			const publish = () =>
				publishChapter(tx, { ...kjv, actorUserId: first.id });
			await expect(publish()).rejects.toThrow("verses 15");

			await confirm(tx, await proposeHandling(tx, first.id), second.id);
			await expect(publish()).resolves.toMatchObject({ published: 14 });
		});
	});

	it("changes nothing until confirmed, and can change it back", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await withVerseFifteen(tx);
			const proposalId = await proposeHandling(tx, first.id);
			expect((await verseFifteen(tx, "KJV", first.id))?.needsOwnText).toBe(
				true,
			);

			await confirm(tx, proposalId, second.id);
			expect((await verseFifteen(tx, "KJV", first.id))?.needsOwnText).toBe(
				false,
			);

			await confirm(
				tx,
				await proposeHandling(tx, first.id, everyoneHasIt),
				second.id,
			);
			expect((await verseFifteen(tx, "KJV", first.id))?.needsOwnText).toBe(
				true,
			);
		});
	});

	it("refuses to take text away from a translation that already has it", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { contributor, first } = await withVerseFifteen(tx);
			await saveVerseDrafts(tx, {
				...thirdJohn,
				abbreviation: "KJV",
				actorUserId: contributor.id,
				verses: [{ baseText: "", number: 15, text: "A draft." }],
			});

			await expect(proposeHandling(tx, first.id)).rejects.toThrow(
				"KJV already has text",
			);
		});
	});

	it("refuses a verse included in itself, or no change", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first } = await withVerseFifteen(tx);

			await expect(
				proposeHandling(tx, first.id, [
					{ abbreviation: "KJV", kind: "included_in", includedInVerse: 15 },
					...everyoneHasIt.slice(1),
				]),
			).rejects.toThrow("itself");
			await expect(
				proposeHandling(tx, first.id, everyoneHasIt),
			).rejects.toThrow("Nothing changes");
		});
	});

	it("won't apply a change when the verse moved on after it was proposed", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await withVerseFifteen(tx);
			const older = await proposeHandling(tx, first.id);
			const newer = await proposeHandling(tx, first.id, [
				{ abbreviation: "KJV", kind: "not_in_translation" },
				...everyoneHasIt.slice(1),
			]);
			await confirm(tx, newer, second.id);

			await expect(confirm(tx, older, second.id)).rejects.toThrow(
				"changed since",
			);
		});
	});
});

describe("reading a structure change", () => {
	it("shows what the confirming Superadmin needs to decide", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const proposalId = await proposeGreeting(tx, first.id);

			const change = await getStructureChange(tx, proposalId, second.id);

			expect(change).toMatchObject({
				after: "3 John 1 · 15 verses",
				before: "3 John 1 · 14 verses",
				proposedByMe: false,
				reason: "ESV, NIV, NLT and NASB print verse 15 on its own",
				status: "proposed",
				title: "Add verse 3 John 1:15",
			});
			expect(change?.translations.map(({ label }) => label)).toEqual([
				"Included in verse 14",
				"Included in verse 14",
				"Own verse, text entered afterwards",
				"Own verse, text entered afterwards",
				"Own verse, text entered afterwards",
				"Own verse, text entered afterwards",
			]);
			expect(change?.checks).toEqual(
				expect.arrayContaining([
					{ ok: true, text: "Added at the end, so no verse is renumbered" },
					{ ok: true, text: "All six translations have an answer" },
					{
						ok: true,
						text: "Empty verse slots appear in Scripture entry for 4 translations",
					},
					{ ok: true, text: "Proposer and confirmer are different people" },
				]),
			);
		});
	});

	it("tells the proposer they can't confirm their own change", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first } = await setUp(tx);
			const change = await getStructureChange(
				tx,
				await proposeGreeting(tx, first.id),
				first.id,
			);

			expect(change?.proposedByMe).toBe(true);
			expect(change?.checks).toContainEqual({
				ok: false,
				text: "You proposed this, so a different Superadmin has to confirm it",
			});
		});
	});

	it("lists waiting changes, and returns null for another kind of proposal", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const proposalId = await proposeGreeting(tx, first.id);

			expect(await listStructureChanges(tx, second.id)).toMatchObject([
				{ id: proposalId, proposedByMe: false },
			]);
			await confirm(tx, proposalId, second.id);
			expect(await listStructureChanges(tx, second.id)).toEqual([]);
			expect(await getStructureChange(tx, 999_999, second.id)).toBeNull();
		});
	});
});

describe("sidebar counts", () => {
	it("counts foundation changes apart from people changes, never your own", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const before = await getStaffQueueCounts(tx, {
				permissionKeys: ["canon.manage", "scripture.manage", "admins.manage"],
				userId: second.id,
			});

			await proposeGreeting(tx, first.id);

			const counts = (userId: string) =>
				getStaffQueueCounts(tx, {
					permissionKeys: ["canon.manage", "scripture.manage", "admins.manage"],
					userId,
				});
			expect((await counts(second.id)).foundationChanges).toBe(
				(before.foundationChanges ?? 0) + 1,
			);
			expect((await counts(second.id)).pendingConfirmations).toBe(
				before.pendingConfirmations,
			);
			expect((await counts(first.id)).foundationChanges).toBe(
				before.foundationChanges,
			);
		});
	});
});
