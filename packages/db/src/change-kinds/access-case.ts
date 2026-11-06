import { eq } from "drizzle-orm";
import { z } from "zod";

import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import { assertActiveAccount } from "../role-rules";
import { user } from "../schema/auth";
import type { ChangeDecision, ChangeKindDefinition } from "../two-person";

const accessCasePayload = z.object({
	targetUserId: z.string().min(1),
	ground: z.enum(["legal", "safety", "abuse"]),
	scope: z
		.array(z.enum(["notes", "prayer_journal", "collections", "saved"]))
		.min(1),
	expiresInDays: z.number().int().min(1).max(90),
});

export type AccessCasePayload = z.infer<typeof accessCasePayload>;

/**
 * A recorded decision that exceptional access to private content is justified.
 *
 * Approving one opens nothing in the app, because no administration screen shows
 * private content. Any access is handled by hand, and this is its permanent record.
 */
export const accessCaseKind: ChangeKindDefinition<AccessCasePayload> = {
	payload: accessCasePayload,
	decidePermission: "admins.manage",
	title: "Exceptional access case",
	target: ({ targetUserId }) => ({ type: "user", id: targetUserId }),
	destination: ({ targetUserId }) => `/admin/users/${targetUserId}`,
	async describe(client: DbExecutor, { targetUserId }) {
		const [person] = await client
			.select({ name: user.name })
			.from(user)
			.where(eq(user.id, targetUserId));
		return `An access case about ${person?.name ?? "someone"}`;
	},
	assertAllowed: (client, { targetUserId }) =>
		assertActiveAccount(client, targetUserId),
	assertDecider({ targetUserId }, deciderUserId) {
		if (targetUserId === deciderUserId) {
			throw new GovernanceError(
				"This case is about you, so someone else has to decide it.",
			);
		}
	},
	// Nothing changes in the app when a case is approved. The decision is the record.
	apply: async () => {},
	proposedAction: "access_case.opened",
	decidedAction: (decision: ChangeDecision) =>
		decision === "confirm" ? "access_case.approved" : "access_case.declined",
};
