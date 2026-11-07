import { and, count, eq, inArray, isNull, ne } from "drizzle-orm";

import type { PermissionKey } from "./access-catalogue";
import {
	listApprovedContent,
	listAssignments,
	listReviewQueue,
} from "./content-queues";
import type { DbExecutor } from "./db-executor";
import { changeProposals } from "./schema/change_proposals";
import { communityReports } from "./schema/community_reports";
import { contentIssues } from "./schema/content_issues";
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
] as const;

/** Decided on the Canon & Versification page. */
const foundationChangeKinds = [
	"chapter_limits",
	"canon_order",
	"verse_addition",
	"verse_handling",
] as const;

/**
 * How many items are waiting in each staff queue, for the sidebar counts. Only
 * includes queues this person's permissions let them work on.
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
		const [result] = await client
			.select({ value: count() })
			.from(communityReports)
			.where(isNull(communityReports.resolution));
		counts.communityReports = result?.value ?? 0;
	}

	if (permissionKeys.includes("admins.manage")) {
		// Your own proposals aren't waiting on you, because someone else must decide them.
		const [result] = await client
			.select({ value: count() })
			.from(changeProposals)
			.where(
				and(
					eq(changeProposals.status, "proposed"),
					inArray(changeProposals.kind, [...peopleChangeKinds]),
					ne(changeProposals.proposerUserId, userId),
				),
			);
		counts.pendingConfirmations = result?.value ?? 0;
	}

	if (
		permissionKeys.includes("canon.manage") ||
		permissionKeys.includes("scripture.manage")
	) {
		const [result] = await client
			.select({ value: count() })
			.from(changeProposals)
			.where(
				and(
					eq(changeProposals.status, "proposed"),
					inArray(changeProposals.kind, [...foundationChangeKinds]),
					ne(changeProposals.proposerUserId, userId),
				),
			);
		counts.foundationChanges = result?.value ?? 0;
	}

	if (permissionKeys.includes("sources.retire")) {
		const [result] = await client
			.select({ value: count() })
			.from(changeProposals)
			.where(
				and(
					eq(changeProposals.status, "proposed"),
					eq(changeProposals.kind, "source_retirement"),
					ne(changeProposals.proposerUserId, userId),
				),
			);
		counts.sourceRetirements = result?.value ?? 0;
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
		const [result] = await client
			.select({ value: count() })
			.from(changeProposals)
			.where(
				and(
					eq(changeProposals.status, "proposed"),
					eq(changeProposals.kind, "theme_merge"),
					ne(changeProposals.proposerUserId, userId),
				),
			);
		counts.readyToPublish = (counts.readyToPublish ?? 0) + (result?.value ?? 0);
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
