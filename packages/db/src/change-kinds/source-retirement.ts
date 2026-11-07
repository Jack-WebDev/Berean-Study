import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { DbExecutor } from "../db-executor";
import { GovernanceError } from "../governance-error";
import { contentItems } from "../schema/content_items";
import { sources } from "../schema/sources";
import type { ChangeKindDefinition } from "../two-person";

const sourceRetirementPayload = z.object({
	sourceId: z.number().int().positive(),
});

export type SourceRetirementPayload = z.infer<typeof sourceRetirementPayload>;

/** Refuses a source that's already out of use, then or by the time a change is confirmed. */
export async function assertCanBeRetired(client: DbExecutor, sourceId: number) {
	const [source] = await client
		.select({ status: sources.status })
		.from(sources)
		.where(eq(sources.id, sourceId));
	if (!source) throw new GovernanceError("This source no longer exists.");
	if (source.status === "retired") {
		throw new GovernanceError("This source has already been retired.");
	}
	if (source.status === "merged") {
		throw new GovernanceError(
			"This source was merged into another one, so there's nothing to retire.",
		);
	}
}

export async function markSourceRetired(client: DbExecutor, sourceId: number) {
	await client
		.update(sources)
		.set({ retiredAt: new Date(), status: "retired" })
		.where(eq(sources.id, sourceId));
}

export const sourceRetirementKind: ChangeKindDefinition<SourceRetirementPayload> =
	{
		payload: sourceRetirementPayload,
		decidePermission: "sources.retire",
		title: "Retiring a source",
		target: ({ sourceId }) => ({ type: "source", id: String(sourceId) }),
		destination: ({ sourceId }) =>
			`/work/sources/evidence?step=source&source=${sourceId}`,
		async describe(client, { sourceId }) {
			const [item] = await client
				.select({ title: contentItems.title })
				.from(contentItems)
				.where(
					and(
						eq(contentItems.kind, "source"),
						eq(contentItems.scopeKey, String(sourceId)),
					),
				);
			return `Retiring ${item?.title ?? "a source"}`;
		},
		assertAllowed: (client, { sourceId }) =>
			assertCanBeRetired(client, sourceId),
		apply: (client, { sourceId }) => markSourceRetired(client, sourceId),
		proposedAction: "source.retirement_proposed",
		decidedAction(decision) {
			if (decision === "confirm") return "source.retired";
			return decision === "return"
				? "source.retirement_returned"
				: "source.retirement_rejected";
		},
	};
