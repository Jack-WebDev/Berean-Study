import { and, eq, inArray, max } from "drizzle-orm";
import { pinRevisionCitations } from "./cited-evidence";
import { contentKindNamed } from "./content-kind-registry";
import { openRevisionStatuses } from "./content-kinds";
import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { themeBodySchema } from "./interpretation-body";
import { changeProposals } from "./schema/change_proposals";
import { contentItems } from "./schema/content_items";
import { contentRevisions } from "./schema/content_revisions";
import { publicationHistory } from "./schema/publication_history";
import { themes } from "./schema/themes";

async function readPublishedTheme(client: DbExecutor, themeId: number) {
	const [theme] = await client
		.select({ status: themes.status })
		.from(themes)
		.where(eq(themes.id, themeId));
	if (!theme) throw new GovernanceError("This theme no longer exists.");
	if (theme.status === "merged") {
		throw new GovernanceError("This theme has already been merged.");
	}
	const [item] = await client
		.select()
		.from(contentItems)
		.where(
			and(
				eq(contentItems.kind, "theme"),
				eq(contentItems.scopeKey, String(themeId)),
			),
		)
		.for("update");
	if (!item?.liveRevisionId) {
		throw new GovernanceError(
			"Only published themes are merged this way. Finish or throw away a draft instead.",
		);
	}
	const [open] = await client
		.select({ number: contentRevisions.number })
		.from(contentRevisions)
		.where(
			and(
				eq(contentRevisions.contentItemId, item.id),
				inArray(contentRevisions.status, [...openRevisionStatuses]),
			),
		);
	if (open) {
		throw new GovernanceError(
			`"${item.title}" has Revision #${open.number} in progress. Finish it or throw it away before merging.`,
		);
	}
	const [live] = await client
		.select({
			body: contentRevisions.body,
			createdByUserId: contentRevisions.createdByUserId,
		})
		.from(contentRevisions)
		.where(eq(contentRevisions.id, item.liveRevisionId));
	if (!live) throw new GovernanceError("This theme no longer exists.");
	return { body: themeBodySchema.parse(live.body), item };
}

/** Both themes, once they've been checked to be fit to merge right now. */
export async function readThemeMerge(
	client: DbExecutor,
	input: { intoThemeId: number; themeId: number },
) {
	if (input.themeId === input.intoThemeId) {
		throw new GovernanceError("A theme can't be merged into itself.");
	}
	return {
		from: await readPublishedTheme(client, input.themeId),
		into: await readPublishedTheme(client, input.intoThemeId),
	};
}

export async function describeThemeMerge(
	client: DbExecutor,
	input: { intoThemeId: number; themeId: number },
) {
	const titles = await client
		.select({ scopeKey: contentItems.scopeKey, title: contentItems.title })
		.from(contentItems)
		.where(
			and(
				eq(contentItems.kind, "theme"),
				inArray(contentItems.scopeKey, [
					String(input.themeId),
					String(input.intoThemeId),
				]),
			),
		);
	const titleOf = (id: number) =>
		titles.find(({ scopeKey }) => scopeKey === String(id))?.title ?? "a theme";
	return `Merging ${titleOf(input.themeId)} into ${titleOf(input.intoThemeId)}`;
}

/**
 * Carries out a merge two Superadmins have agreed. The kept theme gains the other's
 * passages as a new published revision, and the other is taken down. It stays on
 * record, with a pointer to where its passages went.
 */
export async function mergeThemeInto(
	client: DbExecutor,
	input: { intoThemeId: number; themeId: number },
	context: { deciderUserId: string; proposalId: number; reason: string },
) {
	const { from, into } = await readThemeMerge(client, input);
	if (!into.item.liveRevisionId || !from.item.liveRevisionId) {
		throw new GovernanceError("Only published themes are merged this way.");
	}

	const [proposal] = await client
		.select({ proposerUserId: changeProposals.proposerUserId })
		.from(changeProposals)
		.where(eq(changeProposals.id, context.proposalId));
	if (!proposal) throw new Error("Could not find the merge proposal.");

	const known = new Set(into.body.passages.map(({ reference }) => reference));
	const body = {
		...into.body,
		passages: [
			...into.body.passages,
			...from.body.passages.filter(({ reference }) => !known.has(reference)),
		],
		relatedThemes: into.body.relatedThemes.filter(
			({ themeId }) => themeId !== input.themeId,
		),
	};

	const [latest] = await client
		.select({ value: max(contentRevisions.number) })
		.from(contentRevisions)
		.where(eq(contentRevisions.contentItemId, into.item.id));
	const now = new Date();
	await client
		.update(contentRevisions)
		.set({ status: "superseded", updatedAt: now })
		.where(eq(contentRevisions.id, into.item.liveRevisionId));
	const [revision] = await client
		.insert(contentRevisions)
		.values({
			approvedAt: now,
			basedOnRevisionId: into.item.liveRevisionId,
			body,
			contentItemId: into.item.id,
			createdByUserId: proposal.proposerUserId,
			number: (latest?.value ?? 0) + 1,
			publishedAt: now,
			publishedByUserId: context.deciderUserId,
			reviewerUserId: context.deciderUserId,
			status: "published",
			submittedAt: now,
		})
		.returning({ id: contentRevisions.id });
	if (!revision) throw new Error("Could not save the merged theme.");

	const kind = contentKindNamed("theme");
	await kind.afterDraftSaved(client, {
		body,
		revisionId: revision.id,
		scopeKey: into.item.scopeKey,
	});
	await pinRevisionCitations(client, revision.id);
	await client
		.update(contentItems)
		.set({ liveRevisionId: revision.id })
		.where(eq(contentItems.id, into.item.id));
	await client.insert(publicationHistory).values({
		action: "published",
		contentRevisionId: revision.id,
		performedByUserId: context.deciderUserId,
		reason: `Merged in ${from.item.title}`,
	});

	await client
		.update(contentRevisions)
		.set({ status: "withdrawn", updatedAt: now })
		.where(eq(contentRevisions.id, from.item.liveRevisionId));
	await client
		.update(contentItems)
		.set({ liveRevisionId: null })
		.where(eq(contentItems.id, from.item.id));
	await client.insert(publicationHistory).values({
		action: "withdrawn",
		contentRevisionId: from.item.liveRevisionId,
		performedByUserId: context.deciderUserId,
		reason: `Merged into ${into.item.title}`,
	});
	await client
		.update(themes)
		.set({ mergedIntoThemeId: input.intoThemeId, status: "merged" })
		.where(eq(themes.id, input.themeId));
}
