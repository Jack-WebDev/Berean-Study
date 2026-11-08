import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import { emptyBookOverview } from "../src/book-overview";
import {
	listCanonBooks,
	recordChapterVisit,
	saveReadingPlace,
} from "../src/reader";
import {
	getAboutBook,
	getBookPage,
	getContinueReading,
} from "../src/reader-books";
import { translations } from "../src/schema/translations";
import { createAccount } from "./governance-helpers";
import {
	addContent,
	inStudy,
	paragraph,
	publish,
	text,
} from "./reader-fixtures";

afterAll(async () => {
	await pool.end();
});

const kjv = ["KJV"];

async function kjvId(setup: Parameters<Parameters<typeof inStudy>[0]>[0]) {
	const [row] = await setup.tx
		.select({ id: translations.id })
		.from(translations)
		.where(eq(translations.abbreviation, "KJV"));
	if (!row) throw new Error("No KJV");
	return row.id;
}

describe("books on Browse", () => {
	it("says which books can be read yet, and which Bibles include the extra books", async () => {
		await inStudy(async (setup) => {
			await publish(setup.tx, "john", 3, { 16: "For God so loved the world…" });
			const protestant = await listCanonBooks(
				setup.tx,
				null,
				await kjvId(setup),
			);
			expect(
				protestant.books.find((book) => book.slug === "john"),
			).toMatchObject({
				hasText: true,
				includedBy: [],
				notInEveryTradition: false,
			});
			expect(
				protestant.books.find((book) => book.slug === "romans")?.hasText,
			).toBe(false);
			expect(protestant.traditions).toEqual([
				{ hasList: true, name: "Protestant", slug: "protestant" },
				{ hasList: true, name: "Catholic", slug: "catholic" },
				{ hasList: true, name: "Eastern Orthodox", slug: "eastern-orthodox" },
				{
					hasList: false,
					name: "Ethiopian Orthodox Tewahedo",
					slug: "ethiopian-orthodox",
				},
			]);

			const catholic = await listCanonBooks(setup.tx, "catholic");
			expect(
				catholic.books.find((book) => book.slug === "tobit"),
			).toMatchObject({
				hasText: false,
				includedBy: ["Catholic", "Eastern Orthodox"],
				notInEveryTradition: true,
			});
		});
	});
});

describe("choosing a chapter", () => {
	it("lists the book's chapters, which can be read, and the one last read", async () => {
		await inStudy(async (setup) => {
			const { id: userId } = await createAccount(setup.tx);
			await publish(setup.tx, "john", 3, { 16: "For God so loved the world…" });
			await publish(setup.tx, "john", 4, {
				1: "When therefore the Lord knew…",
			});

			const page = await getBookPage(setup.tx, userId, {
				bookSlug: "john",
				traditionSlug: null,
				translationAbbreviations: kjv,
			});
			expect(page).toEqual({
				availableChapters: [3, 4],
				book: {
					group: "Gospels",
					name: "John",
					slug: "john",
					testament: "new",
				},
				chapterCount: 21,
				hasAbout: false,
				lastRead: null,
				summary: null,
			});

			await recordChapterVisit(setup.tx, userId, {
				bookSlug: "john",
				chapter: 4,
			});
			expect(
				(
					await getBookPage(setup.tx, userId, {
						bookSlug: "john",
						traditionSlug: null,
						translationAbbreviations: kjv,
					})
				)?.lastRead,
			).toBe(4);

			// The saved place is the most up to date.
			await saveReadingPlace(setup.tx, userId, {
				bookSlug: "john",
				chapter: 3,
				translationAbbreviation: "KJV",
				verse: 16,
			});
			expect(
				(
					await getBookPage(setup.tx, userId, {
						bookSlug: "john",
						traditionSlug: null,
						translationAbbreviations: kjv,
					})
				)?.lastRead,
			).toBe(3);
		});
	});

	it("takes the summary from the published overview", async () => {
		await inStudy(async (setup) => {
			const { id: userId } = await createAccount(setup.tx);
			await addContent(setup, {
				body: {
					...emptyBookOverview,
					summary: "The life of Jesus told through signs and conversations.",
				},
				kind: "book_overview",
				passages: [],
				scopeKey: "john",
			});
			const page = await getBookPage(setup.tx, userId, {
				bookSlug: "john",
				traditionSlug: null,
				translationAbbreviations: kjv,
			});
			expect(page).toMatchObject({
				hasAbout: true,
				summary: "The life of Jesus told through signs and conversations.",
			});
		});
	});

	it("has nothing for a book that doesn't exist", async () => {
		await inStudy(async (setup) => {
			const { id: userId } = await createAccount(setup.tx);
			expect(
				await getBookPage(setup.tx, userId, {
					bookSlug: "hezekiah",
					traditionSlug: null,
					translationAbbreviations: kjv,
				}),
			).toBeNull();
		});
	});
});

describe("about this book", () => {
	it("joins the overview and the introduction, leaving out empty parts", async () => {
		await inStudy(async (setup) => {
			await publish(setup.tx, "john", 20, {
				31: "But these are written, that ye might believe…",
			});
			await addContent(setup, {
				body: {
					...emptyBookOverview,
					author: "John the apostle",
					keyThemes: ["Believing", "Eternal life"],
					keyVerse: "20:31",
					outline: [
						{ heading: "The Word becomes flesh", range: "1:1–18" },
						{ heading: "", range: "1:19–12:50" },
						{ heading: "Last words", range: "13–17" },
					],
					summary: "The story of Jesus, told so that readers might believe.",
				},
				kind: "book_overview",
				passages: [],
				scopeKey: "john",
			});
			await addContent(setup, {
				body: {
					sections: [
						{
							body: paragraph(text("John tells fewer stories.")),
							key: "a",
							range: "",
							title: "Purpose",
						},
					],
					title: "Introduction to John",
				},
				kind: "book_introduction",
				passages: [],
				scopeKey: "john",
			});

			const about = await getAboutBook(setup.tx, {
				bookSlug: "john",
				translationAbbreviations: kjv,
			});
			expect(about).toMatchObject({
				book: { name: "John", slug: "john" },
				details: [{ label: "Written by", value: "John the apostle" }],
				keyVerse: {
					label: "John 20:31",
					place: { chapter: 20, verse: 31 },
					text: "But these are written, that ye might believe…",
					translationAbbreviation: "KJV",
				},
				outline: [
					{
						heading: "The Word becomes flesh",
						place: { chapter: 1, verse: 1 },
						range: "1:1–18",
					},
					{ heading: "Last words", place: { chapter: 13, verse: null } },
				],
				summary: "The story of Jesus, told so that readers might believe.",
				themes: ["Believing", "Eternal life"],
			});
			expect(about?.introduction?.title).toBe("Introduction to John");
			expect(
				about?.introduction?.sections.map((section) => section.title),
			).toEqual(["Purpose"]);
		});
	});

	it("is empty when nothing about the book is published", async () => {
		await inStudy(async (setup) => {
			await addContent(setup, {
				body: { ...emptyBookOverview, summary: "A draft" },
				kind: "book_overview",
				live: false,
				passages: [],
				scopeKey: "john",
			});
			expect(
				await getAboutBook(setup.tx, {
					bookSlug: "john",
					translationAbbreviations: kjv,
				}),
			).toEqual({
				book: { name: "John", slug: "john" },
				details: [],
				introduction: null,
				keyVerse: null,
				outline: [],
				summary: null,
				themes: [],
			});
		});
	});
});

describe("continue reading", () => {
	it("shows the place with the verse's first words", async () => {
		await inStudy(async (setup) => {
			const { id: userId } = await createAccount(setup.tx);
			expect(await getContinueReading(setup.tx, userId, kjv)).toBeNull();

			await publish(setup.tx, "romans", 8, {
				28: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
			});
			await saveReadingPlace(setup.tx, userId, {
				bookSlug: "romans",
				chapter: 8,
				translationAbbreviation: "KJV",
				verse: 28,
			});
			expect(await getContinueReading(setup.tx, userId, kjv)).toEqual({
				label: "Romans 8",
				place: { bookSlug: "romans", chapter: 8, verse: 28 },
				start:
					"And we know that all things work together for good to them that love…",
				translationName: "King James Version",
			});
		});
	});
});
