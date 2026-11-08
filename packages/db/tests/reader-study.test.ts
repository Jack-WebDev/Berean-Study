import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import { applyAccessCatalogue } from "../src/access-setup";
import {
	dailyStudyReportLimit,
	getVerseStudy,
	reportStudyProblem,
} from "../src/reader-study";
import { citations } from "../src/schema/citations";
import { contentIssues } from "../src/schema/content_issues";
import { sourceExcerpts } from "../src/schema/source_excerpts";
import { sources } from "../src/schema/sources";
import { createPerson } from "./governance-helpers";
import {
	addContent,
	inStudy,
	paragraph,
	publish,
	type Setup,
	text,
} from "./reader-fixtures";

afterAll(async () => {
	await pool.end();
});

const citation = (excerptId: number, locator = "p. 529") => ({
	attrs: { excerptId, label: "Moo, Romans", locator, strength: "direct" },
	type: "citation",
});

const studied = (verseNumbers: number[]) => ({
	bookSlug: "romans",
	chapter: 8,
	translationAbbreviation: "KJV",
	verses: verseNumbers,
});

/** A live source with one live excerpt, ready to cite. */
async function addSource(setup: Setup, quote: string) {
	const { tx, writerId } = setup;
	const [source] = await tx
		.insert(sources)
		.values({ createdByUserId: writerId })
		.returning({ id: sources.id });
	if (!source) throw new Error("No source");
	const [excerpt] = await tx
		.insert(sourceExcerpts)
		.values({ createdByUserId: writerId, sourceId: source.id })
		.returning({ id: sourceExcerpts.id });
	if (!excerpt) throw new Error("No excerpt");
	await addContent(setup, {
		body: {
			authors: "Douglas J. Moo",
			edition: "",
			publisher: "Eerdmans",
			title: "The Epistle to the Romans",
			type: "commentary",
			year: "1996",
		},
		kind: "source",
		passages: [],
		scopeKey: String(source.id),
	});
	await addContent(setup, {
		body: { form: "quotation", location: "p. 527", passages: [], text: quote },
		kind: "source_excerpt",
		passages: [],
		scopeKey: String(excerpt.id),
	});
	return excerpt.id;
}

describe("study notes for chosen verses", () => {
	it("shows only groups with live content, in panel order", async () => {
		await inStudy(async (setup) => {
			const romans = await publish(setup.tx, "romans", 8, {
				28: "And we know that all things work together for good…",
				29: "For whom he did foreknow…",
			});
			const on28 = {
				bookId: romans,
				from: [8, 28] as [number, number],
				to: [8, 28] as [number, number],
			};
			await addContent(setup, {
				body: {
					gloss: "work together",
					language: "greek",
					lemma: "συνεργέω",
					lexiconKey: "G4903",
					note: paragraph(text("A word for people working side by side.")),
					parsing: "verb, present tense",
					passage: "Romans 8:28",
					word: "συνεργεῖ",
				},
				kind: "original_language_note",
				passages: [on28],
				scopeKey: "word-1",
			});
			await addContent(setup, {
				body: {
					sections: [
						{
							body: paragraph(text("God is at work in all of it.")),
							key: "s1",
							range: "",
							title: "Note",
						},
					],
					title: "God at work in every circumstance",
				},
				kind: "verse_commentary",
				passages: [on28],
				scopeKey: "romans:8:28",
			});
			// A draft isn't shown, and neither is a note on another verse.
			await addContent(setup, {
				body: { kind: "parallel", note: "Draft", twoWay: false },
				kind: "cross_reference",
				live: false,
				passages: [on28],
				scopeKey: "romans:8:28>romans:8:29",
			});

			const study = await getVerseStudy(setup.tx, studied([28]));
			expect(study?.reference).toBe("Romans 8:28");
			expect(study?.groups.map((group) => group.name)).toEqual([
				"Explanation",
				"Word meanings",
			]);
			expect(study?.groups[1]?.items[0]).toMatchObject({
				gloss: "work together",
				kind: "word_meaning",
				language: "greek",
				lemma: "συνεργέω",
				reportLabel: "Word meaning: συνεργεῖ",
				word: "συνεργεῖ",
			});

			expect(await getVerseStudy(setup.tx, studied([29]))).toEqual({
				groups: [],
				reference: "Romans 8:29",
			});
		});
	});

	it("numbers sources through an explanation and cuts quotes to 75 words", async () => {
		await inStudy(async (setup) => {
			const romans = await publish(setup.tx, "romans", 8, {
				28: "And we know…",
				31: "What shall we then say…",
			});
			const longQuote = Array.from(
				{ length: 90 },
				(_, index) => `word${index + 1}`,
			).join(" ");
			const excerptId = await addSource(setup, longQuote);
			const { revisionId } = await addContent(setup, {
				body: {
					sections: [
						{
							body: paragraph(
								text("All things work for good."),
								citation(excerptId),
							),
							key: "a",
							range: "28–30",
							title: "God at work",
						},
						{
							body: paragraph(
								text("If God is for us…"),
								citation(excerptId, ""),
							),
							key: "b",
							range: "31–39",
							title: "Nothing can separate us",
						},
					],
					title: "Romans 8:28–39",
				},
				kind: "passage_commentary",
				passages: [{ bookId: romans, from: [8, 28], to: [8, 39] }],
				scopeKey: "romans:8:28-8:39",
			});
			await setup.tx.insert(citations).values([
				{
					contentRevisionId: revisionId,
					excerptId,
					locator: "p. 529",
					position: 1,
					strength: "direct",
				},
				{
					contentRevisionId: revisionId,
					excerptId,
					position: 2,
					strength: "direct",
				},
			]);

			const study = await getVerseStudy(setup.tx, studied([28]));
			const explanation = study?.groups[0]?.items[0];
			if (explanation?.kind !== "explanation")
				throw new Error("No explanation");
			expect(explanation.revisionId).toBe(revisionId);
			expect(
				explanation.sections.map((section) => [
					section.title,
					section.aboutChosenVerses,
					section.writing.firstCitation,
				]),
			).toEqual([
				["God at work", true, 1],
				["Nothing can separate us", false, 2],
			]);
			expect(explanation.sources).toHaveLength(2);
			expect(explanation.sources[0]).toMatchObject({
				byline: "Douglas J. Moo · 1996",
				detail: "p. 529 · Strongly supports this statement",
				isSummary: false,
				number: 1,
				title: "The Epistle to the Romans",
			});
			// No page on the citation, so the excerpt's own place is used.
			expect(explanation.sources[1]?.detail).toBe(
				"p. 527 · Strongly supports this statement",
			);
			const quote = explanation.sources[0]?.quote ?? "";
			expect(quote.split(" ")).toHaveLength(75);
			expect(quote.endsWith("word75…")).toBe(true);
		});
	});

	it("leads related verses to the other passage, with its words", async () => {
		await inStudy(async (setup) => {
			const romans = await publish(setup.tx, "romans", 8, {
				28: "And we know…",
			});
			const genesis = await publish(setup.tx, "genesis", 50, {
				20: "But as for you, ye thought evil against me; but God meant it unto good…",
			});
			await addContent(setup, {
				body: {
					kind: "illustration",
					note: "Joseph saw God turn evil to good.",
					twoWay: true,
				},
				kind: "cross_reference",
				passages: [
					{ bookId: genesis, from: [50, 20], to: [50, 20] },
					{ bookId: romans, from: [8, 28], to: [8, 28] },
				],
				scopeKey: "genesis:50:20>romans:8:28",
			});
			await addContent(setup, {
				body: {
					note: "Paul quotes the psalm.",
					relationship: "quotation",
					textForm: "septuagint",
				},
				kind: "canonical_relationship",
				passages: [
					{ bookId: romans, from: [8, 28], to: [8, 28] },
					{ bookId: genesis, from: [50, 20], to: [50, 20] },
				],
				scopeKey: "romans:8:28<genesis:50:20",
			});

			const study = await getVerseStudy(setup.tx, studied([28]));
			expect(study?.groups.map((group) => group.key)).toEqual([
				"related_verses",
				"testament_links",
			]);
			expect(study?.groups[0]?.items[0]).toMatchObject({
				kind: "related_verse",
				kindLabel: "An example from a story",
				note: "Joseph saw God turn evil to good.",
				passage: {
					bookSlug: "genesis",
					chapter: 50,
					isChosen: false,
					label: "Genesis 50:20",
					text: "But as for you, ye thought evil against me; but God meant it unto good…",
					verse: 20,
				},
			});
			expect(study?.groups[1]?.items[0]).toMatchObject({
				kindLabel: "Quoted",
				newTestament: { isChosen: true, label: "Romans 8:28" },
				oldTestament: { isChosen: false, label: "Genesis 50:20" },
			});
		});
	});

	it("marks a preferred view only when Berean Study names one", async () => {
		await inStudy(async (setup) => {
			const romans = await publish(setup.tx, "romans", 8, {
				28: "And we know…",
			});
			const view = (key: string, name: string) => ({
				argument: paragraph(text(`${name} argument`)),
				heldBy: [{ label: `${name} scholars`, sourceId: 1 }],
				key,
				name,
			});
			const question = (preferred: boolean) => ({
				passage: "Romans 8:28",
				preferredViewKey: preferred ? "b" : null,
				question: "Who works all things together?",
				stance: preferred ? "preferred_view" : "no_position",
				views: [view("a", "All things work"), view("b", "God works")],
				whyItMatters: "It shapes how we read suffering.",
			});
			const on28 = [
				{
					bookId: romans,
					from: [8, 28] as [number, number],
					to: [8, 28] as [number, number],
				},
			];
			await addContent(setup, {
				body: question(false),
				kind: "interpretive_question",
				passages: on28,
				scopeKey: "q-1",
				title: "A neutral question",
			});
			await addContent(setup, {
				body: question(true),
				kind: "interpretive_question",
				passages: on28,
				scopeKey: "q-2",
				title: "B preferred question",
			});

			const items = (await getVerseStudy(setup.tx, studied([28])))?.groups[0]
				?.items;
			const [neutral, preferred] = items ?? [];
			if (
				neutral?.kind !== "different_views" ||
				preferred?.kind !== "different_views"
			)
				throw new Error("No views");
			expect(neutral.takesNoSide).toBe(true);
			expect(neutral.views.map((item) => item.preferred)).toEqual([
				false,
				false,
			]);
			expect(neutral.views[0]?.heldBy).toEqual(["All things work scholars"]);
			expect(preferred.takesNoSide).toBe(false);
			expect(preferred.views.map((item) => item.preferred)).toEqual([
				false,
				true,
			]);
		});
	});

	it("covers every chosen verse, even out of order", async () => {
		await inStudy(async (setup) => {
			const romans = await publish(setup.tx, "romans", 8, {
				28: "And we know…",
				29: "For whom…",
				33: "Who shall lay…",
			});
			await addContent(setup, {
				body: {
					heading: "God's elect",
					note: paragraph(text("Some copies punctuate this as a question.")),
					passage: "Romans 8:33",
					relatedVariant: null,
				},
				kind: "textual_note",
				passages: [{ bookId: romans, from: [8, 33], to: [8, 33] }],
				scopeKey: "tn-1",
			});
			const study = await getVerseStudy(setup.tx, studied([33, 28, 29]));
			expect(study?.reference).toBe("Romans 8:28–29, 33");
			expect(study?.groups[0]).toMatchObject({
				key: "about_the_text",
				name: "About the text",
				items: [{ heading: "God's elect", kind: "text_note" }],
			});
		});
	});
});

describe("reporting a problem with a study note", () => {
	it("sends it to Content Issues against the revision the reader saw", async () => {
		await inStudy(async (setup) => {
			await applyAccessCatalogue(setup.tx);
			const member = await createPerson(setup.tx);
			const romans = await publish(setup.tx, "romans", 8, {
				28: "And we know…",
			});
			const { revisionId } = await addContent(setup, {
				body: { kind: "parallel", note: "Linked.", twoWay: false },
				kind: "cross_reference",
				passages: [{ bookId: romans, from: [8, 28], to: [8, 28] }],
				scopeKey: "romans:8:28>romans:8:29",
			});

			await reportStudyProblem(setup.tx, {
				actorUserId: member.id,
				description: "  The link goes to the wrong verse. ",
				issueType: "broken_reference",
				revisionId,
			});
			const issues = await setup.tx
				.select({
					contentRevisionId: contentIssues.contentRevisionId,
					description: contentIssues.description,
					issueType: contentIssues.issueType,
					status: contentIssues.status,
				})
				.from(contentIssues)
				.where(eq(contentIssues.reportedByUserId, member.id));
			expect(issues).toEqual([
				{
					contentRevisionId: revisionId,
					description: "The link goes to the wrong verse.",
					issueType: "broken_reference",
					status: "open",
				},
			]);
		});
	});

	it("refuses drafts, other kinds of content and empty descriptions", async () => {
		await inStudy(async (setup) => {
			await applyAccessCatalogue(setup.tx);
			const member = await createPerson(setup.tx);
			const romans = await publish(setup.tx, "romans", 8, {
				28: "And we know…",
			});
			const on28 = [
				{
					bookId: romans,
					from: [8, 28] as [number, number],
					to: [8, 28] as [number, number],
				},
			];
			const draft = await addContent(setup, {
				body: {},
				kind: "verse_commentary",
				live: false,
				passages: on28,
				scopeKey: "romans:8:28",
			});
			const overview = await addContent(setup, {
				body: {},
				kind: "book_overview",
				passages: [],
				scopeKey: "romans",
			});
			const live = await addContent(setup, {
				body: {},
				kind: "textual_note",
				passages: on28,
				scopeKey: "tn",
			});
			const report = (revisionId: number, description = "Wrong.") =>
				reportStudyProblem(setup.tx, {
					actorUserId: member.id,
					description,
					issueType: "typo",
					revisionId,
				});
			await expect(report(draft.revisionId)).rejects.toThrow(
				"We couldn't find this note.",
			);
			await expect(report(overview.revisionId)).rejects.toThrow(
				"We couldn't find this note.",
			);
			await expect(report(live.revisionId, "   ")).rejects.toThrow(
				"Describe the issue.",
			);
		});
	});

	it("stops one member sending more than a day's worth", async () => {
		await inStudy(async (setup) => {
			await applyAccessCatalogue(setup.tx);
			const member = await createPerson(setup.tx);
			const romans = await publish(setup.tx, "romans", 8, {
				28: "And we know…",
			});
			const { revisionId } = await addContent(setup, {
				body: {},
				kind: "textual_note",
				passages: [{ bookId: romans, from: [8, 28], to: [8, 28] }],
				scopeKey: "tn",
			});
			await setup.tx.insert(contentIssues).values(
				Array.from({ length: dailyStudyReportLimit }, () => ({
					contentRevisionId: revisionId,
					description: "Earlier report",
					issueType: "other" as const,
					reportedByUserId: member.id,
				})),
			);
			await expect(
				reportStudyProblem(setup.tx, {
					actorUserId: member.id,
					description: "One more",
					issueType: "other",
					revisionId,
				}),
			).rejects.toThrow("You've sent a lot of reports today.");
			const count = await setup.tx
				.select({ id: contentIssues.id })
				.from(contentIssues)
				.where(
					and(
						eq(contentIssues.reportedByUserId, member.id),
						eq(contentIssues.description, "One more"),
					),
				);
			expect(count).toEqual([]);
		});
	});
});
