import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import { getRevisionPage } from "../src/content-queues";
import {
	approveRevision,
	discardDraft,
	publishRevision,
	recordCheck,
	saveDraft,
	submitRevision,
	withdrawLive,
} from "../src/content-workflow";
import type { DbExecutor } from "../src/db-executor";
import {
	findSimilarSources,
	getEvidenceWorkbench,
	listSources,
	mergeSources,
	retireSource,
	saveEvidenceDraft,
	sourceUsedIn,
} from "../src/evidence";
import {
	countWords,
	excerptProblems,
	MAX_QUOTATION_WORDS,
	titlesLookAlike,
} from "../src/evidence-body";
import {
	deleteResearchNote,
	listResearchNotes,
	saveResearchNote,
} from "../src/research-notes";
import { auditLog } from "../src/schema/audit_log";
import { changeProposals } from "../src/schema/change_proposals";
import { citations } from "../src/schema/citations";
import { contentItems } from "../src/schema/content_items";
import { sourceExcerpts } from "../src/schema/source_excerpts";
import { sources } from "../src/schema/sources";
import { splitScriptureReference } from "../src/scripture-reference";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import { getStaffQueueCounts } from "../src/staff-queues";
import { decideChange } from "../src/two-person";
import {
	createPerson,
	inRolledBackTransaction,
	withFreshCatalogue,
} from "./governance-helpers";

const metzger = {
	authors: "Bruce M. Metzger",
	edition: "2nd edition",
	publisher: "United Bible Societies",
	title: "A Textual Commentary on the Greek New Testament",
	type: "textual_commentary" as const,
	year: "1994",
};
const entry = {
	form: "summary" as const,
	location: "Entry on Romans 8:28",
	passages: ["Romans 8:28"],
	text: "Discusses the reading with and without the word for God.",
};
const claimText = {
	confidence: "well_established" as const,
	kind: "textual" as const,
	passage: "Romans 8:28",
	statement: "Most manuscripts leave out the word for God in Romans 8:28.",
};

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
		member: await createPerson(tx),
		superadmin: await createPerson(tx, "Superadmin"),
		secondSuperadmin: await createPerson(tx, "Superadmin"),
	};
}

type People = Awaited<ReturnType<typeof setUp>>;
type Saved = { contentItemId: number; id: number; revisionId: number };

async function submitAndApprove(tx: DbExecutor, people: People, saved: Saved) {
	await submitRevision(tx, {
		actorUserId: people.writer.id,
		revisionId: saved.revisionId,
	});
	const page = await getRevisionPage(
		tx,
		{ contentItemId: saved.contentItemId, revisionId: saved.revisionId },
		people.checker.id,
	);
	for (const check of page?.checks ?? []) {
		await recordCheck(tx, {
			actorUserId: people.checker.id,
			checklistId: check.id,
			note: "",
			result: "not_applicable",
			revisionId: saved.revisionId,
		});
	}
	await approveRevision(tx, {
		actorUserId: people.checker.id,
		revisionId: saved.revisionId,
	});
}

async function publish(tx: DbExecutor, people: People, saved: Saved) {
	await submitAndApprove(tx, people, saved);
	await publishRevision(tx, {
		actorUserId: people.admin.id,
		revisionId: saved.revisionId,
	});
}

const newSource = (tx: DbExecutor, people: People, body: unknown = metzger) =>
	saveEvidenceDraft(tx, {
		actorUserId: people.writer.id,
		body,
		kind: "source",
	});

const newExcerpt = (tx: DbExecutor, people: People, sourceId: number) =>
	saveEvidenceDraft(tx, {
		actorUserId: people.writer.id,
		body: entry,
		kind: "source_excerpt",
		sourceId,
	});

const newClaim = (tx: DbExecutor, people: People, excerptIds: number[]) =>
	saveEvidenceDraft(tx, {
		actorUserId: people.writer.id,
		body: {
			...claimText,
			citations: excerptIds.map((excerptId) => ({
				excerptId,
				locator: "on Rom 8:28",
				strength: "direct",
			})),
		},
		kind: "claim",
	});

/** A source and excerpt that are both live, ready for a claim to rest on. */
async function liveExcerpt(tx: DbExecutor, people: People) {
	const source = await newSource(tx, people);
	await publish(tx, people, source);
	const excerpt = await newExcerpt(tx, people, source.id);
	await publish(tx, people, excerpt);
	return { excerpt, source };
}

describe("reading a Scripture reference", () => {
	it.each([
		["Romans 8:28", "Romans", 8],
		["1 John 2:1-6", "1 John", 2],
		["Song of Solomon 2", "Song of Solomon", 2],
		["Rom 8", "Rom", 8],
	])("reads %s", (text, bookText, chapter) => {
		const reference = splitScriptureReference(text);
		expect(reference?.bookText).toBe(bookText);
		expect(reference?.range?.from.chapter).toBe(chapter);
	});

	it("reads a whole book with no numbers", () => {
		expect(splitScriptureReference("Romans")).toEqual({
			bookText: "Romans",
			range: null,
		});
	});

	it.each(["", "8:28", "Romans 8:9-3"])("refuses %j", (text) => {
		expect(splitScriptureReference(text)).toBeNull();
	});
});

describe("quotation length", () => {
	const words = (count: number) => Array(count).fill("word").join(" ");
	const quotation = (text: string) => ({
		...entry,
		form: "quotation" as const,
		text,
	});

	it("allows a quotation right up to the limit", () => {
		expect(countWords(words(MAX_QUOTATION_WORDS))).toBe(75);
		expect(excerptProblems(quotation(words(MAX_QUOTATION_WORDS)))).toEqual([]);
	});

	it("refuses one word over the limit", () => {
		expect(excerptProblems(quotation(words(76)))[0]).toMatch(/at most 75/);
	});

	it("doesn't limit a summary in our own words", () => {
		expect(excerptProblems({ ...entry, text: words(200) })).toEqual([]);
	});
});

describe("spotting a possible duplicate title", () => {
	it("notices the same work with slightly different wording", () => {
		expect(
			titlesLookAlike(
				"A Textual Commentary on the Greek New Testament",
				"Textual Commentary on the Greek New Testament",
			),
		).toBe(true);
	});

	it("ignores titles that only share small words", () => {
		expect(
			titlesLookAlike("The Epistle to the Romans", "The Gospel of Mark"),
		).toBe(false);
	});
});

describe.runIf(process.env.DATABASE_URL)("evidence", () => {
	afterAll(async () => {
		await pool.end();
	});

	describe("writing records", () => {
		it("keeps out people who can't manage sources, leaving nothing behind", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await expect(
					saveEvidenceDraft(tx, {
						actorUserId: people.member.id,
						body: metzger,
						kind: "source",
					}),
				).rejects.toThrow("permission");
				expect(await tx.select().from(sources)).toEqual([]);
			});
		});

		it("names a source from its details, and follows edits while it's a draft", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				await saveDraft(tx, {
					actorUserId: people.writer.id,
					body: { ...metzger, edition: "3rd edition" },
					kind: "source",
					scopeKey: String(source.id),
				});
				const [item] = await tx
					.select({ title: contentItems.title })
					.from(contentItems)
					.where(eq(contentItems.id, source.contentItemId));
				expect(item?.title).toBe(
					"A Textual Commentary on the Greek New Testament (3rd edition)",
				);
			});
		});

		it("refuses to send an unfinished record for review", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people, {
					...metzger,
					authors: "",
				});
				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: source.revisionId,
					}),
				).rejects.toThrow("author");
			});
		});

		it("refuses a passage for a book or chapter that doesn't exist", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				const excerpt = await saveEvidenceDraft(tx, {
					actorUserId: people.writer.id,
					body: { ...entry, passages: ["Romans 40:1"] },
					kind: "source_excerpt",
					sourceId: source.id,
				});
				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: excerpt.revisionId,
					}),
				).rejects.toThrow("Romans has 16 chapters");

				const claim = await saveEvidenceDraft(tx, {
					actorUserId: people.writer.id,
					body: {
						...claimText,
						citations: [
							{ excerptId: excerpt.id, locator: "", strength: "direct" },
						],
						passage: "Hezekiah 1:1",
					},
					kind: "claim",
				});
				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: claim.revisionId,
					}),
				).rejects.toThrow('find a book called "Hezekiah"');
			});
		});

		it("removes a record when its only draft is thrown away", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				await discardDraft(tx, {
					actorUserId: people.writer.id,
					revisionId: source.revisionId,
				});
				expect(await tx.select().from(sources)).toEqual([]);
				expect(await tx.select().from(contentItems)).toEqual([]);
			});
		});

		it("won't throw away a source's only draft once excerpts hang off it", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				await newExcerpt(tx, people, source.id);
				await expect(
					discardDraft(tx, {
						actorUserId: people.writer.id,
						revisionId: source.revisionId,
					}),
				).rejects.toThrow("already has excerpts");
			});
		});
	});

	describe("citations", () => {
		it("are checked with the claim and follow its draft exactly", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				const first = await newExcerpt(tx, people, source.id);
				const second = await newExcerpt(tx, people, source.id);

				const claim = await newClaim(tx, people, [first.id, second.id]);
				const rows = () =>
					tx
						.select({
							excerptId: citations.excerptId,
							position: citations.position,
						})
						.from(citations)
						.where(eq(citations.contentRevisionId, claim.revisionId))
						.orderBy(citations.position);
				expect(await rows()).toEqual([
					{ excerptId: first.id, position: 1 },
					{ excerptId: second.id, position: 2 },
				]);

				await saveEvidenceDraft(tx, {
					actorUserId: people.writer.id,
					body: {
						...claimText,
						citations: [
							{ excerptId: second.id, locator: "", strength: "partial" },
						],
					},
					id: claim.id,
					kind: "claim",
				});
				expect(await rows()).toEqual([{ excerptId: second.id, position: 1 }]);
			});
		});

		it("are required before a claim can go for review", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const claim = await newClaim(tx, people, []);
				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: claim.revisionId,
					}),
				).rejects.toThrow("at least one citation");
			});
		});

		it("refuse an excerpt that doesn't exist", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await expect(newClaim(tx, people, [999_999])).rejects.toThrow(
					"no longer exists",
				);
			});
		});
	});

	describe("publishing in order", () => {
		it("won't publish an excerpt before its source", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				const excerpt = await newExcerpt(tx, people, source.id);
				await submitAndApprove(tx, people, excerpt);
				await expect(
					publishRevision(tx, {
						actorUserId: people.admin.id,
						revisionId: excerpt.revisionId,
					}),
				).rejects.toThrow("Publish the source first");
			});
		});

		it("won't publish a claim before what it rests on", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				await publish(tx, people, source);
				const excerpt = await newExcerpt(tx, people, source.id);
				const claim = await newClaim(tx, people, [excerpt.id]);
				await submitAndApprove(tx, people, claim);
				await expect(
					publishRevision(tx, {
						actorUserId: people.admin.id,
						revisionId: claim.revisionId,
					}),
				).rejects.toThrow("can't go live before what it rests on");
			});
		});

		it("needs a second person, for evidence as for everything else", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				await submitRevision(tx, {
					actorUserId: people.writer.id,
					revisionId: source.revisionId,
				});
				await expect(
					approveRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: source.revisionId,
					}),
				).rejects.toThrow("someone else has to review");
			});
		});

		it("keeps a published claim pointing to the versions it was reviewed with", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { excerpt, source } = await liveExcerpt(tx, people);
				const claim = await newClaim(tx, people, [excerpt.id]);
				await publish(tx, people, claim);

				const revised = await saveEvidenceDraft(tx, {
					actorUserId: people.writer.id,
					body: { ...entry, text: "A corrected summary." },
					id: excerpt.id,
					kind: "source_excerpt",
				});
				await publish(tx, people, { ...revised, id: excerpt.id });

				const [pin] = await tx
					.select({
						excerpt: citations.pinnedExcerptRevisionId,
						source: citations.pinnedSourceRevisionId,
					})
					.from(citations)
					.where(eq(citations.contentRevisionId, claim.revisionId));
				expect(pin).toEqual({
					excerpt: excerpt.revisionId,
					source: source.revisionId,
				});

				const page = await getRevisionPage(
					tx,
					{
						contentItemId: claim.contentItemId,
						revisionId: claim.revisionId,
					},
					people.checker.id,
				);
				expect(page?.citations[0]).toMatchObject({
					liveExcerptNumber: 2,
					pinnedExcerptNumber: 1,
				});
			});
		});

		it("won't withdraw something published content rests on", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { excerpt, source } = await liveExcerpt(tx, people);
				const claim = await newClaim(tx, people, [excerpt.id]);
				await publish(tx, people, claim);

				await expect(
					withdrawLive(tx, {
						actorUserId: people.admin.id,
						contentItemId: excerpt.contentItemId,
						reason: "Not needed",
					}),
				).rejects.toThrow("cites this excerpt");
				await expect(
					withdrawLive(tx, {
						actorUserId: people.admin.id,
						contentItemId: source.contentItemId,
						reason: "Not needed",
					}),
				).rejects.toThrow("retire it instead");
			});
		});
	});

	describe("merging duplicates", () => {
		it("moves excerpts and research notes, and records who did it", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const keep = await liveExcerpt(tx, people);
				const duplicate = await liveExcerpt(tx, people);
				const noteId = await saveResearchNote(tx, {
					actorUserId: people.writer.id,
					content: "Check both editions.",
					reference: "Romans 8:28",
					sources: [
						{ locator: "p. 1", sourceId: keep.source.id },
						{ locator: "p. 2", sourceId: duplicate.source.id },
					],
				});

				await mergeSources(tx, {
					actorUserId: people.admin.id,
					keepSourceId: keep.source.id,
					mergeSourceId: duplicate.source.id,
					reason: "Same edition entered twice",
				});

				const [moved] = await tx
					.select({ sourceId: sourceExcerpts.sourceId })
					.from(sourceExcerpts)
					.where(eq(sourceExcerpts.id, duplicate.excerpt.id));
				expect(moved?.sourceId).toBe(keep.source.id);

				const [note] = await listResearchNotes(tx, {});
				expect(note?.id).toBe(noteId);
				expect(note?.sources.map(({ sourceId }) => sourceId)).toEqual([
					keep.source.id,
				]);

				const [merged] = await tx
					.select()
					.from(sources)
					.where(eq(sources.id, duplicate.source.id));
				expect(merged).toMatchObject({
					mergedIntoSourceId: keep.source.id,
					status: "merged",
				});
				expect((await listSources(tx)).map(({ id }) => id)).toEqual([
					keep.source.id,
				]);

				const [entryRow] = await tx
					.select({ actor: auditLog.actorUserId })
					.from(auditLog)
					.where(eq(auditLog.action, "source.merged"));
				expect(entryRow?.actor).toBe(people.admin.id);
			});
		});

		it("is for people holding the merge permission", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const first = await newSource(tx, people);
				const second = await newSource(tx, people);
				await expect(
					mergeSources(tx, {
						actorUserId: people.writer.id,
						keepSourceId: first.id,
						mergeSourceId: second.id,
						reason: "Duplicate",
					}),
				).rejects.toThrow("permission");
			});
		});

		it("waits for unfinished work on the duplicate", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const first = await newSource(tx, people);
				const second = await newSource(tx, people);
				await expect(
					mergeSources(tx, {
						actorUserId: people.admin.id,
						keepSourceId: first.id,
						mergeSourceId: second.id,
						reason: "Duplicate",
					}),
				).rejects.toThrow("still in progress");
			});
		});

		it("can't leave published excerpts on a source that isn't published", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const live = await newSource(tx, people);
				await publish(tx, people, live);
				const draft = await newSource(tx, people);
				await expect(
					mergeSources(tx, {
						actorUserId: people.admin.id,
						keepSourceId: draft.id,
						mergeSourceId: live.id,
						reason: "Duplicate",
					}),
				).rejects.toThrow("already live");
			});
		});
	});

	describe("retiring a source", () => {
		it("happens straight away when nothing depends on it", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				await expect(
					retireSource(tx, {
						actorUserId: people.superadmin.id,
						reason: "Entered by mistake",
						sourceId: source.id,
					}),
				).resolves.toEqual({ outcome: "retired" });
				expect(await tx.select().from(changeProposals)).toEqual([]);
			});
		});

		it("is only for people holding the retire permission", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const source = await newSource(tx, people);
				await expect(
					retireSource(tx, {
						actorUserId: people.admin.id,
						reason: "Out of date",
						sourceId: source.id,
					}),
				).rejects.toThrow("permission");
			});
		});

		it("needs a second Superadmin when it's in use, and lists what depends on it", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { excerpt, source } = await liveExcerpt(tx, people);
				const claim = await newClaim(tx, people, [excerpt.id]);

				const usedIn = await sourceUsedIn(tx, source.id);
				expect(usedIn.map(({ id }) => id)).toEqual([
					`excerpt-${excerpt.id}`,
					`revision-${claim.revisionId}`,
				]);

				await expect(
					retireSource(tx, {
						actorUserId: people.superadmin.id,
						reason: "Superseded by a better edition",
						sourceId: source.id,
					}),
				).resolves.toEqual({ outcome: "proposed" });
				const [row] = await tx
					.select({ status: sources.status })
					.from(sources)
					.where(eq(sources.id, source.id));
				expect(row?.status).toBe("active");

				const [proposal] = await tx.select().from(changeProposals);
				if (!proposal) throw new Error("No proposal");

				expect(
					await getStaffQueueCounts(tx, {
						permissionKeys: ["sources.retire"],
						userId: people.secondSuperadmin.id,
					}),
				).toMatchObject({ sourceRetirements: 1 });

				await expect(
					decideChange(tx, {
						decision: "confirm",
						deciderUserId: people.superadmin.id,
						note: "Agreed",
						proposalId: proposal.id,
					}),
				).rejects.toThrow("someone else has to decide");

				await decideChange(tx, {
					decision: "confirm",
					deciderUserId: people.secondSuperadmin.id,
					note: "Agreed",
					proposalId: proposal.id,
				});
				const [after] = await tx
					.select({ status: sources.status })
					.from(sources)
					.where(eq(sources.id, source.id));
				expect(after?.status).toBe("retired");
			});
		});

		it("leaves published work alone but stops anything new resting on it", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { excerpt, source } = await liveExcerpt(tx, people);
				const published = await newClaim(tx, people, [excerpt.id]);
				await publish(tx, people, published);
				const waiting = await newClaim(tx, people, [excerpt.id]);

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

				const [live] = await tx
					.select({ liveRevisionId: contentItems.liveRevisionId })
					.from(contentItems)
					.where(eq(contentItems.id, published.contentItemId));
				expect(live?.liveRevisionId).toBe(published.revisionId);

				await expect(
					submitRevision(tx, {
						actorUserId: people.writer.id,
						revisionId: waiting.revisionId,
					}),
				).rejects.toThrow("retired");
				await expect(newExcerpt(tx, people, source.id)).rejects.toThrow(
					"retired",
				);
			});
		});
	});

	describe("looking things up", () => {
		it("warns about other sources that look alike, but not retired ones", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const first = await newSource(tx, people);
				const second = await newSource(tx, people, {
					...metzger,
					edition: "1st edition",
				});

				const similar = await findSimilarSources(tx, {
					exceptSourceId: first.id,
					title: metzger.title,
				});
				expect(similar.map(({ id }) => id)).toEqual([second.id]);

				await retireSource(tx, {
					actorUserId: people.superadmin.id,
					reason: "Duplicate",
					sourceId: second.id,
				});
				expect(
					await findSimilarSources(tx, {
						exceptSourceId: first.id,
						title: metzger.title,
					}),
				).toEqual([]);
			});
		});

		it("gives the workbench a chain whose parts belong together", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const { excerpt, source } = await liveExcerpt(tx, people);
				const claim = await newClaim(tx, people, [excerpt.id]);

				const workbench = await getEvidenceWorkbench(
					tx,
					{ claimId: claim.id, excerptId: excerpt.id },
					people.writer.id,
				);
				expect(workbench.source?.id).toBe(source.id);
				expect(workbench.claim?.citations[0]).toMatchObject({
					excerptIsLive: true,
					sourceId: source.id,
				});
			});
		});
	});

	describe("research notes", () => {
		it("work out the book from the passage, and only the author can delete", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				const id = await saveResearchNote(tx, {
					actorUserId: people.writer.id,
					content: "Look at the manuscripts.",
					reference: "Rom 8:28",
					sources: [],
				});
				await saveResearchNote(tx, {
					actorUserId: people.checker.id,
					content: "Looked. See Metzger.",
					id,
					reference: "Rom 8:28",
					sources: [],
				});
				expect(
					(await listResearchNotes(tx, { search: "metzger" }))[0]?.id,
				).toBe(id);

				await expect(
					deleteResearchNote(tx, { actorUserId: people.checker.id, id }),
				).rejects.toThrow("Only the person who wrote");
				await deleteResearchNote(tx, { actorUserId: people.writer.id, id });
				expect(await listResearchNotes(tx, {})).toEqual([]);
			});
		});

		it("refuse a passage that can't be found", async () => {
			await inRolledBackTransaction(async (tx) => {
				const people = await setUp(tx);
				await expect(
					saveResearchNote(tx, {
						actorUserId: people.writer.id,
						content: "A note.",
						reference: "Hezekiah 1",
						sources: [],
					}),
				).rejects.toThrow("find a book");
			});
		});
	});
});
