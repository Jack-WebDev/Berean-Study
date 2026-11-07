import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import {
	getCanonOverview,
	proposeCanonOrder,
	proposeChapterLimits,
} from "../src/canon-admin";
import type { DbExecutor } from "../src/db-executor";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import { decideChange } from "../src/two-person";
import { addChapter, getEntryChapter } from "../src/verse-entry";
import {
	createPerson,
	inRolledBackTransactionWithoutScripture,
	withFreshCatalogue,
} from "./governance-helpers";

async function setUp(tx: DbExecutor) {
	await withFreshCatalogue(tx);
	await applyScriptureCatalogue(tx);
	return {
		first: await createPerson(tx, "Superadmin"),
		second: await createPerson(tx, "Superadmin"),
		contributor: await createPerson(tx, "Contributor"),
	};
}

function confirm(tx: DbExecutor, proposalId: number, deciderUserId: string) {
	return decideChange(tx, {
		decision: "confirm",
		deciderUserId,
		note: "Checked against a printed edition.",
		proposalId,
	});
}

function addChapters(
	tx: DbExecutor,
	actorUserId: string,
	slug: string,
	count: number,
) {
	return Array.from({ length: count }).reduce<Promise<unknown>>(
		(previous) =>
			previous.then(() =>
				addChapter(tx, { abbreviation: "KJV", actorUserId, slug }),
			),
		Promise.resolve(),
	);
}

afterAll(async () => {
	await pool.end();
});

describe("chapter limits", () => {
	it("starts the Protestant canon filled in and the others blank", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first } = await setUp(tx);

			const protestant = await getCanonOverview(tx, "protestant", first.id);
			const catholic = await getCanonOverview(tx, "catholic", first.id);

			expect(
				protestant?.selected.books.find(({ slug }) => slug === "romans")
					?.chapterLimit,
			).toBe(16);
			expect(
				catholic?.selected.books.find(({ slug }) => slug === "romans")
					?.chapterLimit,
			).toBeNull();
		});
	});

	it("changes nothing until a second Superadmin confirms", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);

			const proposalId = await proposeChapterLimits(tx, {
				actorUserId: first.id,
				canonSlug: "catholic",
				limits: [{ bookSlug: "daniel", limit: 14 }],
				reason: "Includes Susanna and Bel",
			});
			const limitOfDaniel = async () =>
				(await getCanonOverview(tx, "catholic", first.id))?.selected.books.find(
					({ slug }) => slug === "daniel",
				)?.chapterLimit;

			expect(await limitOfDaniel()).toBeNull();
			await expect(confirm(tx, proposalId, first.id)).rejects.toThrow(
				"someone else has to decide",
			);

			await confirm(tx, proposalId, second.id);
			expect(await limitOfDaniel()).toBe(14);
		});
	});

	it("gives the same book different limits in different canons", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			await confirm(
				tx,
				await proposeChapterLimits(tx, {
					actorUserId: first.id,
					canonSlug: "catholic",
					limits: [{ bookSlug: "daniel", limit: 14 }],
					reason: "Includes Susanna and Bel",
				}),
				second.id,
			);

			const protestant = await getCanonOverview(tx, "protestant", first.id);
			expect(
				protestant?.selected.books.find(({ slug }) => slug === "daniel")
					?.chapterLimit,
			).toBe(12);
		});
	});

	it("sends several limits for one decision", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			await confirm(
				tx,
				await proposeChapterLimits(tx, {
					actorUserId: first.id,
					canonSlug: "catholic",
					limits: [
						{ bookSlug: "tobit", limit: 14 },
						{ bookSlug: "judith", limit: 16 },
					],
					reason: "From the printed canon",
				}),
				second.id,
			);

			const { selected } = (await getCanonOverview(
				tx,
				"catholic",
				first.id,
			)) ?? { selected: { books: [] } };
			expect(
				selected.books.find(({ slug }) => slug === "judith")?.chapterLimit,
			).toBe(16);
			expect(
				selected.books.find(({ slug }) => slug === "tobit")?.chapterLimit,
			).toBe(14);
		});
	});

	it("refuses a limit for a book outside the canon, or no change at all", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first } = await setUp(tx);
			const propose = (bookSlug: string, limit: number) =>
				proposeChapterLimits(tx, {
					actorUserId: first.id,
					canonSlug: "protestant",
					limits: [{ bookSlug, limit }],
					reason: "Reason",
				});

			await expect(propose("tobit", 14)).rejects.toThrow("isn't in");
			await expect(propose("romans", 16)).rejects.toThrow("Nothing changes");
		});
	});

	it("won't let a limit drop below chapters that exist", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { contributor, first } = await setUp(tx);
			await addChapters(tx, contributor.id, "romans", 3);

			await expect(
				proposeChapterLimits(tx, {
					actorUserId: first.id,
					canonSlug: "protestant",
					limits: [{ bookSlug: "romans", limit: 2 }],
					reason: "Reason",
				}),
			).rejects.toThrow("already has 3 chapters");
		});
	});

	it("won't apply a limit that changed after it was proposed", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const propose = (limit: number) =>
				proposeChapterLimits(tx, {
					actorUserId: first.id,
					canonSlug: "catholic",
					limits: [{ bookSlug: "daniel", limit }],
					reason: "Reason",
				});

			const older = await propose(13);
			const newer = await propose(14);
			await confirm(tx, newer, second.id);

			await expect(confirm(tx, older, second.id)).rejects.toThrow(
				"changed since",
			);
		});
	});
});

describe("adding chapters in Scripture entry", () => {
	it("stops at the highest limit any canon has approved", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { contributor, first, second } = await setUp(tx);
			await addChapters(tx, contributor.id, "daniel", 12);
			const add = () =>
				addChapter(tx, {
					abbreviation: "KJV",
					actorUserId: contributor.id,
					slug: "daniel",
				});
			await expect(add()).rejects.toThrow("second Superadmin");

			await confirm(
				tx,
				await proposeChapterLimits(tx, {
					actorUserId: first.id,
					canonSlug: "catholic",
					limits: [{ bookSlug: "daniel", limit: 13 }],
					reason: "Includes Susanna",
				}),
				second.id,
			);

			expect((await add()).number).toBe(13);
			await expect(add()).rejects.toThrow("second Superadmin");
		});
	});

	it("offers a book only once some canon has a limit for it", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { contributor, first, second } = await setUp(tx);
			const offered = async () =>
				(await getEntryChapter(tx, {}, contributor.id))?.books.map(
					({ slug }) => slug,
				);

			expect(await offered()).not.toContain("tobit");
			await expect(
				addChapter(tx, {
					abbreviation: "KJV",
					actorUserId: contributor.id,
					slug: "tobit",
				}),
			).rejects.toThrow("No canon has a chapter limit");

			await confirm(
				tx,
				await proposeChapterLimits(tx, {
					actorUserId: first.id,
					canonSlug: "catholic",
					limits: [{ bookSlug: "tobit", limit: 14 }],
					reason: "From the printed canon",
				}),
				second.id,
			);
			expect(await offered()).toContain("tobit");
		});
	});

	it("warns when a chapter goes past the Protestant canon, without blocking it", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { contributor, first, second } = await setUp(tx);
			await confirm(
				tx,
				await proposeChapterLimits(tx, {
					actorUserId: first.id,
					canonSlug: "catholic",
					limits: [
						{ bookSlug: "daniel", limit: 13 },
						{ bookSlug: "tobit", limit: 14 },
					],
					reason: "From the printed canon",
				}),
				second.id,
			);
			await addChapters(tx, contributor.id, "daniel", 13);
			await addChapters(tx, contributor.id, "tobit", 1);

			const noticeFor = async (slug: string, chapter: number) =>
				(await getEntryChapter(tx, { chapter, slug }, contributor.id))
					?.noTextSourceYet;

			expect(await noticeFor("daniel", 12)).toBe(false);
			expect(await noticeFor("daniel", 13)).toBe(true);
			expect(await noticeFor("tobit", 1)).toBe(true);
		});
	});
});

describe("canon order", () => {
	async function orderOf(tx: DbExecutor, canon: string, viewerUserId: string) {
		const overview = await getCanonOverview(tx, canon, viewerUserId);
		return overview?.selected.books.map(({ slug }) => slug) ?? [];
	}

	function swapped(order: readonly string[], a: string, b: string) {
		return order.map((slug) => (slug === a ? b : slug === b ? a : slug));
	}

	it("moves books only after a second Superadmin confirms", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const before = await orderOf(tx, "catholic", first.id);
			const after = swapped(before, "baruch", "ezekiel");

			const proposalId = await proposeCanonOrder(tx, {
				actorUserId: first.id,
				canonSlug: "catholic",
				order: after,
				reason: "Baruch follows Lamentations",
			});
			expect(await orderOf(tx, "catholic", first.id)).toEqual(before);

			const overview = await getCanonOverview(tx, "catholic", second.id);
			expect(overview?.pending[0]).toMatchObject({
				proposedByMe: false,
				reason: "Baruch follows Lamentations",
			});
			expect(overview?.pending[0]?.change).toMatchObject({
				type: "order",
				added: [],
				removed: [],
			});

			await confirm(tx, proposalId, second.id);
			expect(await orderOf(tx, "catholic", first.id)).toEqual(after);
			expect(
				(await getCanonOverview(tx, "catholic", first.id))?.pending,
			).toEqual([]);
		});
	});

	it("adds and removes books, keeping the limits of those that stay", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const before = await orderOf(tx, "protestant", first.id);

			await confirm(
				tx,
				await proposeCanonOrder(tx, {
					actorUserId: first.id,
					canonSlug: "protestant",
					order: [...before.filter((slug) => slug !== "jude"), "tobit"],
					reason: "Testing membership",
				}),
				second.id,
			);

			const overview = await getCanonOverview(tx, "protestant", first.id);
			const bookNamed = (slug: string) =>
				overview?.selected.books.find((book) => book.slug === slug);
			expect(bookNamed("jude")).toBeUndefined();
			expect(bookNamed("tobit")?.chapterLimit).toBeNull();
			expect(bookNamed("romans")?.chapterLimit).toBe(16);
			expect(overview?.booksOutside.map(({ slug }) => slug)).toContain("jude");
		});
	});

	it("lets a blank canon get its first books", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const before = await orderOf(tx, "ethiopian-orthodox", first.id);

			await confirm(
				tx,
				await proposeCanonOrder(tx, {
					actorUserId: first.id,
					canonSlug: "ethiopian-orthodox",
					order: [...before.filter((slug) => slug !== "genesis"), "genesis"],
					reason: "Starting the list",
				}),
				second.id,
			);

			expect(await orderOf(tx, "ethiopian-orthodox", first.id)).toContain(
				"genesis",
			);
		});
	});

	it("refuses no change, repeated books and an empty canon", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first } = await setUp(tx);
			const before = await orderOf(tx, "catholic", first.id);
			const propose = (order: string[]) =>
				proposeCanonOrder(tx, {
					actorUserId: first.id,
					canonSlug: "catholic",
					order,
					reason: "Reason",
				});

			await expect(propose(before)).rejects.toThrow("Nothing changes");
			await expect(
				propose([...before.slice(1), before[1] as string]),
			).rejects.toThrow("only appear once");
			await expect(propose([])).rejects.toThrow();
		});
	});

	it("won't apply an order that changed after it was proposed", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const before = await orderOf(tx, "catholic", first.id);
			const propose = (a: string, b: string) =>
				proposeCanonOrder(tx, {
					actorUserId: first.id,
					canonSlug: "catholic",
					order: swapped(before, a, b),
					reason: "Reason",
				});

			const older = await propose("baruch", "ezekiel");
			const newer = await propose("tobit", "judith");
			await confirm(tx, newer, second.id);

			await expect(confirm(tx, older, second.id)).rejects.toThrow(
				"changed since",
			);
		});
	});

	it("leaves the canon alone when sent back or rejected", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			const { first, second } = await setUp(tx);
			const before = await orderOf(tx, "catholic", first.id);

			for (const decision of ["return", "reject"] as const) {
				await decideChange(tx, {
					decision,
					deciderUserId: second.id,
					note: "Which edition is this from?",
					proposalId: await proposeCanonOrder(tx, {
						actorUserId: first.id,
						canonSlug: "catholic",
						order: swapped(before, "baruch", "ezekiel"),
						reason: "Reason",
					}),
				});
			}

			expect(await orderOf(tx, "catholic", first.id)).toEqual(before);
		});
	});
});
