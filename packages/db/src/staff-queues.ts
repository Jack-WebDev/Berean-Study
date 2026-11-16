import { count, eq } from "drizzle-orm";

import type { PermissionKey } from "./access-catalogue";
import { countReportsWaitingOn } from "./community-moderation";
import {
	listApprovedContent,
	listAssignments,
	listReviewQueue,
} from "./content-queues";
import type { DbExecutor } from "./db-executor";
import { contentIssues } from "./schema/content_issues";
import { type ChangeKindName, countProposalsWaitingOn } from "./two-person";
import {
	countChaptersReadyToPublish,
	countChaptersWaitingOnPerson,
} from "./verse-proofreading";

export type StaffQueue =
	| "contentIssues"
	| "communityReports"
	| "pendingConfirmations"
	| "scriptureEntry"
	| "readyToPublish"
	| "foundationChanges"
	| "awaitingReview"
	| "myAssignments"
	| "sourceRetirements";

/** Decided on the Users and Roles pages. */
export const peopleChangeKinds = [
	"role_change",
	"access_case",
	"role_permission",
] as const satisfies readonly ChangeKindName[];

/** Decided on the Canon & Versification page. */
export const foundationChangeKinds = [
	"chapter_limits",
	"canon_order",
	"verse_addition",
	"verse_handling",
] as const satisfies readonly ChangeKindName[];

/**
 * How many items are waiting in each staff queue, for the sidebar counts. Only
 * includes queues this person's permissions let them work on. Changes waiting
 * on a second Superadmin count only kinds this person may decide, and never
 * their own proposals, because someone else must decide those.
 */
export async function getStaffQueueCounts(
	client: DbExecutor,
	viewer: { permissionKeys: readonly PermissionKey[]; userId: string },
) {
	const { permissionKeys, userId } = viewer;
	const counts: Partial<Record<StaffQueue, number>> = {};

	if (permissionKeys.includes("issues.manage")) {
		const [result] = await client
			.select({ value: count() })
			.from(contentIssues)
			.where(eq(contentIssues.status, "open"));
		counts.contentIssues = result?.value ?? 0;
	}

	if (permissionKeys.includes("community.moderate")) {
		counts.communityReports = await countReportsWaitingOn(client, userId);
	}

	if (permissionKeys.includes("admins.manage")) {
		counts.pendingConfirmations = await countProposalsWaitingOn(
			client,
			viewer,
			peopleChangeKinds,
		);
	}

	if (
		permissionKeys.includes("canon.manage") ||
		permissionKeys.includes("scripture.manage")
	) {
		counts.foundationChanges = await countProposalsWaitingOn(
			client,
			viewer,
			foundationChangeKinds,
		);
	}

	if (permissionKeys.includes("sources.retire")) {
		counts.sourceRetirements = await countProposalsWaitingOn(client, viewer, [
			"source_retirement",
		]);
	}

	const canProofread = permissionKeys.includes("scripture.proofread");
	if (canProofread || permissionKeys.includes("scripture.enter")) {
		counts.scriptureEntry = await countChaptersWaitingOnPerson(client, {
			canProofread,
			userId,
		});
	}

	if (permissionKeys.includes("publication.publish")) {
		counts.readyToPublish =
			(await countChaptersReadyToPublish(client)) +
			(await listApprovedContent(client)).length;
	}

	if (permissionKeys.includes("content.confirm_foundational")) {
		// An approved revision waiting on a second Superadmin is already counted above.
		counts.readyToPublish =
			(counts.readyToPublish ?? 0) +
			(await countProposalsWaitingOn(client, viewer, ["theme_merge"]));
	}

	if (
		permissionKeys.includes("editorial.review") ||
		permissionKeys.includes("editorial.assign")
	) {
		counts.awaitingReview = (await listReviewQueue(client, userId)).length;
	}

	if (
		permissionKeys.includes("editorial.review") ||
		permissionKeys.includes("content.write")
	) {
		counts.myAssignments = (await listAssignments(client, userId)).length;
	}

	return counts;
}
