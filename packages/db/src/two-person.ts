import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";

import { getPermissionKeys } from "./access";
import type { PermissionKey } from "./access-catalogue";
import { recordAudit } from "./audit";
import type { AuditAction } from "./audit-catalogue";
import {
	type AccessCasePayload,
	accessCaseKind,
} from "./change-kinds/access-case";
import {
	type CanonOrderPayload,
	canonOrderKind,
} from "./change-kinds/canon-order";
import {
	type ChapterLimitsPayload,
	chapterLimitsKind,
} from "./change-kinds/chapter-limits";
import {
	type RoleChangePayload,
	roleChangeKind,
} from "./change-kinds/role-change";
import {
	type RolePermissionPayload,
	rolePermissionKind,
} from "./change-kinds/role-permission";
import {
	type SourceRetirementPayload,
	sourceRetirementKind,
} from "./change-kinds/source-retirement";
import {
	type VerseAdditionPayload,
	verseAdditionKind,
} from "./change-kinds/verse-addition";
import {
	type VerseHandlingPayload,
	verseHandlingKind,
} from "./change-kinds/verse-handling";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { createNotification } from "./notifications";
import { changeProposals } from "./schema/change_proposals";
import { permissions } from "./schema/permissions";
import { rolePermissions } from "./schema/role_permissions";
import { userRoles } from "./schema/user_roles";

export type ChangeDecision = "confirm" | "return" | "reject";

/** Everything the two-person process needs to know about one kind of change. */
export type ChangeKindDefinition<TPayload> = {
	payload: z.ZodType<TPayload>;
	/** Who may decide. The proposer can never decide, whatever they hold. */
	decidePermission: PermissionKey;
	/** Friendly title for this kind in notifications. */
	title: string;
	target(payload: TPayload): { type: string; id: string };
	/** The in-app page where this change can be read and decided. */
	destination(payload: TPayload): string;
	describe(client: DbExecutor, payload: TPayload): Promise<string>;
	/** Refuses a change that shouldn't be proposed or applied right now. */
	assertAllowed(client: DbExecutor, payload: TPayload): Promise<void>;
	/** Refuses a decider who has a conflict of interest beyond being the proposer. */
	assertDecider?(payload: TPayload, deciderUserId: string): void;
	apply(
		client: DbExecutor,
		payload: TPayload,
		context: { deciderUserId: string; proposalId: number; reason: string },
	): Promise<void>;
	proposedAction: AuditAction;
	decidedAction(decision: ChangeDecision): AuditAction;
	/** Who else should hear about the decision, besides the proposer. */
	alsoNotifyOnDecision?(payload: TPayload): string[];
};

/** Hides each kind's payload type behind one checked parse, so kinds can share a registry. */
function changeKind<TPayload>(definition: ChangeKindDefinition<TPayload>) {
	const parse = (raw: unknown) => definition.payload.parse(raw);

	return {
		decidePermission: definition.decidePermission,
		title: definition.title,
		proposedAction: definition.proposedAction,
		decidedAction: definition.decidedAction,
		target: (raw: unknown) => definition.target(parse(raw)),
		destination: (raw: unknown) => definition.destination(parse(raw)),
		describe: (client: DbExecutor, raw: unknown) =>
			definition.describe(client, parse(raw)),
		assertAllowed: (client: DbExecutor, raw: unknown) =>
			definition.assertAllowed(client, parse(raw)),
		assertDecider: (raw: unknown, deciderUserId: string) =>
			definition.assertDecider?.(parse(raw), deciderUserId),
		apply: (
			client: DbExecutor,
			raw: unknown,
			context: { deciderUserId: string; proposalId: number; reason: string },
		) => definition.apply(client, parse(raw), context),
		alsoNotify: (raw: unknown) =>
			definition.alsoNotifyOnDecision?.(parse(raw)) ?? [],
	};
}

const changeKinds = {
	role_change: changeKind(roleChangeKind),
	access_case: changeKind(accessCaseKind),
	role_permission: changeKind(rolePermissionKind),
	chapter_limits: changeKind(chapterLimitsKind),
	canon_order: changeKind(canonOrderKind),
	verse_addition: changeKind(verseAdditionKind),
	verse_handling: changeKind(verseHandlingKind),
	source_retirement: changeKind(sourceRetirementKind),
};

export type ChangeKindName = keyof typeof changeKinds;

type ChangePayloads = {
	role_change: RoleChangePayload;
	access_case: AccessCasePayload;
	role_permission: RolePermissionPayload;
	chapter_limits: ChapterLimitsPayload;
	canon_order: CanonOrderPayload;
	verse_addition: VerseAdditionPayload;
	verse_handling: VerseHandlingPayload;
	source_retirement: SourceRetirementPayload;
};

function kindNamed(name: string) {
	if (name in changeKinds) return changeKinds[name as ChangeKindName];
	throw new Error(`Unknown change kind: ${name}`);
}

/** Everyone holding a permission through any of their roles. */
export async function holdersOf(client: DbExecutor, permission: PermissionKey) {
	const rows = await client
		.selectDistinct({ userId: userRoles.userId })
		.from(userRoles)
		.innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
		.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
		.where(eq(permissions.key, permission));

	return rows.map(({ userId }) => userId);
}

/**
 * Records a change for someone else to decide, and tells the people who can.
 * Join a caller's transaction so a failure leaves nothing behind.
 */
export async function proposeChange<TKind extends ChangeKindName>(
	client: DbExecutor,
	input: {
		kind: TKind;
		payload: ChangePayloads[TKind];
		proposerUserId: string;
		reason: string;
	},
) {
	const reason = input.reason.trim();
	if (!reason) throw new GovernanceError("Give a reason for this change.");

	const kind = changeKinds[input.kind];
	await kind.assertAllowed(client, input.payload);

	return client.transaction(async (tx) => {
		const [duplicate] = await tx
			.select({ id: changeProposals.id })
			.from(changeProposals)
			.where(
				and(
					eq(changeProposals.kind, input.kind),
					eq(changeProposals.status, "proposed"),
					sql`${changeProposals.payload} = ${JSON.stringify(input.payload)}::jsonb`,
				),
			);
		if (duplicate) {
			throw new GovernanceError(
				"This change is already waiting for a decision.",
			);
		}

		const target = kind.target(input.payload);
		const [proposal] = await tx
			.insert(changeProposals)
			.values({
				kind: input.kind,
				payload: input.payload,
				targetType: target.type,
				targetId: target.id,
				reason,
				proposerUserId: input.proposerUserId,
			})
			.returning({ id: changeProposals.id });
		if (!proposal) throw new Error("Could not save the proposal.");

		await recordAudit(tx, {
			actorUserId: input.proposerUserId,
			action: kind.proposedAction,
			targetType: target.type,
			targetId: target.id,
			details: { proposalId: proposal.id, reason },
		});

		const description = await kind.describe(tx, input.payload);
		for (const userId of await holdersOf(tx, kind.decidePermission)) {
			if (userId === input.proposerUserId) continue;
			await createNotification(tx, {
				userId,
				kind: "change_proposal",
				title: kind.title,
				body: `${description} needs your decision.`,
				destination: kind.destination(input.payload),
			});
		}

		return proposal.id;
	});
}

/**
 * Applies, returns or rejects a proposal. Confirming re-checks that the change
 * is still allowed, because things may have moved on since it was proposed.
 */
export async function decideChange(
	client: DbExecutor,
	input: {
		proposalId: number;
		deciderUserId: string;
		decision: ChangeDecision;
		note: string;
	},
) {
	const note = input.note.trim();
	if (!note) throw new GovernanceError("Add a note explaining your decision.");

	return client.transaction(async (tx) => {
		const [proposal] = await tx
			.select()
			.from(changeProposals)
			.where(eq(changeProposals.id, input.proposalId))
			.for("update");
		if (!proposal) throw new GovernanceError("This proposal no longer exists.");
		if (proposal.status !== "proposed") {
			throw new GovernanceError("This proposal has already been decided.");
		}
		if (proposal.proposerUserId === input.deciderUserId) {
			throw new GovernanceError(
				"You proposed this change, so someone else has to decide it.",
			);
		}

		const kind = kindNamed(proposal.kind);
		const deciderKeys = await getPermissionKeys(tx, input.deciderUserId);
		if (!deciderKeys.includes(kind.decidePermission)) {
			throw new GovernanceError("You don't have permission to decide this.");
		}
		kind.assertDecider(proposal.payload, input.deciderUserId);

		if (input.decision === "confirm") {
			await kind.assertAllowed(tx, proposal.payload);
			await kind.apply(tx, proposal.payload, {
				deciderUserId: input.deciderUserId,
				proposalId: proposal.id,
				reason: proposal.reason,
			});
		}

		await tx
			.update(changeProposals)
			.set({
				status:
					input.decision === "confirm"
						? "applied"
						: input.decision === "return"
							? "returned"
							: "rejected",
				decidedByUserId: input.deciderUserId,
				decisionNote: note,
				decidedAt: new Date(),
			})
			.where(eq(changeProposals.id, proposal.id));

		const target = kind.target(proposal.payload);
		await recordAudit(tx, {
			actorUserId: input.deciderUserId,
			action: kind.decidedAction(input.decision),
			targetType: target.type,
			targetId: target.id,
			details: {
				proposalId: proposal.id,
				decision: input.decision,
				note,
			},
		});

		const description = await kind.describe(tx, proposal.payload);
		const outcome =
			input.decision === "confirm"
				? "was confirmed"
				: input.decision === "return"
					? "was sent back with questions"
					: "was declined";
		const recipients = new Set([
			proposal.proposerUserId,
			...kind.alsoNotify(proposal.payload),
		]);
		recipients.delete(input.deciderUserId);
		for (const userId of recipients) {
			await createNotification(tx, {
				userId,
				kind: "change_proposal",
				title: kind.title,
				body: `${description} ${outcome}. ${note}`,
				destination: kind.destination(proposal.payload),
			});
		}
	});
}

export type ProposalSummary = Awaited<ReturnType<typeof listProposals>>[number];

/** Proposals with a readable description, newest first. */
export async function listProposals(
	client: DbExecutor,
	filter: {
		kinds?: readonly ChangeKindName[];
		status?: "proposed";
		target?: { type: string; id: string };
	} = {},
) {
	const rows = await client
		.select()
		.from(changeProposals)
		.where(
			and(
				filter.kinds
					? inArray(changeProposals.kind, [...filter.kinds])
					: undefined,
				filter.status ? eq(changeProposals.status, filter.status) : undefined,
				filter.target
					? and(
							eq(changeProposals.targetType, filter.target.type),
							eq(changeProposals.targetId, filter.target.id),
						)
					: undefined,
			),
		)
		.orderBy(desc(changeProposals.createdAt), desc(changeProposals.id));

	const summaries = [];
	for (const row of rows) {
		const kind = kindNamed(row.kind);
		summaries.push({
			...row,
			title: kind.title,
			description: await kind.describe(client, row.payload),
			destination: kind.destination(row.payload),
		});
	}
	return summaries;
}
