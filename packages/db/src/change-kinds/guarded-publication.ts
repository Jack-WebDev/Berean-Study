import { eq } from "drizzle-orm";
import { z } from "zod";

import {
	assertPublicationConfirmable,
	publishConfirmedRevision,
} from "../content-workflow";
import { contentItems } from "../schema/content_items";
import type { ChangeKindDefinition } from "../two-person";

const guardedPublicationPayload = z.object({
	contentItemId: z.number().int().positive(),
	revisionId: z.number().int().positive(),
});

export type GuardedPublicationPayload = z.infer<
	typeof guardedPublicationPayload
>;

/**
 * Publishing a revision that changes something foundational, such as a stance. The
 * revision has been through review already, and the second Superadmin's confirmation
 * is what publishes it.
 */
export const guardedPublicationKind: ChangeKindDefinition<GuardedPublicationPayload> =
	{
		payload: guardedPublicationPayload,
		decidePermission: "content.confirm_foundational",
		title: "Publishing a foundational change",
		target: ({ revisionId }) => ({
			id: String(revisionId),
			type: "content_revision",
		}),
		destination: ({ contentItemId, revisionId }) =>
			`/admin/editorial/${contentItemId}/revisions/${revisionId}`,
		async describe(client, { contentItemId }) {
			const [item] = await client
				.select({ title: contentItems.title })
				.from(contentItems)
				.where(eq(contentItems.id, contentItemId));
			return `Publishing a foundational change to ${item?.title ?? "some content"}`;
		},
		async assertAllowed(client, { revisionId }) {
			await assertPublicationConfirmable(client, revisionId);
		},
		apply: (client, { revisionId }, { deciderUserId }) =>
			publishConfirmedRevision(client, {
				actorUserId: deciderUserId,
				revisionId,
			}),
		proposedAction: "content.confirmation_proposed",
		decidedAction(decision) {
			if (decision === "confirm") return "content.confirmed";
			return decision === "return"
				? "content.confirmation_returned"
				: "content.confirmation_rejected";
		},
	};
