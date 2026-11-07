import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import { emptyBookOverview } from "../src/book-overview";
import {
	getContentState,
	getLiveContent,
	getRevisionPage,
	listApprovedContent,
	listAssignments,
	listEditorialQueue,
	listMyWork,
	listOpenIssues,
	listReviewQueue,
} from "../src/content-queues";
import {
	approveRevision,
	assignReviewer,
	assignWriter,
	closeIssue,
	discardDraft,
	publishRevision,
	raiseIssue,
	recordCheck,
	requestChanges,
	saveDraft,
	startReview,
	submitRevision,
	withdrawLive,
} from "../src/content-workflow";
import type { DbExecutor } from "../src/db-executor";
import { auditLog } from "../src/schema/audit_log";
import { contentRevisions } from "../src/schema/content_revisions";
import { notifications } from "../src/schema/notifications";
import { publicationHistory } from "../src/schema/publication_history";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import { getStaffQueueCounts } from "../src/staff-queues";
import {
	createPerson,
	inRolledBackTransaction,
	withFreshCatalogue,
} from "./governance-helpers";

const romans = { kind: "book_overview" as const, scopeKey: "romans" };
const body = { ...emptyBookOverview, summary: "A letter on the gospel." };

async function setUp(tx: DbExecutor) {
	await withFreshCatalogue(tx);
	await applyScriptureCatalogue(tx);
	// Other work in the shared database shouldn't count towards these tests.
	await tx.execute(
		sql`TRUNCATE TABLE content_items, content_revisions CASCADE`,
	);
	return {
		author: await createPerson(tx, "Contributor"),
		reviewer: await createPerson(tx, "Contributor"),
		admin: await createPerson(tx, "Admin"),
		member: await createPerson(tx),
		greek: await createPerson(tx, "Greek Reviewer"),
	};
}

async function passAllChecks(
	tx: DbExecutor,
	actorUserId: string,
	contentItemId: number,
	revisionId: number,
) {
	const page = await getRevisionPage(
		tx,
		{ contentItemId, revisionId },
		actorUserId,
	);
	for (const check of page?.checks ?? []) {
		await recordCheck(tx, {
			actorUserId,
			checklistId: check.id,
			note: "",
			result: "passed",
			revisionId,
		});
	}
}

async function submitted(tx: DbExecutor, authorId: string) {
	const draft = await saveDraft(tx, { ...romans, actorUserId: authorId, body });
	await submitRevision(tx, {
		actorUserId: authorId,
		revisionId: draft.revisionId,
	});
	return draft;
}

async function approved(tx: DbExecutor, authorId: string, reviewerId: string) {
	const draft = await submitted(tx, authorId);
	await passAllChecks(tx, reviewerId, draft.contentItemId, draft.revisionId);
	await approveRevision(tx, {
		actorUserId: reviewerId,
		revisionId: draft.revisionId,
	});
	return draft;
}

async function published(
	tx: DbExecutor,
	people: Awaited<ReturnType<typeof setUp>>,
) {
	const draft = await approved(tx, people.author.id, people.reviewer.id);
	await publishRevision(tx, {
		actorUserId: people.admin.id,
		revisionId: draft.revisionId,
	});
	return draft;
}

async function statusOf(tx: DbExecutor, revisionId: number) {
	const [row] = await tx
		.select({ status: contentRevisions.status })
		.from(contentRevisions)
		.where(eq(contentRevisions.id, revisionId));
	return row?.status;
}

afterAll(async () => {
	await pool.end();
});

describe("writing a draft", () => {
	it("creates the content and its first revision", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author } = await setUp(tx);

			const draft = await saveDraft(tx, {
				...romans,
				actorUserId: author.id,
				body,
			});

			expect(draft.number).toBe(1);
			const state = await getContentState(tx, romans, author.id);
			expect(state).toMatchObject({
				canEdit: true,
				live: null,
				open: { number: 1, status: "draft" },
				title: "Romans overview",
			});
			expect(state.body).toEqual(body);
		});
	});

	it("keeps saving over the same draft", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author } = await setUp(tx);
			const first = await saveDraft(tx, {
				...romans,
				actorUserId: author.id,
				body,
			});
			const second = await saveDraft(tx, {
				...romans,
				actorUserId: author.id,
				body: { ...body, author: "Paul" },
			});

			expect(second.revisionId).toBe(first.revisionId);
			const state = await getContentState(tx, romans, author.id);
			expect(state.body).toMatchObject({ author: "Paul" });
		});
	});

	it("needs permission to write, and a real book", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, member } = await setUp(tx);
			await expect(
				saveDraft(tx, { ...romans, actorUserId: member.id, body }),
			).rejects.toThrow("permission");
			await expect(
				saveDraft(tx, {
					kind: "book_overview",
					scopeKey: "not-a-book",
					actorUserId: author.id,
					body,
				}),
			).rejects.toThrow("no longer exists");
		});
	});

	it("won't let someone else overwrite a draft in progress", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			await saveDraft(tx, { ...romans, actorUserId: author.id, body });

			await expect(
				saveDraft(tx, { ...romans, actorUserId: reviewer.id, body }),
			).rejects.toThrow("already working on");
			expect(await getContentState(tx, romans, reviewer.id)).toMatchObject({
				canEdit: false,
			});
		});
	});

	it("lets the author throw a draft away", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const draft = await saveDraft(tx, {
				...romans,
				actorUserId: author.id,
				body,
			});

			await expect(
				discardDraft(tx, {
					actorUserId: reviewer.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("Only the person writing");
			await discardDraft(tx, {
				actorUserId: author.id,
				revisionId: draft.revisionId,
			});
			expect((await getContentState(tx, romans, author.id)).open).toBeNull();
		});
	});
});

describe("submitting", () => {
	it("needs what the kind requires, and only the author can do it", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const empty = await saveDraft(tx, {
				...romans,
				actorUserId: author.id,
				body: emptyBookOverview,
			});

			await expect(
				submitRevision(tx, {
					actorUserId: author.id,
					revisionId: empty.revisionId,
				}),
			).rejects.toThrow("summary");

			await saveDraft(tx, { ...romans, actorUserId: author.id, body });
			await expect(
				submitRevision(tx, {
					actorUserId: reviewer.id,
					revisionId: empty.revisionId,
				}),
			).rejects.toThrow("Only the person writing");
		});
	});

	it("records it, and locks further saves", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author } = await setUp(tx);
			const draft = await submitted(tx, author.id);

			expect(await statusOf(tx, draft.revisionId)).toBe("submitted");
			await expect(
				saveDraft(tx, { ...romans, actorUserId: author.id, body }),
			).rejects.toThrow("waiting for review");
			const entries = await tx
				.select()
				.from(auditLog)
				.where(eq(auditLog.action, "revision.submitted"));
			expect(entries.at(-1)?.actorUserId).toBe(author.id);
		});
	});

	it("is refused by the database if anything tries to change the wording", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author } = await setUp(tx);
			const draft = await submitted(tx, author.id);

			await expect(
				tx.transaction((attempt) =>
					attempt
						.update(contentRevisions)
						.set({ body: { summary: "Changed" } })
						.where(eq(contentRevisions.id, draft.revisionId)),
				),
			).rejects.toThrow();
			await expect(
				tx.transaction((attempt) =>
					attempt
						.delete(contentRevisions)
						.where(eq(contentRevisions.id, draft.revisionId)),
				),
			).rejects.toThrow();
		});
	});
});

describe("reviewing", () => {
	it("won't let the author check or approve their own work", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const draft = await submitted(tx, author.id);
			const page = await getRevisionPage(tx, draft, reviewer.id);
			const checklistId = page?.checks[0]?.id ?? 0;

			await expect(
				recordCheck(tx, {
					actorUserId: author.id,
					checklistId,
					note: "",
					result: "passed",
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("someone else");
			await expect(
				approveRevision(tx, {
					actorUserId: author.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("someone else");
			await expect(
				requestChanges(tx, {
					actorUserId: author.id,
					feedback: "My own note",
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("someone else");
			await expect(
				startReview(tx, {
					actorUserId: author.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("someone else");
		});
	});

	it("is refused by the database too, whatever the code does", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author } = await setUp(tx);
			const draft = await submitted(tx, author.id);

			await expect(
				tx.transaction((attempt) =>
					attempt
						.update(contentRevisions)
						.set({ reviewerUserId: author.id })
						.where(eq(contentRevisions.id, draft.revisionId)),
				),
			).rejects.toThrow();
		});
	});

	it("moves to in review when someone picks it up", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const draft = await submitted(tx, author.id);

			await startReview(tx, {
				actorUserId: reviewer.id,
				revisionId: draft.revisionId,
			});

			expect(await statusOf(tx, draft.revisionId)).toBe("in_review");
		});
	});

	it("won't approve until every check passed or doesn't apply", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const draft = await submitted(tx, author.id);
			const page = await getRevisionPage(tx, draft, reviewer.id);
			const [first, ...rest] = page?.checks ?? [];
			const approve = () =>
				approveRevision(tx, {
					actorUserId: reviewer.id,
					revisionId: draft.revisionId,
				});

			await expect(approve()).rejects.toThrow("still needs checking");

			for (const check of rest) {
				await recordCheck(tx, {
					actorUserId: reviewer.id,
					checklistId: check.id,
					note: "",
					result: "not_applicable",
					revisionId: draft.revisionId,
				});
			}
			await recordCheck(tx, {
				actorUserId: reviewer.id,
				checklistId: first?.id ?? 0,
				note: "A reference is wrong",
				result: "failed",
				revisionId: draft.revisionId,
			});
			await expect(approve()).rejects.toThrow("failed");

			await recordCheck(tx, {
				actorUserId: reviewer.id,
				checklistId: first?.id ?? 0,
				note: "Fixed now",
				result: "passed",
				revisionId: draft.revisionId,
			});
			await approve();
			expect(await statusOf(tx, draft.revisionId)).toBe("approved");
		});
	});

	it("won't approve if the checks were never set up, rather than skip them", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const draft = await submitted(tx, author.id);
			await tx.execute(sql`TRUNCATE TABLE editorial_checklists CASCADE`);

			await expect(
				approveRevision(tx, {
					actorUserId: reviewer.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("db:access:sync");
		});
	});

	it("doesn't ask a book overview for the original-language check", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const draft = await submitted(tx, author.id);
			const page = await getRevisionPage(tx, draft, reviewer.id);

			expect(page?.checks.map(({ requirement }) => requirement)).toEqual([
				"Scripture references verified",
				"Every claim cited",
				"Theological review",
				"Style & readability",
			]);
		});
	});

	it("needs permission to check and to approve", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, member } = await setUp(tx);
			const draft = await submitted(tx, author.id);

			await expect(
				approveRevision(tx, {
					actorUserId: member.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("permission");
			await expect(
				recordCheck(tx, {
					actorUserId: member.id,
					checklistId: 1,
					note: "",
					result: "passed",
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("permission");
		});
	});

	it("sends changes back with the reason, and the next edit is a new revision", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const first = await submitted(tx, author.id);

			await expect(
				requestChanges(tx, {
					actorUserId: reviewer.id,
					feedback: "  ",
					revisionId: first.revisionId,
				}),
			).rejects.toThrow("Say what");
			await requestChanges(tx, {
				actorUserId: reviewer.id,
				feedback: "Say more about Paul",
				revisionId: first.revisionId,
			});

			expect(await statusOf(tx, first.revisionId)).toBe("changes_requested");
			const told = await tx
				.select()
				.from(notifications)
				.where(eq(notifications.userId, author.id));
			expect(told.at(-1)?.body).toContain("Say more about Paul");

			const state = await getContentState(tx, romans, author.id);
			expect(state).toMatchObject({
				canEdit: true,
				feedback: "Say more about Paul",
				open: null,
			});
			expect(state.body).toEqual(body);

			const second = await saveDraft(tx, {
				...romans,
				actorUserId: author.id,
				body: { ...body, author: "Paul" },
			});
			expect(second.number).toBe(2);
			expect(second.revisionId).not.toBe(first.revisionId);
		});
	});

	it("can pull an approved revision back before it is published", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, author, reviewer } = await setUp(tx);
			const draft = await approved(tx, author.id, reviewer.id);

			await requestChanges(tx, {
				actorUserId: reviewer.id,
				feedback: "I missed something",
				revisionId: draft.revisionId,
			});

			await expect(
				publishRevision(tx, {
					actorUserId: admin.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("approved");
		});
	});

	it("keeps review history when someone else reviews again", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, author, reviewer } = await setUp(tx);
			const draft = await approved(tx, author.id, reviewer.id);
			await requestChanges(tx, {
				actorUserId: admin.id,
				feedback: "Needs another look",
				revisionId: draft.revisionId,
			});

			const page = await getRevisionPage(tx, draft, admin.id);
			expect(page?.reviews.map(({ decision }) => decision).sort()).toEqual([
				"approved",
				"changes_requested",
			]);
		});
	});
});

describe("publishing", () => {
	it("needs approval first", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, author } = await setUp(tx);
			const draft = await submitted(tx, author.id);

			await expect(
				publishRevision(tx, {
					actorUserId: admin.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("approved");
		});
	});

	it("needs permission, which a Contributor doesn't have", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const draft = await approved(tx, author.id, reviewer.id);

			await expect(
				publishRevision(tx, {
					actorUserId: reviewer.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("permission");
		});
	});

	it("makes that exact revision live, and records who did it", async () => {
		await inRolledBackTransaction(async (tx) => {
			const people = await setUp(tx);
			const draft = await published(tx, people);

			expect(await getLiveContent(tx, romans)).toMatchObject({
				body,
				number: 1,
				revisionId: draft.revisionId,
			});

			const [entry] = await tx
				.select()
				.from(auditLog)
				.where(eq(auditLog.action, "revision.published"))
				.orderBy(sql`${auditLog.id} DESC`)
				.limit(1);
			expect(entry?.actorUserId).toBe(people.admin.id);
			expect(entry?.details).toMatchObject({ revisionId: draft.revisionId });

			const history = await tx
				.select()
				.from(publicationHistory)
				.where(eq(publicationHistory.contentRevisionId, draft.revisionId));
			expect(history.map(({ action }) => action)).toEqual(["published"]);
		});
	});

	it("lets the author publish once someone else has approved", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, reviewer } = await setUp(tx);
			const draft = await saveDraft(tx, {
				...romans,
				actorUserId: admin.id,
				body,
			});
			await submitRevision(tx, {
				actorUserId: admin.id,
				revisionId: draft.revisionId,
			});
			await passAllChecks(
				tx,
				reviewer.id,
				draft.contentItemId,
				draft.revisionId,
			);
			await approveRevision(tx, {
				actorUserId: reviewer.id,
				revisionId: draft.revisionId,
			});

			await publishRevision(tx, {
				actorUserId: admin.id,
				revisionId: draft.revisionId,
			});
			expect(await statusOf(tx, draft.revisionId)).toBe("published");
		});
	});

	it("keeps the old revision live until the new one is published", async () => {
		await inRolledBackTransaction(async (tx) => {
			const people = await setUp(tx);
			const first = await published(tx, people);

			const second = await saveDraft(tx, {
				...romans,
				actorUserId: people.author.id,
				body: { ...body, author: "Paul" },
			});
			expect(second.number).toBe(2);
			await submitRevision(tx, {
				actorUserId: people.author.id,
				revisionId: second.revisionId,
			});
			await passAllChecks(
				tx,
				people.reviewer.id,
				second.contentItemId,
				second.revisionId,
			);
			await approveRevision(tx, {
				actorUserId: people.reviewer.id,
				revisionId: second.revisionId,
			});
			expect((await getLiveContent(tx, romans))?.revisionId).toBe(
				first.revisionId,
			);

			await publishRevision(tx, {
				actorUserId: people.admin.id,
				revisionId: second.revisionId,
			});
			expect((await getLiveContent(tx, romans))?.revisionId).toBe(
				second.revisionId,
			);
			expect(await statusOf(tx, first.revisionId)).toBe("superseded");
		});
	});

	it("shows what changed from the live revision", async () => {
		await inRolledBackTransaction(async (tx) => {
			const people = await setUp(tx);
			await published(tx, people);
			const second = await saveDraft(tx, {
				...romans,
				actorUserId: people.author.id,
				body: { ...body, summary: "A longer letter on the gospel." },
			});

			const page = await getRevisionPage(tx, second, people.author.id);
			expect(page).toMatchObject({
				liveRevision: { number: 1 },
				revision: { number: 2 },
			});
			expect(
				page?.changes.find(({ label }) => label === "Summary"),
			).toMatchObject({
				after: "A longer letter on the gospel.",
				before: "A letter on the gospel.",
			});
			expect(
				page?.changes.find(({ label }) => label === "Author"),
			).toMatchObject({ after: "", before: "" });
		});
	});
});

describe("withdrawing", () => {
	it("takes it away from readers, with a reason, and allows a new revision", async () => {
		await inRolledBackTransaction(async (tx) => {
			const people = await setUp(tx);
			const draft = await published(tx, people);
			const withdraw = (reason: string) =>
				withdrawLive(tx, {
					actorUserId: people.admin.id,
					contentItemId: draft.contentItemId,
					reason,
				});

			await expect(withdraw(" ")).rejects.toThrow("Say why");
			await withdraw("A factual error was reported");

			expect(await getLiveContent(tx, romans)).toBeNull();
			expect(await statusOf(tx, draft.revisionId)).toBe("withdrawn");
			const history = await tx
				.select()
				.from(publicationHistory)
				.where(eq(publicationHistory.contentRevisionId, draft.revisionId));
			expect(history.map(({ action, reason }) => [action, reason])).toEqual([
				["published", null],
				["withdrawn", "A factual error was reported"],
			]);

			const next = await saveDraft(tx, {
				...romans,
				actorUserId: people.author.id,
				body,
			});
			expect(next.number).toBe(2);
		});
	});

	it("needs permission, and something live", async () => {
		await inRolledBackTransaction(async (tx) => {
			const people = await setUp(tx);
			const draft = await saveDraft(tx, {
				...romans,
				actorUserId: people.author.id,
				body,
			});

			await expect(
				withdrawLive(tx, {
					actorUserId: people.admin.id,
					contentItemId: draft.contentItemId,
					reason: "Reason",
				}),
			).rejects.toThrow("Nothing is live");
			await expect(
				withdrawLive(tx, {
					actorUserId: people.author.id,
					contentItemId: draft.contentItemId,
					reason: "Reason",
				}),
			).rejects.toThrow("permission");
		});
	});
});

describe("queues", () => {
	it("shows reviewers what's waiting, never their own", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, author, reviewer } = await setUp(tx);
			const draft = await submitted(tx, author.id);

			expect(await listReviewQueue(tx, reviewer.id)).toMatchObject([
				{ revisionId: draft.revisionId, title: "Romans overview" },
			]);
			expect(await listReviewQueue(tx, author.id)).toEqual([]);

			const counts = (userId: string) =>
				getStaffQueueCounts(tx, {
					permissionKeys: ["editorial.review", "editorial.assign"],
					userId,
				});
			expect((await counts(reviewer.id)).awaitingReview).toBe(1);
			expect((await counts(author.id)).awaitingReview).toBe(0);

			expect((await listEditorialQueue(tx)).at(0)).toMatchObject({
				author: "Test Person",
				status: "submitted",
			});
			expect(admin.id).toBeTruthy();
		});
	});

	it("lets an Admin assign a reviewer, who sees it in their assignments", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, author, reviewer } = await setUp(tx);
			const draft = await submitted(tx, author.id);

			await expect(
				assignReviewer(tx, {
					actorUserId: admin.id,
					assigneeUserId: author.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("their own");
			await expect(
				assignReviewer(tx, {
					actorUserId: reviewer.id,
					assigneeUserId: reviewer.id,
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("permission");

			await assignReviewer(tx, {
				actorUserId: admin.id,
				assigneeUserId: reviewer.id,
				revisionId: draft.revisionId,
			});

			expect(await listAssignments(tx, reviewer.id)).toMatchObject([
				{ revisionId: draft.revisionId, role: "reviewer" },
			]);
			const counts = await getStaffQueueCounts(tx, {
				permissionKeys: ["editorial.review"],
				userId: reviewer.id,
			});
			expect(counts.myAssignments).toBe(1);
			const told = await tx
				.select()
				.from(notifications)
				.where(eq(notifications.userId, reviewer.id));
			expect(told).toHaveLength(1);

			// Anyone can still review, so work doesn't wait on the assignee.
			await passAllChecks(tx, admin.id, draft.contentItemId, draft.revisionId);
			await approveRevision(tx, {
				actorUserId: admin.id,
				revisionId: draft.revisionId,
			});
			expect(await listAssignments(tx, reviewer.id)).toEqual([]);
		});
	});

	it("lets an Admin hand a stuck draft to another writer", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, author, reviewer } = await setUp(tx);
			const draft = await saveDraft(tx, {
				...romans,
				actorUserId: author.id,
				body,
			});

			await assignWriter(tx, {
				actorUserId: admin.id,
				assigneeUserId: reviewer.id,
				revisionId: draft.revisionId,
			});

			expect(await getContentState(tx, romans, reviewer.id)).toMatchObject({
				canEdit: true,
			});
			expect(await getContentState(tx, romans, author.id)).toMatchObject({
				canEdit: false,
			});
		});
	});

	it("shows authors their own work, with what needs them first", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const first = await submitted(tx, author.id);
			await requestChanges(tx, {
				actorUserId: reviewer.id,
				feedback: "More detail",
				revisionId: first.revisionId,
			});

			expect(await listMyWork(tx, author.id)).toMatchObject([
				{ number: 1, status: "changes_requested", title: "Romans overview" },
			]);
			expect(await listMyWork(tx, reviewer.id)).toEqual([]);
		});
	});

	it("drops changes-requested work from My Work once a new draft exists", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, reviewer } = await setUp(tx);
			const first = await submitted(tx, author.id);
			await requestChanges(tx, {
				actorUserId: reviewer.id,
				feedback: "More detail",
				revisionId: first.revisionId,
			});
			await saveDraft(tx, { ...romans, actorUserId: author.id, body });

			expect(await listMyWork(tx, author.id)).toMatchObject([
				{ number: 2, status: "draft" },
			]);
		});
	});

	it("counts approved revisions as ready to publish", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, author, reviewer } = await setUp(tx);
			const draft = await approved(tx, author.id, reviewer.id);

			expect(await listApprovedContent(tx)).toMatchObject([
				{ number: 1, revisionId: draft.revisionId },
			]);
			const counts = await getStaffQueueCounts(tx, {
				permissionKeys: ["publication.publish"],
				userId: admin.id,
			});
			expect(counts.readyToPublish).toBeGreaterThanOrEqual(1);
		});
	});
});

describe("issues", () => {
	it("records an issue on a revision, which can be resolved, without blocking", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { admin, author, reviewer } = await setUp(tx);
			const draft = await approved(tx, author.id, reviewer.id);

			await expect(
				raiseIssue(tx, {
					actorUserId: reviewer.id,
					description: "  ",
					issueType: "typo",
					revisionId: draft.revisionId,
				}),
			).rejects.toThrow("Describe");
			const issueId = await raiseIssue(tx, {
				actorUserId: reviewer.id,
				description: "Add Genesis 50:20 as a cross-reference",
				issueType: "other",
				revisionId: draft.revisionId,
			});

			const page = await getRevisionPage(tx, draft, admin.id);
			expect(page?.issues).toMatchObject([
				{
					description: "Add Genesis 50:20 as a cross-reference",
					status: "open",
				},
			]);
			expect((await listOpenIssues(tx)).at(0)?.title).toBe("Romans overview");

			await publishRevision(tx, {
				actorUserId: admin.id,
				revisionId: draft.revisionId,
			});

			await expect(
				closeIssue(tx, {
					actorUserId: reviewer.id,
					issueId,
					outcome: "resolved",
				}),
			).rejects.toThrow("permission");
			await closeIssue(tx, {
				actorUserId: admin.id,
				issueId,
				outcome: "resolved",
			});
			expect(await listOpenIssues(tx)).toEqual([]);
		});
	});
});
