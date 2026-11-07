import { and, desc, eq, inArray, isNotNull, max, ne } from "drizzle-orm";

import { getPermissionKeys } from "./access";
import type { PermissionKey } from "./access-catalogue";
import { recordAudit } from "./audit";
import {
	type ContentKindName,
	contentKindNamed,
} from "./content-kind-registry";
import {
	type ContentIssueType,
	type EditorialCheckResult,
	openRevisionStatuses,
} from "./content-kinds";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { createNotification } from "./notifications";
import { user } from "./schema/auth";
import { contentIssues } from "./schema/content_issues";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { editorialAssignments } from "./schema/editorial_assignments";
import { editorialChecklists } from "./schema/editorial_checklists";
import { editorialChecks } from "./schema/editorial_checks";
import { editorialReviews } from "./schema/editorial_reviews";
import { publicationHistory } from "./schema/publication_history";

export type ContentScope<TKind extends ContentKindName = ContentKindName> = {
	kind: TKind;
	scopeKey: string;
};

async function requirePermission(
	client: DbExecutor,
	userId: string,
	...anyOf: PermissionKey[]
) {
	const keys = await getPermissionKeys(client, userId);
	if (!anyOf.some((key) => keys.includes(key))) {
		throw new GovernanceError("You don't have permission to do this.");
	}
	return keys;
}

/** A revision and its content, held until the transaction ends, so decisions take turns. */
async function lockRevision(client: DbExecutor, revisionId: number) {
	const [revision] = await client
		.select()
		.from(contentRevisions)
		.where(eq(contentRevisions.id, revisionId))
		.for("update");
	if (!revision) throw new GovernanceError("This revision no longer exists.");
	const [item] = await client
		.select()
		.from(contentItems)
		.where(eq(contentItems.id, revision.contentItemId))
		.for("update");
	if (!item) throw new GovernanceError("This content no longer exists.");
	return { item, revision };
}

function assertNotAuthor(
	revision: { createdByUserId: string },
	actorUserId: string,
) {
	if (revision.createdByUserId === actorUserId) {
		throw new GovernanceError(
			"You wrote this revision, so someone else has to review it.",
		);
	}
}

function revisionAddress(contentItemId: number, revisionId: number) {
	return `/admin/editorial/${contentItemId}/revisions/${revisionId}`;
}

/**
 * Saves wording as a draft, creating the content or a new revision if needed. One
 * draft at a time per piece of content, so nobody's work is silently overwritten.
 */
export async function saveDraft(
	client: DbExecutor,
	input: ContentScope & { actorUserId: string; body: unknown },
) {
	const kind = contentKindNamed(input.kind);
	const body = kind.parse(input.body);
	const followTitle = async (
		tx: DbExecutor,
		item: { id: number; liveRevisionId: number | null },
	) => {
		// Once something's live, its name stays until a new revision takes over.
		if (!kind.titleFollowsBody || item.liveRevisionId) return;
		await tx
			.update(contentItems)
			.set({ title: await kind.title(tx, input.scopeKey, body) })
			.where(eq(contentItems.id, item.id));
	};

	return client.transaction(async (tx) => {
		const [existing] = await tx
			.select()
			.from(contentItems)
			.where(
				and(
					eq(contentItems.kind, input.kind),
					eq(contentItems.scopeKey, input.scopeKey),
				),
			)
			.for("update");

		await requirePermission(
			tx,
			input.actorUserId,
			existing?.liveRevisionId
				? kind.writePermissions.revise
				: kind.writePermissions.create,
		);
		await kind.assertCanDraft(tx, input.scopeKey, body);

		const item =
			existing ??
			(
				await tx
					.insert(contentItems)
					.values({
						kind: input.kind,
						scopeKey: input.scopeKey,
						title: await kind.title(tx, input.scopeKey, body),
					})
					.returning()
			)[0];
		if (!item) throw new Error("Could not save the content.");

		const [open] = await tx
			.select({
				authorName: user.name,
				createdByUserId: contentRevisions.createdByUserId,
				id: contentRevisions.id,
				number: contentRevisions.number,
				status: contentRevisions.status,
			})
			.from(contentRevisions)
			.innerJoin(user, eq(user.id, contentRevisions.createdByUserId))
			.where(
				and(
					eq(contentRevisions.contentItemId, item.id),
					inArray(contentRevisions.status, [...openRevisionStatuses]),
				),
			);

		if (open) {
			if (open.status !== "draft") {
				throw new GovernanceError(
					open.status === "approved"
						? "This revision is approved and waiting to be published, so a new one can't start yet."
						: "This revision is waiting for review, so it can't change. Ask a reviewer to send it back if something's wrong.",
				);
			}
			if (open.createdByUserId !== input.actorUserId) {
				throw new GovernanceError(
					`${open.authorName} is already working on a draft of this.`,
				);
			}
			await tx
				.update(contentRevisions)
				.set({ body, updatedAt: new Date() })
				.where(eq(contentRevisions.id, open.id));
			await kind.afterDraftSaved(tx, {
				body,
				revisionId: open.id,
				scopeKey: input.scopeKey,
			});
			await followTitle(tx, item);
			return {
				contentItemId: item.id,
				number: open.number,
				revisionId: open.id,
			};
		}

		const [latest] = await tx
			.select({ value: max(contentRevisions.number) })
			.from(contentRevisions)
			.where(eq(contentRevisions.contentItemId, item.id));
		const [basedOn] = await tx
			.select({ id: contentRevisions.id })
			.from(contentRevisions)
			.where(eq(contentRevisions.contentItemId, item.id))
			.orderBy(desc(contentRevisions.number))
			.limit(1);

		const number = (latest?.value ?? 0) + 1;
		const [revision] = await tx
			.insert(contentRevisions)
			.values({
				basedOnRevisionId: basedOn?.id ?? null,
				body,
				contentItemId: item.id,
				createdByUserId: input.actorUserId,
				number,
			})
			.returning({ id: contentRevisions.id });
		if (!revision) throw new Error("Could not save the draft.");
		await kind.afterDraftSaved(tx, {
			body,
			revisionId: revision.id,
			scopeKey: input.scopeKey,
		});
		await followTitle(tx, item);
		return { contentItemId: item.id, number, revisionId: revision.id };
	});
}

async function assertCanTouchDraft(
	tx: DbExecutor,
	revision: { createdByUserId: string; status: string },
	actorUserId: string,
	action: string,
) {
	if (revision.status !== "draft") {
		throw new GovernanceError("This revision isn't a draft any more.");
	}
	if (revision.createdByUserId === actorUserId) return;
	const keys = await getPermissionKeys(tx, actorUserId);
	if (action === "discard" && keys.includes("editorial.assign")) return;
	throw new GovernanceError(`Only the person writing it can ${action} it.`);
}

/** Throws a draft away. Nothing about it was ever submitted, so nothing is lost from the record. */
export async function discardDraft(
	client: DbExecutor,
	input: { actorUserId: string; revisionId: number },
) {
	await client.transaction(async (tx) => {
		const { item, revision } = await lockRevision(tx, input.revisionId);
		await assertCanTouchDraft(tx, revision, input.actorUserId, "discard");
		await tx
			.delete(editorialAssignments)
			.where(eq(editorialAssignments.contentRevisionId, revision.id));
		await tx
			.delete(contentRevisions)
			.where(eq(contentRevisions.id, revision.id));

		const { removeWhenEmpty } = contentKindNamed(item.kind);
		if (!removeWhenEmpty) return;
		const [remaining] = await tx
			.select({ id: contentRevisions.id })
			.from(contentRevisions)
			.where(eq(contentRevisions.contentItemId, item.id))
			.limit(1);
		if (remaining) return;
		await tx.delete(contentItems).where(eq(contentItems.id, item.id));
		await removeWhenEmpty(tx, item.scopeKey);
	});
}

/** Sends a draft for review. From here its wording is fixed. */
export async function submitRevision(
	client: DbExecutor,
	input: { actorUserId: string; revisionId: number },
) {
	await client.transaction(async (tx) => {
		const { item, revision } = await lockRevision(tx, input.revisionId);
		await assertCanTouchDraft(tx, revision, input.actorUserId, "send");
		await contentKindNamed(item.kind).assertReadyForReview(revision.body, {
			client: tx,
			scopeKey: item.scopeKey,
		});

		const now = new Date();
		await tx
			.update(contentRevisions)
			.set({ status: "submitted", submittedAt: now, updatedAt: now })
			.where(eq(contentRevisions.id, revision.id));
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "revision.submitted",
			targetType: "content_revision",
			targetId: revision.id,
			details: { name: `${item.title} #${revision.number}` },
		});
	});
}

/** Picks a submitted revision up, so others can see someone is on it. */
export async function startReview(
	client: DbExecutor,
	input: { actorUserId: string; revisionId: number },
) {
	await client.transaction(async (tx) => {
		const { revision } = await lockRevision(tx, input.revisionId);
		await requirePermission(tx, input.actorUserId, "editorial.review");
		assertNotAuthor(revision, input.actorUserId);
		if (revision.status !== "submitted") {
			throw new GovernanceError("This revision isn't waiting to be picked up.");
		}
		await tx
			.update(contentRevisions)
			.set({
				reviewerUserId: input.actorUserId,
				status: "in_review",
				updatedAt: new Date(),
			})
			.where(eq(contentRevisions.id, revision.id));
	});
}

/** The checks this kind of content has to pass, in order. */
export async function checksFor(
	client: DbExecutor,
	kindName: string,
	body: unknown,
) {
	const rows = await client
		.select()
		.from(editorialChecklists)
		.orderBy(editorialChecklists.position);
	const needsOriginalLanguage =
		contentKindNamed(kindName).requiresOriginalLanguageCheck(body);
	return rows.filter(
		({ originalLanguageOnly }) =>
			!originalLanguageOnly || needsOriginalLanguage,
	);
}

/** Records one check's result. Results can change until the revision is decided. */
export async function recordCheck(
	client: DbExecutor,
	input: {
		actorUserId: string;
		checklistId: number;
		note: string;
		result: EditorialCheckResult;
		revisionId: number;
	},
) {
	await client.transaction(async (tx) => {
		const { item, revision } = await lockRevision(tx, input.revisionId);
		const keys = await requirePermission(
			tx,
			input.actorUserId,
			"editorial.check",
		);
		assertNotAuthor(revision, input.actorUserId);
		if (revision.status !== "submitted" && revision.status !== "in_review") {
			throw new GovernanceError(
				"This revision isn't being reviewed right now.",
			);
		}

		const applicable = await checksFor(tx, item.kind, revision.body);
		const check = applicable.find(({ id }) => id === input.checklistId);
		if (!check) {
			throw new GovernanceError("This check doesn't apply to this content.");
		}
		if (
			check.originalLanguageOnly &&
			!keys.includes("editorial.check_original_language")
		) {
			throw new GovernanceError(
				"This check needs someone who can check original-language content.",
			);
		}

		const values = {
			checkedAt: new Date(),
			checkedByUserId: input.actorUserId,
			note: input.note.trim() || null,
			result: input.result,
		};
		await tx
			.insert(editorialChecks)
			.values({
				...values,
				contentRevisionId: revision.id,
				editorialChecklistId: check.id,
			})
			.onConflictDoUpdate({
				target: [
					editorialChecks.contentRevisionId,
					editorialChecks.editorialChecklistId,
				],
				set: values,
			});
	});
}

async function saveReview(
	tx: DbExecutor,
	input: {
		decision: "approved" | "changes_requested";
		feedback: string | null;
		reviewerUserId: string;
		revisionId: number;
	},
) {
	const values = {
		createdAt: new Date(),
		decision: input.decision,
		feedback: input.feedback,
	};
	await tx
		.insert(editorialReviews)
		.values({
			...values,
			contentRevisionId: input.revisionId,
			reviewerUserId: input.reviewerUserId,
		})
		.onConflictDoUpdate({
			target: [
				editorialReviews.contentRevisionId,
				editorialReviews.reviewerUserId,
			],
			set: values,
		});
}

/** Approves a revision for publishing. Every check has to be finished first. */
export async function approveRevision(
	client: DbExecutor,
	input: { actorUserId: string; revisionId: number },
) {
	await client.transaction(async (tx) => {
		const { item, revision } = await lockRevision(tx, input.revisionId);
		await requirePermission(tx, input.actorUserId, "editorial.review");
		assertNotAuthor(revision, input.actorUserId);
		if (revision.status !== "submitted" && revision.status !== "in_review") {
			throw new GovernanceError("This revision isn't waiting for review.");
		}

		const applicable = await checksFor(tx, item.kind, revision.body);
		if (applicable.length === 0) {
			throw new GovernanceError(
				"The editorial checks haven't been set up, so this can't be approved. Run db:access:sync.",
			);
		}
		const results = await tx
			.select({
				checklistId: editorialChecks.editorialChecklistId,
				result: editorialChecks.result,
			})
			.from(editorialChecks)
			.where(eq(editorialChecks.contentRevisionId, revision.id));
		for (const { id, requirement } of applicable) {
			const result = results.find((row) => row.checklistId === id)?.result;
			if (!result) {
				throw new GovernanceError(`"${requirement}" still needs checking.`);
			}
			if (result === "failed") {
				throw new GovernanceError(
					`"${requirement}" failed, so this can't be approved. Request changes, or check it again.`,
				);
			}
		}

		await saveReview(tx, {
			decision: "approved",
			feedback: null,
			reviewerUserId: input.actorUserId,
			revisionId: revision.id,
		});
		const now = new Date();
		await tx
			.update(contentRevisions)
			.set({
				approvedAt: now,
				reviewerUserId: input.actorUserId,
				status: "approved",
				updatedAt: now,
			})
			.where(eq(contentRevisions.id, revision.id));
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "revision.approved",
			targetType: "content_revision",
			targetId: revision.id,
			details: { name: `${item.title} #${revision.number}` },
		});
		await createNotification(tx, {
			userId: revision.createdByUserId,
			kind: "content_review",
			title: `${item.title} was approved`,
			body: `Revision #${revision.number} is ready to be published.`,
			destination: revisionAddress(item.id, revision.id),
		});
	});
}

/** Sends a revision back. It stays as it was, and the fix becomes the next revision. */
export async function requestChanges(
	client: DbExecutor,
	input: { actorUserId: string; feedback: string; revisionId: number },
) {
	const feedback = input.feedback.trim();

	await client.transaction(async (tx) => {
		const { item, revision } = await lockRevision(tx, input.revisionId);
		await requirePermission(tx, input.actorUserId, "editorial.review");
		assertNotAuthor(revision, input.actorUserId);
		if (!feedback) throw new GovernanceError("Say what needs to change.");
		if (!["submitted", "in_review", "approved"].includes(revision.status)) {
			throw new GovernanceError(
				"This revision isn't being reviewed right now.",
			);
		}

		await saveReview(tx, {
			decision: "changes_requested",
			feedback,
			reviewerUserId: input.actorUserId,
			revisionId: revision.id,
		});
		await tx
			.update(contentRevisions)
			.set({
				approvedAt: null,
				reviewerUserId: input.actorUserId,
				status: "changes_requested",
				updatedAt: new Date(),
			})
			.where(eq(contentRevisions.id, revision.id));
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "revision.changes_requested",
			targetType: "content_revision",
			targetId: revision.id,
			details: { name: `${item.title} #${revision.number}`, note: feedback },
		});
		await createNotification(tx, {
			userId: revision.createdByUserId,
			kind: "content_review",
			title: `Changes requested on ${item.title}`,
			body: feedback,
			destination: revisionAddress(item.id, revision.id),
		});
	});
}

/**
 * What's foundational about publishing this revision, compared with what was last
 * published, or null. Withdrawn content still counts as published before, so taking
 * something down can't be used to change its stance without a second Superadmin.
 */
export async function publicationChange(
	client: DbExecutor,
	input: {
		body: unknown;
		contentItemId: number;
		kind: string;
		revisionId: number;
	},
) {
	const [previous] = await client
		.select({ body: contentRevisions.body })
		.from(contentRevisions)
		.where(
			and(
				eq(contentRevisions.contentItemId, input.contentItemId),
				ne(contentRevisions.id, input.revisionId),
				isNotNull(contentRevisions.publishedAt),
			),
		)
		.orderBy(desc(contentRevisions.publishedAt))
		.limit(1);
	if (!previous) return null;
	return contentKindNamed(input.kind).publicationConfirmation(
		previous.body,
		input.body,
	);
}

async function assertApprovedByAnother(
	tx: DbExecutor,
	revision: { createdByUserId: string; id: number; status: string },
) {
	if (revision.status !== "approved") {
		throw new GovernanceError(
			"Only an approved revision can be published, and this one isn't.",
		);
	}
	const [approval] = await tx
		.select({ reviewer: editorialReviews.reviewerUserId })
		.from(editorialReviews)
		.where(
			and(
				eq(editorialReviews.contentRevisionId, revision.id),
				eq(editorialReviews.decision, "approved"),
				ne(editorialReviews.reviewerUserId, revision.createdByUserId),
			),
		);
	if (!approval) {
		throw new GovernanceError(
			"This needs an approval from someone other than its author.",
		);
	}
}

async function publishLocked(
	tx: DbExecutor,
	{ item, revision }: Awaited<ReturnType<typeof lockRevision>>,
	actorUserId: string,
) {
	const kind = contentKindNamed(item.kind);
	await kind.assertReadyToPublish(tx, {
		body: revision.body,
		scopeKey: item.scopeKey,
	});

	const now = new Date();
	if (item.liveRevisionId) {
		await tx
			.update(contentRevisions)
			.set({ status: "superseded", updatedAt: now })
			.where(eq(contentRevisions.id, item.liveRevisionId));
	}
	await tx
		.update(contentRevisions)
		.set({
			publishedAt: now,
			publishedByUserId: actorUserId,
			status: "published",
			updatedAt: now,
		})
		.where(eq(contentRevisions.id, revision.id));
	await tx
		.update(contentItems)
		.set({
			liveRevisionId: revision.id,
			...(kind.titleFollowsBody
				? { title: await kind.title(tx, item.scopeKey, revision.body) }
				: {}),
		})
		.where(eq(contentItems.id, item.id));
	await kind.afterPublished(tx, {
		revisionId: revision.id,
		scopeKey: item.scopeKey,
	});
	await tx.insert(publicationHistory).values({
		action: "published",
		contentRevisionId: revision.id,
		performedByUserId: actorUserId,
	});
	await recordAudit(tx, {
		actorUserId,
		action: "revision.published",
		targetType: "content_revision",
		targetId: revision.id,
		details: {
			name: `${item.title} #${revision.number}`,
			revisionId: revision.id,
		},
	});
	if (revision.createdByUserId !== actorUserId) {
		await createNotification(tx, {
			userId: revision.createdByUserId,
			kind: "content_review",
			title: `${item.title} is live`,
			body: `Revision #${revision.number} has been published.`,
			destination: revisionAddress(item.id, revision.id),
		});
	}
}

/** Makes this exact revision what readers see. Whatever was live before stays on record. */
export async function publishRevision(
	client: DbExecutor,
	input: { actorUserId: string; revisionId: number },
) {
	await client.transaction(async (tx) => {
		const locked = await lockRevision(tx, input.revisionId);
		await requirePermission(tx, input.actorUserId, "publication.publish");
		await assertApprovedByAnother(tx, locked.revision);
		const change = await publicationChange(tx, {
			body: locked.revision.body,
			contentItemId: locked.item.id,
			kind: locked.item.kind,
			revisionId: locked.revision.id,
		});
		if (change) {
			throw new GovernanceError(
				`${change} Two Superadmins have to agree before this goes live.`,
			);
		}
		await publishLocked(tx, locked, input.actorUserId);
	});
}

/** Why this approved revision needs a second Superadmin. Refuses it if it no longer does. */
export async function assertPublicationConfirmable(
	client: DbExecutor,
	revisionId: number,
) {
	const { item, revision } = await lockRevision(client, revisionId);
	await assertApprovedByAnother(client, revision);
	const change = await publicationChange(client, {
		body: revision.body,
		contentItemId: item.id,
		kind: item.kind,
		revisionId: revision.id,
	});
	if (!change) {
		throw new GovernanceError(
			"This doesn't need a second Superadmin. It can be published as normal.",
		);
	}
	return { change, title: `${item.title} #${revision.number}` };
}

/** Publishes what a second Superadmin has just confirmed. They're the one publishing it. */
export async function publishConfirmedRevision(
	client: DbExecutor,
	input: { actorUserId: string; revisionId: number },
) {
	await assertPublicationConfirmable(client, input.revisionId);
	const locked = await lockRevision(client, input.revisionId);
	await publishLocked(client, locked, input.actorUserId);
}

/** Takes content away from readers. It stays on record, and a new revision can follow. */
export async function withdrawLive(
	client: DbExecutor,
	input: { actorUserId: string; contentItemId: number; reason: string },
) {
	const reason = input.reason.trim();

	await client.transaction(async (tx) => {
		await requirePermission(tx, input.actorUserId, "publication.withdraw");
		const [item] = await tx
			.select()
			.from(contentItems)
			.where(eq(contentItems.id, input.contentItemId))
			.for("update");
		if (!item) throw new GovernanceError("This content no longer exists.");
		if (!item.liveRevisionId)
			throw new GovernanceError("Nothing is live here.");
		if (!reason) throw new GovernanceError("Say why this is being withdrawn.");
		await contentKindNamed(item.kind).assertCanWithdraw(tx, item.scopeKey);

		await tx
			.update(contentRevisions)
			.set({ status: "withdrawn", updatedAt: new Date() })
			.where(eq(contentRevisions.id, item.liveRevisionId));
		await tx
			.update(contentItems)
			.set({ liveRevisionId: null })
			.where(eq(contentItems.id, item.id));
		await tx.insert(publicationHistory).values({
			action: "withdrawn",
			contentRevisionId: item.liveRevisionId,
			performedByUserId: input.actorUserId,
			reason,
		});
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "revision.withdrawn",
			targetType: "content_revision",
			targetId: item.liveRevisionId,
			details: { name: item.title, reason },
		});
	});
}

async function assertCanBeAssigned(
	tx: DbExecutor,
	assigneeUserId: string,
	...needs: PermissionKey[]
) {
	const keys = await getPermissionKeys(tx, assigneeUserId);
	if (!needs.some((key) => keys.includes(key))) {
		throw new GovernanceError(
			"That person doesn't have permission to do this.",
		);
	}
}

/** Asks someone to review. Others can still pick it up, so work doesn't wait on them. */
export async function assignReviewer(
	client: DbExecutor,
	input: { actorUserId: string; assigneeUserId: string; revisionId: number },
) {
	await client.transaction(async (tx) => {
		const { item, revision } = await lockRevision(tx, input.revisionId);
		await requirePermission(tx, input.actorUserId, "editorial.assign");
		if (revision.status !== "submitted" && revision.status !== "in_review") {
			throw new GovernanceError("This revision isn't waiting for review.");
		}
		if (revision.createdByUserId === input.assigneeUserId) {
			throw new GovernanceError("Nobody can review their own work.");
		}
		await assertCanBeAssigned(tx, input.assigneeUserId, "editorial.review");

		await tx
			.insert(editorialAssignments)
			.values({
				assignedByUserId: input.actorUserId,
				assigneeUserId: input.assigneeUserId,
				contentRevisionId: revision.id,
				role: "reviewer",
			})
			.onConflictDoNothing();
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "revision.assigned",
			targetType: "content_revision",
			targetId: revision.id,
			details: { name: `${item.title} #${revision.number}`, role: "reviewer" },
		});
		await createNotification(tx, {
			userId: input.assigneeUserId,
			kind: "content_review",
			title: `Please review ${item.title}`,
			body: `Revision #${revision.number} has been assigned to you.`,
			destination: revisionAddress(item.id, revision.id),
		});
	});
}

/** Hands a stuck draft to someone else, who becomes its author. */
export async function assignWriter(
	client: DbExecutor,
	input: { actorUserId: string; assigneeUserId: string; revisionId: number },
) {
	await client.transaction(async (tx) => {
		const { item, revision } = await lockRevision(tx, input.revisionId);
		await requirePermission(tx, input.actorUserId, "editorial.assign");
		if (revision.status !== "draft") {
			throw new GovernanceError("Only a draft can go to another writer.");
		}
		const { create, revise } = contentKindNamed(item.kind).writePermissions;
		await assertCanBeAssigned(tx, input.assigneeUserId, create, revise);

		await tx
			.update(contentRevisions)
			.set({ createdByUserId: input.assigneeUserId, updatedAt: new Date() })
			.where(eq(contentRevisions.id, revision.id));
		await tx
			.insert(editorialAssignments)
			.values({
				assignedByUserId: input.actorUserId,
				assigneeUserId: input.assigneeUserId,
				contentRevisionId: revision.id,
				role: "writer",
			})
			.onConflictDoNothing();
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "revision.assigned",
			targetType: "content_revision",
			targetId: revision.id,
			details: { name: `${item.title} #${revision.number}`, role: "writer" },
		});
		await createNotification(tx, {
			userId: input.assigneeUserId,
			kind: "content_review",
			title: `Please finish ${item.title}`,
			body: `Revision #${revision.number} has been handed to you.`,
			destination: revisionAddress(item.id, revision.id),
		});
	});
}

/** Records a problem with a revision. Issues never block publishing by themselves. */
export async function raiseIssue(
	client: DbExecutor,
	input: {
		actorUserId: string;
		description: string;
		issueType: ContentIssueType;
		revisionId: number;
	},
) {
	const description = input.description.trim();
	if (!description) throw new GovernanceError("Describe the issue.");

	await requirePermission(client, input.actorUserId, "issues.create");
	const [issue] = await client
		.insert(contentIssues)
		.values({
			contentRevisionId: input.revisionId,
			description,
			issueType: input.issueType,
			reportedByUserId: input.actorUserId,
		})
		.returning({ id: contentIssues.id });
	if (!issue) throw new Error("Could not save the issue.");
	return issue.id;
}

export async function closeIssue(
	client: DbExecutor,
	input: {
		actorUserId: string;
		issueId: number;
		outcome: "dismissed" | "resolved";
	},
) {
	await client.transaction(async (tx) => {
		await requirePermission(tx, input.actorUserId, "issues.manage");
		const closed = await tx
			.update(contentIssues)
			.set({
				closedAt: new Date(),
				closedByUserId: input.actorUserId,
				status: input.outcome,
			})
			.where(
				and(
					eq(contentIssues.id, input.issueId),
					eq(contentIssues.status, "open"),
				),
			)
			.returning({ revisionId: contentIssues.contentRevisionId });
		if (closed.length === 0) {
			throw new GovernanceError("This issue has already been closed.");
		}
		await recordAudit(tx, {
			actorUserId: input.actorUserId,
			action: "content_issue.closed",
			targetType: "content_issue",
			targetId: input.issueId,
			details: { decision: input.outcome },
		});
	});
}
