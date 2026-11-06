import { describe, expect, it } from "vitest";

import {
	bookCatalogue,
	canonCatalogue,
	protestantBookCatalogue,
	translationCatalogue,
} from "../src/scripture-catalogue";

const sum = (values: (number | null)[]) =>
	values.reduce<number>((total, value) => total + (value ?? 0), 0);

describe("book catalogue", () => {
	it("has the 66 books with the known totals", () => {
		expect(protestantBookCatalogue).toHaveLength(66);
		expect(sum(protestantBookCatalogue.map((b) => b.expectedChapters))).toBe(
			1189,
		);
		expect(sum(protestantBookCatalogue.map((b) => b.expectedVerses))).toBe(
			31102,
		);
	});

	it("splits the totals correctly between the testaments", () => {
		const old = protestantBookCatalogue.filter((b) => b.testament === "old");
		const neu = protestantBookCatalogue.filter((b) => b.testament === "new");
		expect(old).toHaveLength(39);
		expect(neu).toHaveLength(27);
		expect(sum(old.map((b) => b.expectedChapters))).toBe(929);
		expect(sum(neu.map((b) => b.expectedChapters))).toBe(260);
		expect(sum(old.map((b) => b.expectedVerses))).toBe(23145);
		expect(sum(neu.map((b) => b.expectedVerses))).toBe(7957);
	});

	it("has no clashing slugs or short names", () => {
		const slugs = bookCatalogue.map(({ slug }) => slug);
		const shortNames = bookCatalogue.map(({ shortName }) => shortName);
		expect(new Set(slugs).size).toBe(slugs.length);
		expect(new Set(shortNames).size).toBe(shortNames.length);
	});

	it("gives every alias to exactly one book, and never another book's name", () => {
		const aliases = bookCatalogue.flatMap((b) =>
			b.aliases.map((alias) => alias.toLowerCase()),
		);
		const taken = new Set([
			...bookCatalogue.map((b) => b.name.toLowerCase()),
			...bookCatalogue.map((b) => b.shortName.toLowerCase()),
		]);
		expect(new Set(aliases).size).toBe(aliases.length);
		expect(aliases.filter((alias) => taken.has(alias))).toEqual([]);
	});
});

describe("canon catalogue", () => {
	const canon = (slug: string) =>
		canonCatalogue.find((candidate) => candidate.slug === slug)?.books ?? [];
	const knownSlugs = new Set(bookCatalogue.map(({ slug }) => slug));

	it("matches each tradition's expected size", () => {
		expect(canon("protestant")).toHaveLength(66);
		expect(canon("catholic")).toHaveLength(73);
		expect(canon("eastern-orthodox")).toHaveLength(76);
	});

	it("only lists known books, each once", () => {
		for (const { books } of canonCatalogue) {
			expect(new Set(books).size).toBe(books.length);
			expect(books.filter((slug) => !knownSlugs.has(slug))).toEqual([]);
		}
	});

	it("includes every one of the 66 books in each filled canon", () => {
		for (const slug of ["catholic", "eastern-orthodox"]) {
			const missing = protestantBookCatalogue
				.map((book) => book.slug)
				.filter((bookSlug) => !canon(slug).includes(bookSlug));
			expect(missing).toEqual([]);
		}
	});

	it("puts Romans where the design expects it", () => {
		expect(canon("protestant").indexOf("romans") + 1).toBe(45);
		expect(canon("catholic").indexOf("romans") + 1).toBe(52);
		expect(canon("eastern-orthodox").indexOf("romans") + 1).toBe(55);
	});

	it("leaves the Ethiopian canon empty rather than guessing", () => {
		expect(canon("ethiopian-orthodox")).toEqual([]);
	});
});

describe("translation catalogue", () => {
	it("has exactly the six supported translations", () => {
		expect(translationCatalogue.map((t) => t.abbreviation)).toEqual([
			"KJV",
			"NKJV",
			"ESV",
			"NIV",
			"NLT",
			"NASB",
		]);
	});

	it("treats only the KJV as needing no permission", () => {
		expect(
			translationCatalogue
				.filter((t) => !t.licensed)
				.map((t) => t.abbreviation),
		).toEqual(["KJV"]);
	});
});
