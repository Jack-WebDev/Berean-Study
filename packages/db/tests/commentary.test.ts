import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import {
	getCommentaryEditor,
	listCommentaries,
	resolveCommentaryScope,
	resolveEditorReference,
} from "../src/commentary";
import {
	type CommentaryBody,
	citationOffset,
	collectCitations,
	commentaryChecklist,
	commentaryCoverage,
	commentaryFields,
	commentaryProblems,
	commentaryScopeKey,
	containsOriginalTerm,
	formatCoverageGaps,
	parseCommentaryScopeKey,
	parseSectionRange,
	rangesOverlap,
	startingCommentaryBody,
} from "../src/commentary-body";
import { getRevisionPage } from "../src/content-queues";
import {
	approveRevision,
	discardDraft,
	publishRevision,
	recordCheck,
	saveDraft,
	submitRevision,
} from "../src/content-workflow";
import type { DbExecutor } from "../src/db-executor";
import { retireSource, saveEvidenceDraft } from "../src/evidence";
import { changeProposals } from "../src/schema/change_proposals";
import { citations } from "../src/schema/citations";
import { contentItems } from "../src/schema/content_items";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import { decideChange } from "../src/two-person";
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
const citationNode = (excerptId: number, locator = "p. 439") => ({
	attrs: {
		excerptId,
		label: "Cranfield: on 8:35",
		locator,
		strength: "direct",
	},
	type: "citation",
});

function section(
	key: string,
	title: string,
	range: string,
	body: unknown,
): CommentaryBody["sections"][number] {
	return { body, key, range, title } as CommentaryBody["sections"][number];
}

const romans818 = parseCommentaryScopeKey(
	"passage_commentary",
	"romans:8:18-8:30",
);
if (!romans818 || romans818.kind === "book_introduction") {
	throw new Error("Couldn't read the test passage");
}
const passageScope = romans818;

describe("what a commentary covers", () => {
	it.each([
		["passage_commentary", "romans:8:18-8:30"],
		["passage_commentary", "1-john:1:5-2:2"],
		["verse_commentary", "romans:8:28"],
		["book_introduction", "song-of-solomon"],
	] as const)("reads and rewrites %s %s", (kind, key) => {
		const scope = parseCommentaryScopeKey(kind, key);
		expect(scope).not.toBeNull();
		if (scope) expect(commentaryScopeKey(scope)).toBe(key);
	});

	it.each([
		["passage_commentary", "romans:8:18"],
		["verse_commentary", "romans:8:18-8:30"],
		["passage_commentary", "romans:8:30-8:18"],
		["book_introduction", "Romans 8"],
		["verse_commentary", "romans"],
	] as const)("refuses %s %s", (kind, key) => {
		expect(parseCommentaryScopeKey(kind, key)).toBeNull();
	});

	it("notices passages that share verses, and ones that only touch", () => {
		const range = (a: number, b: number, c: number, d: number) => ({
			from: { chapter: a, verse: b },
			to: { chapter: c, verse: d },
		});
		expect(rangesOverlap(range(8, 18, 8, 30), range(8, 26, 8, 39))).toBe(true);
		expect(rangesOverlap(range(8, 18, 8, 30), range(8, 30, 8, 39))).toBe(true);
		expect(rangesOverlap(range(8, 18, 8, 30), range(8, 31, 8, 39))).toBe(false);
		expect(rangesOverlap(range(7, 24, 8, 2), range(8, 1, 8, 4))).toBe(true);
	});
});

describe("the verses a section covers", () => {
	it("reads plain numbers as verses inside one chapter", () => {
		expect(parseSectionRange("18–22", passageScope)).toEqual({
			from: { chapter: 8, verse: 18 },
			to: { chapter: 8, verse: 22 },
		});
		expect(parseSectionRange("23", passageScope)?.to.verse).toBe(23);
	});

	it("means all of the commentary's verses when left blank", () => {
		expect(parseSectionRange("", passageScope)).toEqual({
			from: passageScope.from,
			to: passageScope.to,
		});
	});

	it("needs a chapter once a passage crosses chapters", () => {
		const across = {
			from: { chapter: 7, verse: 24 },
			to: { chapter: 8, verse: 2 },
		};
		expect(parseSectionRange("8:1–2", across)).toEqual({
			from: { chapter: 8, verse: 1 },
			to: { chapter: 8, verse: 2 },
		});
	});

	it("refuses what it can't read", () => {
		expect(parseSectionRange("the end", passageScope)).toBeNull();
		expect(parseSectionRange("22–18", passageScope)).toBeNull();
	});
});

describe("the coverage bar", () => {
	const ranges = (...list: string[]) => list.map((range) => ({ range }));

	it("finds verses no section covers, as in the design", () => {
		const { cells, gaps } = commentaryCoverage(
			passageScope,
			ranges("18–22", "25", "26–27", "28–30"),
			{},
		);
		expect(cells).toHaveLength(13);
		expect(gaps.map(({ verse }) => verse)).toEqual([23, 24]);
		expect(formatCoverageGaps(gaps, passageScope)).toBe("23, 24");
	});

	it("uses entered verse counts to cross a chapter", () => {
		const scope = {
			from: { chapter: 7, verse: 24 },
			to: { chapter: 8, verse: 2 },
		};
		const { cells, gaps, unknownChapters } = commentaryCoverage(
			scope,
			ranges("7:24–25", "8:1"),
			{ 7: 25 },
		);
		expect(cells).toHaveLength(4);
		expect(unknownChapters).toEqual([]);
		expect(formatCoverageGaps(gaps, scope)).toBe("8:2");
	});

	it("says when a chapter's verses aren't entered yet", () => {
		const scope = {
			from: { chapter: 7, verse: 24 },
			to: { chapter: 8, verse: 2 },
		};
		const { unknownChapters } = commentaryCoverage(scope, ranges("7:24"), {});
		expect(unknownChapters).toEqual([7]);
	});
});

describe("the Before review checklist", () => {
	const ready: CommentaryBody = {
		sections: [section("a", "Creation waits", "18–30", words("Some writing."))],
		title: "Groaning toward glory",
	};
	const textOf = (body: CommentaryBody) =>
		commentaryChecklist(passageScope, body).map(({ text }) => text);

	it("lets a finished draft through, while still mentioning a missing citation", () => {
		expect(commentaryProblems(passageScope, ready)).toEqual([]);
		expect(textOf(ready)).toContain("No citations yet");
	});

	it("doesn't stop for a citation with no page number, only says so", () => {
		const body: CommentaryBody = {
			...ready,
			sections: [section("a", "T", "18–30", paragraph(citationNode(1, "")))],
		};
		expect(commentaryProblems(passageScope, body)).toEqual([]);
		expect(textOf(body)).toContain("Citation 1 is missing page numbers");
	});

	it("doesn't stop for a coverage gap, only says so", () => {
		const body: CommentaryBody = {
			...ready,
			sections: [section("a", "T", "18–22", words("Text"))],
		};
		expect(commentaryProblems(passageScope, body)).toEqual([]);
		expect(textOf(body)).toContain(
			"Verses 23, 24, 25, 26, 27, 28, 29, 30 are not covered by any section",
		);
	});

	it("stops for a missing title or an empty section", () => {
		expect(commentaryProblems(passageScope, { ...ready, title: "" })).toEqual([
			"Has a title",
		]);
		expect(
			commentaryProblems(passageScope, {
				...ready,
				sections: [section("a", "T", "", paragraph())],
			}),
		).toEqual(["Every section has a title and some writing"]);
	});

	it("stops for a section outside the passage", () => {
		const [problem] = commentaryProblems(passageScope, {
			...ready,
			sections: [section("a", "Too far", "28–35", words("Text"))],
		});
		expect(problem).toBe("Check the verses of Too far");
	});
});

describe("reading a draft's contents", () => {
	const body: CommentaryBody = {
		sections: [
			section("a", "First", "", paragraph(citationNode(1), citationNode(2))),
			section("b", "Second", "", paragraph(citationNode(3))),
		],
		title: "T",
	};

	it("numbers citations straight through the sections", () => {
		expect(collectCitations(body).map(({ excerptId }) => excerptId)).toEqual([
			1, 2, 3,
		]);
		expect(citationOffset(body, "a")).toBe(0);
		expect(citationOffset(body, "b")).toBe(2);
	});

	it("only flags a Greek Reviewer when a word is really there", () => {
		expect(containsOriginalTerm(body)).toBe(false);
		expect(
			containsOriginalTerm({
				...body,
				sections: [
					section(
						"a",
						"T",
						"",
						paragraph({
							attrs: { gloss: "", language: "greek", word: "χωρίσει" },
							type: "originalTerm",
						}),
					),
				],
			}),
		).toBe(true);
	});

	it("shows a reviewer when sections are reordered", () => {
		const moved = { ...body, sections: [...body.sections].reverse() };
		const list = (value: CommentaryBody) =>
			commentaryFields(value).find(({ label }) => label === "Sections")?.text;
		expect(list(body)).not.toBe(list(moved));
	});

	it("starts an introduction with the suggested sections", () => {
		let next = 0;
		const start = startingCommentaryBody("book_introduction", "Romans", () => {
			next += 1;
			return String(next);
		});
		expect(start.title).toBe("Introduction to Romans");
		expect(start.sections.map(({ title }) => title)).toEqual([
			"Author",
			"Date & setting",
			"Audience",
			"Purpose",
			"Structure",
		]);
	});
});

async function setUp(tx: DbExecutor) {
	await withFreshCatalogue(tx);
	await applyScriptureCatalogue(tx);
	// Other work in the shared database shouldn't count towards these tests.
	await tx.execute(
		sql`TRUNCATE TABLE content_items, content_revisions, sources, claims, research_notes CASCADE`,
	);
	return {
		writer: await createPerson(tx, "Contributor"),
		checker: await createPerson(tx, "Contributor"),
		admin: await createPerson(tx, "Admin"),
		greek: await createPerson(tx, "Greek Reviewer"),
		member: await createPerson(tx),
		superadmin: await createPerson(tx, "Superadmin"),
		secondSuperadmin: await createPerson(tx, "Superadmin"),
	};
}
type People = Awaited<ReturnType<typeof setUp>>;
type Saved = { contentItemId: number; revisionId: number };

const passage = {
	kind: "passage_commentary" as const,
	scopeKey: "romans:8:18-8:30",
};

function draftBody(...content: unknown[]): CommentaryBody {
	return {
		sections: [
			section(
				"a",
				"God's purpose",
				"18–30",
				paragraph({ text: "Paul writes. ", type: "text" }, ...content),
			),
		],
		title: "Groaning toward glory",
	};
}

const saveCommentary = (tx: DbExecutor, people: People, body: CommentaryBody) =>
	saveDraft(tx, { ...passage, actorUserId: people.writer.id, body });

async function approveAs(
	tx: DbExecutor,
	authorId: string,
	reviewerId: string,
	saved: Saved,
) {
	await submitRevision(tx, {
		actorUserId: authorId,
		revisionId: saved.revisionId,
	});
	const page = await getRevisionPage(tx, saved, reviewerId);
	for (const check of page?.checks ?? []) {
		await recordCheck(tx, {
			actorUserId: reviewerId,
			checklistId: check.id,
			note: "",
			result: "not_applicable",
			revisionId: saved.revisionId,
		});
	}
	await approveRevision(tx, {
		actorUserId: reviewerId,
		revisionId: saved.revisionId,
	});
}

async function publishEvidence(tx: DbExecutor, people: People, saved: Saved) {
	await approveAs(tx, people.writer.id, people.checker.id, saved);
	await publishRevision(tx, {
		actorUserId: people.admin.id,
		revisionId: saved.revisionId,
	});
}

async function liveExcerpt(tx: DbExecutor, people: People) {
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
	await publishEvidence(tx, people, source);
	const excerpt = await saveEvidenceDraft(tx, {
		actorUserId: people.writer.id,
		body: {
			form: "summary",
			location: "on 8:35",
			passages: ["Romans 8:35"],
			text: "A summary.",
		},
		kind: "source_excerpt",
		sourceId: source.id,
	});
	await publishEvidence(tx, people, excerpt);
	return { excerpt, source };
}

describe.runIf(process.env.DATABASE_URL)("commentary", () => {
	afterAll(async () => {
		await pool.end();
	});

	describe("starting one", () => {
		it("gives the same address for the same verses, however they're typed", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				const kind = "passage_commentary";
				const expected = { kind, scopeKey: "romans:8:18-8:30" };
				await expect(
					resolveCommentaryScope(tx, {
						from: "Romans 8:18",
						kind,
						to: "Romans 8:30",
					}),
				).resolves.toEqual(expected);
				await expect(
					resolveCommentaryScope(tx, { from: "Rom 8:18", kind, to: "30" }),
				).resolves.toEqual(expected);
				await expect(
					resolveCommentaryScope(tx, { from: "rom 8:18", kind, to: "8:30" }),
				).resolves.toEqual(expected);
			});
		});

		it("refuses verses that can't be right", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				const kind = "passage_commentary";
				await expect(
					resolveCommentaryScope(tx, { from: "Romans 8:30", kind, to: "8:18" }),
				).rejects.toThrow("has to come after");
				await expect(
					resolveCommentaryScope(tx, {
						from: "Romans 8:18",
						kind,
						to: "John 3:16",
					}),
				).rejects.toThrow("within one book");
				await expect(
					resolveCommentaryScope(tx, { from: "Romans 8", kind, to: "9:1" }),
				).rejects.toThrow("Include the verse");
				await expect(
					resolveCommentaryScope(tx, { from: "Romans 8:1", kind, to: "40:1" }),
				).rejects.toThrow("Romans has 16 chapters");
			});
		});

		it("needs only the book for an introduction", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				await expect(
					resolveCommentaryScope(tx, {
						from: "Romans",
						kind: "book_introduction",
					}),
				).resolves.toEqual({ kind: "book_introduction", scopeKey: "romans" });
			});
		});
	});

	describe("the editor", () => {
		it("opens a new introduction with suggestions, and saves nothing just by opening", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const editor = await getCommentaryEditor(
					tx,
					{ kind: "book_introduction", scopeKey: "romans" },
					people.writer.id,
				);
				expect(editor?.body.title).toBe("Introduction to Romans");
				expect(editor?.body.sections).toHaveLength(5);
				expect(await tx.select().from(contentItems)).toEqual([]);
			});
		});

		it("is empty for an address that doesn't describe real verses", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				expect(
					await getCommentaryEditor(
						tx,
						{ kind: "verse_commentary", scopeKey: "hezekiah:1:1" },
						people.writer.id,
					),
				).toBeNull();
			});
		});

		it("warns about a passage sharing verses, but not one beside it", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await saveCommentary(tx, people, draftBody());
				const overlapsOf = async (scopeKey: string) =>
					(
						await getCommentaryEditor(
							tx,
							{ kind: "passage_commentary", scopeKey },
							people.writer.id,
						)
					)?.overlaps.map(({ title }) => title);

				expect(await overlapsOf("romans:8:26-8:39")).toEqual([
					"Groaning toward glory",
				]);
				expect(await overlapsOf("romans:8:31-8:39")).toEqual([]);
				expect(await overlapsOf("john:8:18-8:30")).toEqual([]);
			});
		});

		it("lists existing commentary so it can be found again", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await saveCommentary(tx, people, draftBody());
				const [found] = await listCommentaries(tx, { search: "groaning" });
				expect(found?.scopeKey).toBe("romans:8:18-8:30");
				expect(found?.latestStatus).toBe("draft");
			});
		});

		it("writes references out in full", async () => {
			await inRolledBackTransaction(async (tx) => {
				await setUp(tx);
				await expect(resolveEditorReference(tx, "Rom 8:31")).resolves.toEqual({
					bookSlug: "romans",
					label: "Romans 8:31",
				});
				await expect(resolveEditorReference(tx, "1 Jn 2:1-6")).resolves.toEqual(
					{ bookSlug: "1-john", label: "1 John 2:1–6" },
				);
				await expect(resolveEditorReference(tx, "Romans")).rejects.toThrow(
					"Include a chapter",
				);
			});
		});
	});

	describe("citations", () => {
		it("follow the draft, in reading order", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { excerpt } = await liveExcerpt(tx, people);
				const saved = await saveCommentary(
					tx,
					people,
					draftBody(
						citationNode(excerpt.id),
						citationNode(excerpt.id, "p. 440"),
					),
				);
				const rows = () =>
					tx
						.select({
							locator: citations.locator,
							position: citations.position,
						})
						.from(citations)
						.where(eq(citations.contentRevisionId, saved.revisionId))
						.orderBy(citations.position);
				expect(await rows()).toEqual([
					{ locator: "p. 439", position: 1 },
					{ locator: "p. 440", position: 2 },
				]);

				await saveCommentary(tx, people, draftBody());
				expect(await rows()).toEqual([]);
			});
		});

		it("refuse an excerpt that doesn't exist", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await expect(
					saveCommentary(tx, people, draftBody(citationNode(999_999))),
				).rejects.toThrow("no longer exists");
			});
		});

		it("can't send a draft resting on a retired source", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { excerpt, source } = await liveExcerpt(tx, people);
				const saved = await saveCommentary(
					tx,
					people,
					draftBody(citationNode(excerpt.id)),
				);
				await retireSource(tx, {
					actorUserId: people.superadmin.id,
					reason: "Discredited",
					sourceId: source.id,
				});
				const [proposal] = await tx.select().from(changeProposals);
				if (!proposal) throw new Error("No proposal");
				await decideChange(tx, {
					decision: "confirm",
					deciderUserId: people.secondSuperadmin.id,
					note: "Agreed",
					proposalId: proposal.id,
				});
				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow("retired");
			});
		});

		it("won't publish before what they rest on, and keep the versions they were published with", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await saveEvidenceDraft(tx, {
					actorUserId: people.writer.id,
					body: {
						authors: "A",
						edition: "",
						publisher: "",
						title: "A source",
						type: "article",
						year: "",
					},
					kind: "source",
				});
				const excerpt = await saveEvidenceDraft(tx, {
					actorUserId: people.writer.id,
					body: { form: "summary", location: "p. 1", passages: [], text: "S." },
					kind: "source_excerpt",
					sourceId: source.id,
				});
				const saved = await saveCommentary(
					tx,
					people,
					draftBody(citationNode(excerpt.id)),
				);
				await approveAs(tx, people.writer.id, people.checker.id, saved);
				await expect(
					publishRevision(tx, {
						actorUserId: people.admin.id,
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow("can't go live before what it rests on");

				await publishEvidence(tx, people, source);
				await publishEvidence(tx, people, excerpt);
				await publishRevision(tx, {
					actorUserId: people.admin.id,
					revisionId: saved.revisionId,
				});

				const [pin] = await tx
					.select({
						excerpt: citations.pinnedExcerptRevisionId,
						source: citations.pinnedSourceRevisionId,
					})
					.from(citations)
					.where(eq(citations.contentRevisionId, saved.revisionId));
				expect(pin).toEqual({
					excerpt: excerpt.revisionId,
					source: source.revisionId,
				});
			});
		});
	});

	describe("review", () => {
		it("refuses an unfinished draft, explaining why", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveCommentary(tx, people, {
					...draftBody(),
					title: "",
				});
				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow("has a title");
			});
		});

		it("refuses a Scripture reference to a book that doesn't exist", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveCommentary(
					tx,
					people,
					draftBody({
						attrs: {
							bookSlug: "hezekiah",
							label: "Hezekiah 1:1",
							variant: "reference",
						},
						type: "scriptureReference",
					}),
				);
				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow('find a book called "Hezekiah"');
			});
		});

		it("names itself after the title, keeping a live name until the next goes live", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveCommentary(tx, people, draftBody());
				const title = async () =>
					(
						await tx
							.select({ title: contentItems.title })
							.from(contentItems)
							.where(eq(contentItems.id, saved.contentItemId))
					)[0]?.title;
				expect(await title()).toBe("Groaning toward glory");

				await approveAs(tx, people.writer.id, people.checker.id, saved);
				await publishRevision(tx, {
					actorUserId: people.admin.id,
					revisionId: saved.revisionId,
				});
				const next = await saveCommentary(tx, people, {
					...draftBody(),
					title: "A new title",
				});
				expect(await title()).toBe("Groaning toward glory");
				await approveAs(tx, people.writer.id, people.checker.id, next);
				await publishRevision(tx, {
					actorUserId: people.admin.id,
					revisionId: next.revisionId,
				});
				expect(await title()).toBe("A new title");
			});
		});

		it("keeps the commentary's address when its only draft is thrown away", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveCommentary(tx, people, draftBody());
				await discardDraft(tx, {
					actorUserId: people.writer.id,
					revisionId: saved.revisionId,
				});
				const editor = await getCommentaryEditor(tx, passage, people.writer.id);
				expect(editor?.state.open).toBeNull();
				expect(editor?.body.sections).toHaveLength(1);
			});
		});

		it("is for people who can write", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await expect(
					saveDraft(tx, {
						...passage,
						actorUserId: people.member.id,
						body: draftBody(),
					}),
				).rejects.toThrow("permission");
			});
		});
	});

	describe("the Greek Reviewer's check", () => {
		const greekWord = {
			attrs: { gloss: "will separate", language: "greek", word: "χωρίσει" },
			type: "originalTerm",
		};
		const greekCheck = "Original-language notes checked";

		const checksOn = async (tx: DbExecutor, userId: string, saved: Saved) =>
			((await getRevisionPage(tx, saved, userId))?.checks ?? []).map(
				({ requirement }) => requirement,
			);

		it("isn't asked for when a draft has no Greek or Hebrew", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveCommentary(tx, people, draftBody());
				expect(await checksOn(tx, people.checker.id, saved)).not.toContain(
					greekCheck,
				);
			});
		});

		it("holds approval until someone who can check it has", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const saved = await saveCommentary(tx, people, draftBody(greekWord));
				await submitRevision(tx, {
					actorUserId: people.writer.id,
					revisionId: saved.revisionId,
				});
				const page = await getRevisionPage(tx, saved, people.checker.id);
				const checks = page?.checks ?? [];
				expect(checks.map(({ requirement }) => requirement)).toContain(
					greekCheck,
				);

				for (const check of checks) {
					if (check.requirement === greekCheck) continue;
					await recordCheck(tx, {
						actorUserId: people.checker.id,
						checklistId: check.id,
						note: "",
						result: "not_applicable",
						revisionId: saved.revisionId,
					});
				}
				await expect(
					approveRevision(tx, {
						actorUserId: people.checker.id,
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow(`"${greekCheck}" still needs checking`);

				const check = checks.find(
					({ requirement }) => requirement === greekCheck,
				);
				if (!check) throw new Error("No Greek check");
				await expect(
					recordCheck(tx, {
						actorUserId: people.checker.id,
						checklistId: check.id,
						note: "",
						result: "passed",
						revisionId: saved.revisionId,
					}),
				).rejects.toThrow("original-language");
				await recordCheck(tx, {
					actorUserId: people.greek.id,
					checklistId: check.id,
					note: "",
					result: "passed",
					revisionId: saved.revisionId,
				});
				await approveRevision(tx, {
					actorUserId: people.checker.id,
					revisionId: saved.revisionId,
				});
			});
		});
	});
});
