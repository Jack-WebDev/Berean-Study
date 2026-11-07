import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import { getCommentaryEditor } from "../src/commentary";
import type { CommentaryBody } from "../src/commentary-body";
import { getRevisionPage } from "../src/content-queues";
import {
	approveRevision,
	checksFor,
	discardDraft,
	publishRevision,
	recordCheck,
	requestChanges,
	saveDraft,
	submitRevision,
	withdrawLive,
} from "../src/content-workflow";
import type { DbExecutor } from "../src/db-executor";
import { mergeSources, saveEvidenceDraft, sourceUsedIn } from "../src/evidence";
import {
	orderedThemePassages,
	type QuestionBody,
	questionChecklist,
	type ThemeBody,
} from "../src/interpretation-body";
import {
	emptyTextualVariantBody,
	textualVariantChecklist,
} from "../src/language-body";
import { parsePassageKey, passageKey } from "../src/passage-key";
import { getPassageStudyContext } from "../src/passages";
import { books } from "../src/schema/books";
import { chapters } from "../src/schema/chapters";
import { contentItems } from "../src/schema/content_items";
import { contentRevisions } from "../src/schema/content_revisions";
import { passageRanges } from "../src/schema/passage_ranges";
import { passages } from "../src/schema/passages";
import { themes } from "../src/schema/themes";
import { verses } from "../src/schema/verses";
import { versificationSystems } from "../src/schema/versification_systems";
import { linkedContentCounts } from "../src/scripture-data";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import {
	addPassageToTheme,
	getPassageConnections,
	getPassageLanguage,
	getStudyRecord,
	getThemeEditor,
	listFoundationalConfirmations,
	proposeThemeMerge,
	requestPublicationConfirmation,
	resolveConnection,
	saveStudyDraft,
} from "../src/study-content";
import { decideChange, listProposals } from "../src/two-person";
import {
	createPerson,
	inRolledBackTransaction,
	withFreshCatalogue,
} from "./governance-helpers";

const paragraph = (...content: unknown[]) => ({
	content: [{ content, type: "paragraph" }],
	type: "doc",
});
const words = (text: string) => paragraph({ text, type: "text" });

async function setUp(tx: DbExecutor) {
	await withFreshCatalogue(tx);
	await applyScriptureCatalogue(tx);
	// Other work in the shared database shouldn't count towards these tests.
	await tx.execute(
		sql`TRUNCATE TABLE content_items, content_revisions, sources, claims, research_notes, themes CASCADE`,
	);
	return {
		admin: await createPerson(tx, "Admin"),
		checker: await createPerson(tx, "Contributor"),
		greek: await createPerson(tx, "Greek Reviewer"),
		member: await createPerson(tx),
		secondSuperadmin: await createPerson(tx, "Superadmin"),
		superadmin: await createPerson(tx, "Superadmin"),
		writer: await createPerson(tx, "Contributor"),
	};
}
type People = Awaited<ReturnType<typeof setUp>>;
type Saved = { revisionId: number };

async function standardVersification(tx: DbExecutor) {
	const [system] = await tx
		.select({ id: versificationSystems.id })
		.from(versificationSystems)
		.limit(1);
	if (!system) throw new Error("Needs a versification system");
	return system.id;
}

/** The row for one verse, created if nobody has entered it. */
async function storedVerse(
	tx: DbExecutor,
	bookSlug: string,
	chapterNumber: number,
	verseNumber: number,
) {
	const [book] = await tx
		.select({ id: books.id })
		.from(books)
		.where(eq(books.slug, bookSlug));
	if (!book) throw new Error("Needs the book");
	await tx
		.insert(chapters)
		.values({
			bookId: book.id,
			number: chapterNumber,
			versificationSystemId: await standardVersification(tx),
		})
		.onConflictDoNothing();
	const [chapter] = await tx
		.select({ id: chapters.id })
		.from(chapters)
		.where(
			and(eq(chapters.bookId, book.id), eq(chapters.number, chapterNumber)),
		);
	if (!chapter) throw new Error("Needs the chapter");
	await tx
		.insert(verses)
		.values({ chapterId: chapter.id, number: verseNumber })
		.onConflictDoNothing();
	const [verse] = await tx
		.select({ id: verses.id })
		.from(verses)
		.where(
			and(eq(verses.chapterId, chapter.id), eq(verses.number, verseNumber)),
		);
	if (!verse) throw new Error("Needs the verse");
	return verse.id;
}

async function approveAs(
	tx: DbExecutor,
	people: People,
	saved: Saved,
	kind: string,
	body: unknown,
) {
	await submitRevision(tx, {
		actorUserId: people.writer.id,
		revisionId: saved.revisionId,
	});
	for (const check of await checksFor(tx, kind, body)) {
		await recordCheck(tx, {
			actorUserId: check.originalLanguageOnly
				? people.greek.id
				: people.checker.id,
			checklistId: check.id,
			note: "",
			result: "passed",
			revisionId: saved.revisionId,
		});
	}
	await approveRevision(tx, {
		actorUserId: people.checker.id,
		revisionId: saved.revisionId,
	});
}

async function publishAs(
	tx: DbExecutor,
	people: People,
	saved: Saved,
	kind: string,
	body: unknown,
) {
	await approveAs(tx, people, saved, kind, body);
	await publishRevision(tx, {
		actorUserId: people.admin.id,
		revisionId: saved.revisionId,
	});
}

const crossReferenceBody = {
	kind: "parallel",
	note: "Harm intended by people, turned to good by God.",
	twoWay: false,
};

const view = (key: string, name: string, extra = {}) => ({
	argument: words(`The case for ${name}.`),
	heldBy: [],
	key,
	name,
	...extra,
});

const questionBody: QuestionBody = {
	passage: "Romans 7:14-25",
	preferredViewKey: null,
	question: 'Who is the "I" in Romans 7?',
	stance: "no_position",
	views: [
		view("a", "A believer's struggle"),
		view("b", "Life under the law"),
	] as QuestionBody["views"],
	whyItMatters: "It shapes how chapter 7 leads into chapter 8.",
};

const themeBody = (name: string, ...references: string[]): ThemeBody => ({
	description: words("Scripture presents God directing events.") as never,
	name,
	order: "canonical",
	passages: references.map((reference, index) => ({
		key: `passage-${index}`,
		reference,
		role: index === 0 ? "key_text" : "supporting",
		why: "It belongs here.",
	})),
	relatedThemes: [],
	summary: "God's good governance.",
});

const noteBody = {
	gloss: "work together",
	language: "greek",
	lemma: "συνεργέω",
	lexiconKey: "G4903",
	note: words("Paul is speaking of God at work."),
	parsing: "Verb, present active indicative",
	passage: "Romans 8:28",
	word: "συνεργεῖ",
};

const variantBody = {
	confidence: "probable",
	kind: "addition",
	location: "Rom 8:28, with or without ὁ θεός",
	passage: "Romans 8:28",
	readings: [
		{
			gloss: "all things work together",
			key: "r1",
			preferred: true,
			text: "πάντα συνεργεῖ",
			witnesses: ["א", "C"],
		},
		{
			gloss: "God works all things together",
			key: "r2",
			preferred: false,
			text: "πάντα συνεργεῖ ὁ θεός",
			witnesses: ["𝔓46"],
		},
	],
	reason: words("Wide and varied support for the shorter reading."),
};

async function publishedQuestion(tx: DbExecutor, people: People) {
	const saved = await saveStudyDraft(tx, {
		actorUserId: people.writer.id,
		body: questionBody,
		kind: "interpretive_question",
		scopeKey: null,
	});
	await publishAs(tx, people, saved, "interpretive_question", questionBody);
	return saved;
}

async function publishedTheme(tx: DbExecutor, people: People, body: ThemeBody) {
	const saved = await saveStudyDraft(tx, {
		actorUserId: people.writer.id,
		body,
		kind: "theme",
		scopeKey: null,
	});
	await publishAs(tx, people, saved, "theme", body);
	return saved;
}

describe("passage keys", () => {
	it("reads back what it writes", () => {
		const range = {
			bookSlug: "1-john",
			from: { chapter: 2, verse: 1 },
			to: { chapter: 2, verse: 6 },
		};
		expect(passageKey(range)).toBe("1-john:2:1-2:6");
		expect(parsePassageKey("1-john:2:1-2:6")).toEqual(range);
	});

	it("writes one verse without a range", () => {
		const point = { chapter: 8, verse: 28 };
		expect(passageKey({ bookSlug: "romans", from: point, to: point })).toBe(
			"romans:8:28",
		);
	});

	it("refuses a key that runs backwards or isn't a key", () => {
		expect(parsePassageKey("romans:8:30-8:18")).toBeNull();
		expect(parsePassageKey("Romans 8:28")).toBeNull();
	});
});

describe("the Fairness check", () => {
	const blocked = (body: QuestionBody) =>
		questionChecklist(body)
			.filter(({ blocking, ok }) => blocking && !ok)
			.map(({ text }) => text);

	it("blocks a question with fewer than two views", () => {
		expect(
			blocked({ ...questionBody, views: questionBody.views.slice(0, 1) }),
		).toEqual(["Gives at least two views"]);
	});

	it("blocks a view with no name or argument", () => {
		const [first, second] = questionBody.views;
		if (!first || !second) throw new Error("Needs two views");
		expect(
			blocked({ ...questionBody, views: [{ ...first, name: "" }, second] }),
		).toEqual(["Every view has a name and an argument"]);
	});

	it("only warns about missing sources and citations", () => {
		const items = questionChecklist(questionBody);
		expect(blocked(questionBody)).toEqual([]);
		expect(items.filter(({ ok }) => !ok).map(({ text }) => text)).toEqual([
			"No source named for A believer's struggle, Life under the law",
			"No citations for A believer's struggle, Life under the law",
		]);
	});

	it("needs the preferred view named when the stance has one", () => {
		expect(blocked({ ...questionBody, stance: "preferred_view" })).toEqual([
			"Says which view is preferred",
		]);
		expect(
			blocked({
				...questionBody,
				preferredViewKey: "b",
				stance: "preferred_view",
			}),
		).toEqual([]);
	});
});

describe("a textual variant's checklist", () => {
	it("needs two readings and exactly one preferred", () => {
		const reading = (key: string, preferred: boolean) => ({
			gloss: "",
			key,
			preferred,
			text: "πάντα",
			witnesses: [],
		});
		const blocked = (readings: ReturnType<typeof reading>[]) =>
			textualVariantChecklist({ ...emptyTextualVariantBody, readings })
				.filter(({ blocking, ok }) => blocking && !ok)
				.map(({ text }) => text);
		expect(blocked([reading("a", true)])).toContain(
			"Has at least two readings, each with its text",
		);
		expect(blocked([reading("a", true), reading("b", true)])).toContain(
			"Marks one reading as preferred",
		);
		expect(blocked([reading("a", true), reading("b", false)])).not.toContain(
			"Marks one reading as preferred",
		);
	});
});

describe("theme passage order", () => {
	const positions = { Genesis: 1, Psalms: 19, Romans: 45 };
	const passages = ["Romans 8:28", "Psalm 44:22", "Genesis 50:20"].map(
		(reference) => ({
			key: reference,
			reference,
			role: "supporting" as const,
			why: "",
		}),
	);

	it("follows the canon, reading Psalm as Psalms", () => {
		expect(
			orderedThemePassages({ order: "canonical", passages }, positions).map(
				({ reference }) => reference,
			),
		).toEqual(["Genesis 50:20", "Psalm 44:22", "Romans 8:28"]);
	});

	it("keeps the writer's order when it's custom", () => {
		expect(
			orderedThemePassages({ order: "custom", passages }, positions).map(
				({ reference }) => reference,
			),
		).toEqual(["Romans 8:28", "Psalm 44:22", "Genesis 50:20"]);
	});
});

describe.runIf(process.env.DATABASE_URL)("study content", () => {
	afterAll(async () => {
		await pool.end();
	});

	describe("connections", () => {
		it("gives the same address however the passages are typed", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				await expect(
					resolveConnection(tx, {
						first: "Rom 8:28",
						kind: "cross_reference",
						second: "Genesis 50:20",
					}),
				).resolves.toEqual({
					existed: false,
					scopeKey: "romans:8:28>genesis:50:20",
				});
			});
		});

		it("opens the existing link when the same one is started backwards", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const scopeKey = "romans:8:28>genesis:50:20";
				await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: crossReferenceBody,
					kind: "cross_reference",
					scopeKey,
				});
				await expect(
					resolveConnection(tx, {
						first: "Genesis 50:20",
						kind: "cross_reference",
						second: "Romans 8:28",
					}),
				).resolves.toEqual({ existed: true, scopeKey });
				await expect(
					saveStudyDraft(tx, {
						actorUserId: people.writer.id,
						body: crossReferenceBody,
						kind: "cross_reference",
						scopeKey: "genesis:50:20>romans:8:28",
					}),
				).rejects.toThrow("already links to");
			});
		});

		it("refuses a passage linked to itself, or a whole chapter", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				await expect(
					resolveConnection(tx, {
						first: "Romans 8:28",
						kind: "cross_reference",
						second: "Rom 8:28",
					}),
				).rejects.toThrow("can't connect to itself");
				await expect(
					resolveConnection(tx, {
						first: "Romans 8",
						kind: "cross_reference",
						second: "Genesis 50:20",
					}),
				).rejects.toThrow("Include the verse");
			});
		});

		it("always runs a canonical relationship from New Testament to Old", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				const scopeKey = "romans:8:36<psalms:44:22";
				for (const [first, second] of [
					["Romans 8:36", "Psalm 44:22"],
					["Psalm 44:22", "Romans 8:36"],
				] as const) {
					await expect(
						resolveConnection(tx, {
							first,
							kind: "canonical_relationship",
							second,
						}),
					).resolves.toEqual({ existed: false, scopeKey });
				}
				await expect(
					resolveConnection(tx, {
						first: "Romans 8:36",
						kind: "canonical_relationship",
						second: "John 3:16",
					}),
				).rejects.toThrow("joins a New Testament passage");
			});
		});

		it("lists a link on both its passages, flagging a one-way link on its target", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: crossReferenceBody,
					kind: "cross_reference",
					scopeKey: "romans:8:28>genesis:50:20",
				});
				const onSource = await getPassageConnections(tx, "romans:8:28");
				expect(onSource?.items).toMatchObject([
					{
						kind: "cross_reference",
						meta: "Parallel thought",
						status: "draft",
						target: "Genesis 50:20",
					},
				]);
				const onTarget = await getPassageConnections(tx, "genesis:50:20");
				expect(onTarget?.items).toMatchObject([
					{
						meta: "Parallel thought · Readers don't see this one here",
						target: "Romans 8:28",
					},
				]);
			});
		});

		it("counts on a verse, from the newest revision", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const verse = await storedVerse(tx, "romans", 8, 28);
				await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: crossReferenceBody,
					kind: "cross_reference",
					scopeKey: "romans:8:28>genesis:50:20",
				});
				await publishedTheme(
					tx,
					people,
					themeBody("Providence", "Romans 8:18-30"),
				);
				await expect(linkedContentCounts(tx, verse)).resolves.toEqual({
					commentary: 0,
					crossReferences: 1,
					themes: 1,
				});
			});
		});

		it("removes everything when its only draft is thrown away", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: crossReferenceBody,
					kind: "cross_reference",
					scopeKey: "romans:8:28>genesis:50:20",
				});
				await discardDraft(tx, {
					actorUserId: people.writer.id,
					revisionId: saved.revisionId,
				});
				await expect(
					resolveConnection(tx, {
						first: "Romans 8:28",
						kind: "cross_reference",
						second: "Genesis 50:20",
					}),
				).resolves.toMatchObject({ existed: false });
				const again = await getPassageConnections(tx, "romans:8:28");
				expect(again?.items).toEqual([]);
			});
		});
	});

	describe("who can write what", () => {
		it("keeps language content to people who can write it, and sends it to a Greek Reviewer", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await expect(
					saveStudyDraft(tx, {
						actorUserId: people.greek.id,
						body: noteBody,
						kind: "original_language_note",
						scopeKey: null,
					}),
				).rejects.toThrow("You don't have permission");
				const saved = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: noteBody,
					kind: "original_language_note",
					scopeKey: null,
				});
				const checks = await checksFor(tx, "original_language_note", noteBody);
				expect(
					checks.some(({ originalLanguageOnly }) => originalLanguageOnly),
				).toBe(true);
				await submitRevision(tx, {
					actorUserId: people.writer.id,
					revisionId: saved.revisionId,
				});
				const greekCheck = checks.find(
					({ originalLanguageOnly }) => originalLanguageOnly,
				);
				if (!greekCheck) throw new Error("Needs the check");
				await expect(
					recordCheck(tx, {
						actorUserId: people.checker.id,
						checklistId: greekCheck.id,
						note: "",
						result: "passed",
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow("original-language");
			});
		});

		it("doesn't ask a Greek Reviewer about a question with no Greek in it", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				const checks = await checksFor(
					tx,
					"interpretive_question",
					questionBody,
				);
				expect(
					checks.some(({ originalLanguageOnly }) => originalLanguageOnly),
				).toBe(false);
			});
		});

		it("won't take an address it didn't make for a new question", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await expect(
					saveDraft(tx, {
						actorUserId: people.writer.id,
						body: questionBody,
						kind: "interpretive_question",
						scopeKey: "made-up",
					}),
				).rejects.toThrow("no longer exists");
			});
		});
	});

	describe("publishing what a record rests on first", () => {
		it("won't send a question for review with a passage that can't be read", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: { ...questionBody, passage: "Hezekiah 3:1" },
					kind: "interpretive_question",
					scopeKey: null,
				});
				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow('find a book called "Hezekiah"');
			});
		});

		it("needs a view's named source live before the question", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await saveEvidenceDraft(tx, {
					actorUserId: people.writer.id,
					body: {
						authors: "C. E. B. Cranfield",
						edition: "",
						publisher: "T&T Clark",
						title: "Romans",
						type: "commentary",
						year: "1975",
					},
					kind: "source",
				});
				const body = {
					...questionBody,
					views: questionBody.views.map((one) => ({
						...one,
						heldBy: [{ label: "Cranfield, Romans", sourceId: source.id }],
					})),
				};
				const saved = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body,
					kind: "interpretive_question",
					scopeKey: null,
				});
				await approveAs(tx, people, saved, "interpretive_question", body);
				await expect(
					publishRevision(tx, {
						actorUserId: people.admin.id,
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow("can't go live before what it rests on");
			});
		});

		it("needs a related variant live before the textual note", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const variant = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: variantBody,
					kind: "textual_variant",
					scopeKey: null,
				});
				const body = {
					heading: "Does Paul name God here?",
					note: words("A few early manuscripts add the word God."),
					passage: "Romans 8:28",
					relatedVariant: {
						label: "Rom 8:28",
						scopeKey: variant.scopeKey,
					},
				};
				const note = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body,
					kind: "textual_note",
					scopeKey: null,
				});
				await approveAs(tx, people, note, "textual_note", body);
				await expect(
					publishRevision(tx, {
						actorUserId: people.admin.id,
						revisionId: note.revisionId,
					}),
				).rejects.toThrow("Publish");
				await publishAs(tx, people, variant, "textual_variant", variantBody);
				await publishRevision(tx, {
					actorUserId: people.admin.id,
					revisionId: note.revisionId,
				});
			});
		});

		it("needs a block placed in commentary live first, and then keeps it from being withdrawn", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const question = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: questionBody,
					kind: "interpretive_question",
					scopeKey: null,
				});
				const body: CommentaryBody = {
					sections: [
						{
							body: {
								content: [
									{
										attrs: {
											kind: "interpretive_question",
											label: "Who is the I?",
											scopeKey: question.scopeKey,
										},
										type: "contentBlock",
									},
								],
								type: "doc",
							},
							key: "s1",
							range: "",
							title: "Who is speaking",
						},
					],
					title: "On Romans 7",
				};
				const commentary = await saveDraft(tx, {
					actorUserId: people.writer.id,
					body,
					kind: "verse_commentary",
					scopeKey: "romans:7:14",
				});
				await approveAs(tx, people, commentary, "verse_commentary", body);
				await expect(
					publishRevision(tx, {
						actorUserId: people.admin.id,
						revisionId: commentary.revisionId,
					}),
				).rejects.toThrow("can't go live before something it shows readers");

				await publishAs(
					tx,
					people,
					question,
					"interpretive_question",
					questionBody,
				);
				await publishRevision(tx, {
					actorUserId: people.admin.id,
					revisionId: commentary.revisionId,
				});
				await expect(
					withdrawLive(tx, {
						actorUserId: people.admin.id,
						contentItemId: question.contentItemId,
						reason: "Changed our mind",
					}),
				).rejects.toThrow("shows this to readers");
				await expect(
					getCommentaryEditor(
						tx,
						{ kind: "verse_commentary", scopeKey: "romans:7:14" },
						people.writer.id,
					),
				).resolves.toMatchObject({ scopeLabel: "Romans 7:14" });
			});
		});
	});

	describe("a stance change", () => {
		const changed: QuestionBody = {
			...questionBody,
			preferredViewKey: "a",
			stance: "preferred_view",
		};

		async function approvedChange(tx: DbExecutor, people: People) {
			const first = await publishedQuestion(tx, people);
			const second = await saveStudyDraft(tx, {
				actorUserId: people.writer.id,
				body: changed,
				kind: "interpretive_question",
				scopeKey: first.scopeKey,
			});
			await approveAs(tx, people, second, "interpretive_question", changed);
			return { first, second };
		}

		it("doesn't need a second Superadmin on first publishing", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: changed,
					kind: "interpretive_question",
					scopeKey: null,
				});
				await publishAs(tx, people, saved, "interpretive_question", changed);
			});
		});

		it("can't be published by an Admin, or by one Superadmin alone", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { second } = await approvedChange(tx, people);
				for (const actor of [people.admin, people.superadmin]) {
					await expect(
						publishRevision(tx, {
							actorUserId: actor.id,
							revisionId: second.revisionId,
						}),
					).rejects.toThrow("Two Superadmins have to agree");
				}
			});
		});

		it("can't be sent for confirmation by an Admin", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { second } = await approvedChange(tx, people);
				await expect(
					requestPublicationConfirmation(tx, {
						actorUserId: people.admin.id,
						contentItemId: second.contentItemId,
						reason: "Please",
						revisionId: second.revisionId,
					}),
				).rejects.toThrow("Only a Superadmin");
			});
		});

		it("goes live when a different Superadmin confirms, and not before", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { second } = await approvedChange(tx, people);
				await requestPublicationConfirmation(tx, {
					actorUserId: people.superadmin.id,
					contentItemId: second.contentItemId,
					reason: "The editors agreed",
					revisionId: second.revisionId,
				});
				const [proposal] = await listProposals(tx, {
					kinds: ["guarded_publication"],
					status: "proposed",
				});
				if (!proposal) throw new Error("Needs a proposal");

				const page = await getRevisionPage(
					tx,
					{
						contentItemId: second.contentItemId,
						revisionId: second.revisionId,
					},
					people.superadmin.id,
				);
				expect(page?.foundationalChange).toMatchObject({
					change: expect.stringContaining("taking no position"),
					pending: { id: proposal.id, proposedByMe: true },
				});

				await expect(
					decideChange(tx, {
						decision: "confirm",
						deciderUserId: people.superadmin.id,
						note: "Me again",
						proposalId: proposal.id,
					}),
				).rejects.toThrow();
				await expect(
					listFoundationalConfirmations(tx, people.secondSuperadmin.id),
				).resolves.toMatchObject([{ id: proposal.id, proposedByMe: false }]);
				await decideChange(tx, {
					decision: "confirm",
					deciderUserId: people.secondSuperadmin.id,
					note: "Agreed",
					proposalId: proposal.id,
				});

				const [revision] = await tx
					.select({
						publishedBy: contentRevisions.publishedByUserId,
						status: contentRevisions.status,
					})
					.from(contentRevisions)
					.where(eq(contentRevisions.id, second.revisionId));
				expect(revision).toEqual({
					publishedBy: people.secondSuperadmin.id,
					status: "published",
				});
			});
		});

		it("can't slip through by withdrawing first", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { first, second } = await approvedChange(tx, people);
				await withdrawLive(tx, {
					actorUserId: people.admin.id,
					contentItemId: first.contentItemId,
					reason: "Trying to get around it",
				});
				await expect(
					publishRevision(tx, {
						actorUserId: people.admin.id,
						revisionId: second.revisionId,
					}),
				).rejects.toThrow("Two Superadmins have to agree");
			});
		});

		it("isn't triggered by changing other wording", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const first = await publishedQuestion(tx, people);
				const body = { ...questionBody, whyItMatters: "Better wording." };
				const second = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body,
					kind: "interpretive_question",
					scopeKey: first.scopeKey,
				});
				await publishAs(tx, people, second, "interpretive_question", body);
			});
		});

		it("can't be confirmed once it's been sent back", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { second } = await approvedChange(tx, people);
				await requestPublicationConfirmation(tx, {
					actorUserId: people.superadmin.id,
					contentItemId: second.contentItemId,
					reason: "Please",
					revisionId: second.revisionId,
				});
				const [proposal] = await listProposals(tx, {
					kinds: ["guarded_publication"],
					status: "proposed",
				});
				if (!proposal) throw new Error("Needs a proposal");
				await requestChanges(tx, {
					actorUserId: people.checker.id,
					feedback: "Not yet",
					revisionId: second.revisionId,
				});
				await expect(
					decideChange(tx, {
						decision: "confirm",
						deciderUserId: people.secondSuperadmin.id,
						note: "Agreed",
						proposalId: proposal.id,
					}),
				).rejects.toThrow("Only an approved revision");
				await expect(
					listFoundationalConfirmations(tx, people.secondSuperadmin.id),
				).resolves.toEqual([]);
			});
		});
	});

	describe("themes", () => {
		it("makes a theme with a row behind it, and removes both with its only draft", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: themeBody("Providence", "Romans 8:28"),
					kind: "theme",
					scopeKey: null,
				});
				const id = Number(saved.scopeKey);
				expect(
					await tx.select().from(themes).where(eq(themes.id, id)),
				).toHaveLength(1);
				await discardDraft(tx, {
					actorUserId: people.writer.id,
					revisionId: saved.revisionId,
				});
				expect(
					await tx.select().from(themes).where(eq(themes.id, id)),
				).toHaveLength(0);
			});
		});

		it("refuses a name another theme has", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: themeBody("Providence", "Romans 8:28"),
					kind: "theme",
					scopeKey: null,
				});
				await expect(
					saveStudyDraft(tx, {
						actorUserId: people.checker.id,
						body: themeBody("providence", "Genesis 50:20"),
						kind: "theme",
						scopeKey: null,
					}),
				).rejects.toThrow('A theme called "Providence" already exists');
			});
		});

		it("adds a verse's passage to the theme's draft, once", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await publishedTheme(
					tx,
					people,
					themeBody("Providence", "Romans 8:28"),
				);
				const themeId = Number(saved.scopeKey);
				const add = (actorUserId: string, passage: string) =>
					addPassageToTheme(tx, {
						actorUserId,
						key: "new-passage",
						passage,
						role: "narrative_example",
						themeId,
						why: "Joseph's story.",
					});
				await add(people.writer.id, "Gen 50:20");
				const record = await getStudyRecord(
					tx,
					{ kind: "theme", scopeKey: saved.scopeKey },
					people.writer.id,
				);
				expect(record?.state.open?.number).toBe(2);
				expect(record?.body.passages.map(({ reference }) => reference)).toEqual(
					["Romans 8:28", "Genesis 50:20"],
				);
				await expect(add(people.writer.id, "Genesis 50:20")).rejects.toThrow(
					"already in",
				);
				// Someone else's draft of the theme is theirs to finish.
				await expect(add(people.checker.id, "Psalm 44:22")).rejects.toThrow(
					"already working on a draft",
				);
				const connections = await getPassageConnections(tx, "genesis:50:20");
				expect(connections?.items).toMatchObject([
					{ kind: "theme", target: "Providence" },
				]);
			});
		});

		it("needs two Superadmins for a published rename", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await publishedTheme(
					tx,
					people,
					themeBody("Providence", "Romans 8:28"),
				);
				const body = themeBody("God's Providence", "Romans 8:28");
				const second = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body,
					kind: "theme",
					scopeKey: saved.scopeKey,
				});
				await approveAs(tx, people, second, "theme", body);
				await expect(
					publishRevision(tx, {
						actorUserId: people.admin.id,
						revisionId: second.revisionId,
					}),
				).rejects.toThrow("renames the published theme");
			});
		});

		it("keeps a published theme's name in lists until the rename goes live", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await publishedTheme(
					tx,
					people,
					themeBody("Providence", "Romans 8:28"),
				);
				await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: themeBody("God's Providence", "Romans 8:28"),
					kind: "theme",
					scopeKey: saved.scopeKey,
				});
				const [item] = await tx
					.select({ title: contentItems.title })
					.from(contentItems)
					.where(eq(contentItems.id, saved.contentItemId));
				expect(item?.title).toBe("Providence");
			});
		});

		async function twoLiveThemes(tx: DbExecutor, people: People) {
			const kept = await publishedTheme(
				tx,
				people,
				themeBody("Providence", "Romans 8:28", "Genesis 50:20"),
			);
			const merged = await publishedTheme(
				tx,
				people,
				themeBody("God's Sovereignty", "Genesis 50:20", "Psalm 44:22"),
			);
			return { kept, merged };
		}

		async function proposeMerge(
			tx: DbExecutor,
			people: People,
			{ kept, merged }: Awaited<ReturnType<typeof twoLiveThemes>>,
		) {
			await proposeThemeMerge(tx, {
				actorUserId: people.superadmin.id,
				intoThemeId: Number(kept.scopeKey),
				reason: "These are the same theme",
				themeId: Number(merged.scopeKey),
			});
			const [proposal] = await listProposals(tx, {
				kinds: ["theme_merge"],
				status: "proposed",
			});
			if (!proposal) throw new Error("Needs a proposal");
			return proposal;
		}

		it("merges at once when a second Superadmin confirms", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const pair = await twoLiveThemes(tx, people);
				const proposal = await proposeMerge(tx, people, pair);
				await expect(
					decideChange(tx, {
						decision: "confirm",
						deciderUserId: people.superadmin.id,
						note: "Me again",
						proposalId: proposal.id,
					}),
				).rejects.toThrow();
				await decideChange(tx, {
					decision: "confirm",
					deciderUserId: people.secondSuperadmin.id,
					note: "Agreed",
					proposalId: proposal.id,
				});

				const kept = await getStudyRecord(
					tx,
					{ kind: "theme", scopeKey: pair.kept.scopeKey },
					people.writer.id,
				);
				expect(kept?.state.live?.number).toBe(2);
				expect(kept?.body.passages.map(({ reference }) => reference)).toEqual([
					"Romans 8:28",
					"Genesis 50:20",
					"Psalm 44:22",
				]);
				const gone = await getStudyRecord(
					tx,
					{ kind: "theme", scopeKey: pair.merged.scopeKey },
					people.writer.id,
				);
				expect(gone?.state.live).toBeNull();
				const [row] = await tx
					.select({
						into: themes.mergedIntoThemeId,
						status: themes.status,
					})
					.from(themes)
					.where(eq(themes.id, Number(pair.merged.scopeKey)));
				expect(row).toEqual({
					into: Number(pair.kept.scopeKey),
					status: "merged",
				});

				await expect(
					saveStudyDraft(tx, {
						actorUserId: people.writer.id,
						body: themeBody("God's Sovereignty", "Psalm 44:22"),
						kind: "theme",
						scopeKey: pair.merged.scopeKey,
					}),
				).rejects.toThrow("merged into another one");

				const editor = await getThemeEditor(
					tx,
					{ themeId: Number(pair.kept.scopeKey) },
					people.writer.id,
				);
				expect(editor?.otherThemes).toEqual([]);
			});
		});

		it("can't start or finish while either theme has a draft", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const pair = await twoLiveThemes(tx, people);
				const proposal = await proposeMerge(tx, people, pair);
				await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: themeBody("Providence", "Romans 8:28"),
					kind: "theme",
					scopeKey: pair.kept.scopeKey,
				});
				await expect(
					decideChange(tx, {
						decision: "confirm",
						deciderUserId: people.secondSuperadmin.id,
						note: "Agreed",
						proposalId: proposal.id,
					}),
				).rejects.toThrow("in progress");
			});
		});

		it("isn't for an Admin, or for themes that aren't published", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const live = await publishedTheme(
					tx,
					people,
					themeBody("Providence", "Romans 8:28"),
				);
				const draft = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: themeBody("Sovereignty", "Psalm 44:22"),
					kind: "theme",
					scopeKey: null,
				});
				const input = {
					intoThemeId: Number(live.scopeKey),
					reason: "Same",
					themeId: Number(draft.scopeKey),
				};
				await expect(
					proposeThemeMerge(tx, { ...input, actorUserId: people.admin.id }),
				).rejects.toThrow("Only a Superadmin");
				await expect(
					proposeThemeMerge(tx, {
						...input,
						actorUserId: people.superadmin.id,
					}),
				).rejects.toThrow("Only published themes");
			});
		});
	});

	describe("what a member's study panel shows", () => {
		async function storedPassage(
			tx: DbExecutor,
			bookSlug: string,
			chapter: number,
			verseNumber: number,
		) {
			const verse = await storedVerse(tx, bookSlug, chapter, verseNumber);
			const [book] = await tx
				.select({ id: books.id })
				.from(books)
				.where(eq(books.slug, bookSlug));
			if (!book) throw new Error("Needs the book");
			const [passage] = await tx
				.insert(passages)
				.values({ bookId: book.id, title: `${bookSlug} ${chapter}` })
				.returning({ id: passages.id });
			if (!passage) throw new Error("Needs the passage");
			await tx.insert(passageRanges).values({
				endVerseId: verse,
				passageId: passage.id,
				startVerseId: verse,
				versificationSystemId: await standardVersification(tx),
			});
			return passage.id;
		}

		it("only includes what's live, and hides a one-way link on its target", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const romans = await storedPassage(tx, "romans", 8, 28);
				const genesis = await storedPassage(tx, "genesis", 50, 20);
				const context = (id: number) => getPassageStudyContext(tx as never, id);

				const link = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: crossReferenceBody,
					kind: "cross_reference",
					scopeKey: "romans:8:28>genesis:50:20",
				});
				await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body: themeBody("Unfinished", "Romans 8:28"),
					kind: "theme",
					scopeKey: null,
				});
				await expect(context(romans)).resolves.toMatchObject({
					relatedPassages: [],
					themes: [],
				});

				await publishAs(
					tx,
					people,
					link,
					"cross_reference",
					crossReferenceBody,
				);
				await publishedTheme(
					tx,
					people,
					themeBody("Providence", "Romans 8:28"),
				);
				await expect(context(romans)).resolves.toMatchObject({
					relatedPassages: [{ id: genesis }],
					themes: ["Providence"],
				});
				await expect(context(genesis)).resolves.toMatchObject({
					relatedPassages: [],
					themes: [],
				});
			});
		});

		it("shows a two-way link on both passages", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const romans = await storedPassage(tx, "romans", 8, 28);
				const genesis = await storedPassage(tx, "genesis", 50, 20);
				const body = { ...crossReferenceBody, twoWay: true };
				const link = await saveStudyDraft(tx, {
					actorUserId: people.writer.id,
					body,
					kind: "cross_reference",
					scopeKey: "romans:8:28>genesis:50:20",
				});
				await publishAs(tx, people, link, "cross_reference", body);
				await expect(
					getPassageStudyContext(tx as never, genesis),
				).resolves.toMatchObject({ relatedPassages: [{ id: romans }] });
			});
		});

		it("says nothing about a passage that doesn't exist", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				await expect(
					getPassageStudyContext(tx as never, -1),
				).resolves.toBeNull();
			});
		});
	});

	it("lists language content on the verses it's about", async () => {
		await inRolledBackTransaction(async (tx) => {
			const people = await setUp(tx);
			await saveStudyDraft(tx, {
				actorUserId: people.writer.id,
				body: noteBody,
				kind: "original_language_note",
				scopeKey: null,
			});
			const language = await getPassageLanguage(tx, "romans:8:28");
			expect(language?.items).toMatchObject([
				{
					kind: "original_language_note",
					status: "draft",
					title: "συνεργεῖ · Romans 8:28",
				},
			]);
			await expect(getPassageLanguage(tx, "Rom 8:28")).resolves.toMatchObject({
				key: "romans:8:28",
			});
			await expect(getPassageLanguage(tx, "Hezekiah 3")).resolves.toBeNull();
		});
	});

	it("lets merging sources carry what names them", async () => {
		await inRolledBackTransaction(async (tx) => {
			const people = await setUp(tx);
			const sourceBody = {
				authors: "C. E. B. Cranfield",
				edition: "",
				publisher: "T&T Clark",
				title: "Romans",
				type: "commentary",
				year: "1975",
			};
			const keep = await saveEvidenceDraft(tx, {
				actorUserId: people.writer.id,
				body: sourceBody,
				kind: "source",
			});
			const duplicate = await saveEvidenceDraft(tx, {
				actorUserId: people.writer.id,
				body: { ...sourceBody, year: "1979" },
				kind: "source",
			});
			await publishAs(tx, people, keep, "source", sourceBody);
			await publishAs(tx, people, duplicate, "source", {
				...sourceBody,
				year: "1979",
			});
			const body = {
				...questionBody,
				views: questionBody.views.map((one) => ({
					...one,
					heldBy: [{ label: "Cranfield", sourceId: duplicate.id }],
				})),
			};
			await saveStudyDraft(tx, {
				actorUserId: people.writer.id,
				body,
				kind: "interpretive_question",
				scopeKey: null,
			});
			await mergeSources(tx, {
				actorUserId: people.admin.id,
				keepSourceId: keep.id,
				mergeSourceId: duplicate.id,
				reason: "Same book",
			});
			const usedIn = await sourceUsedIn(tx, keep.id);
			expect(usedIn.map(({ meta }) => meta)).toEqual(
				expect.arrayContaining([expect.stringContaining("Names this source")]),
			);
		});
	});
});
