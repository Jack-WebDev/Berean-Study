import { desc, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { type db, pool } from "../src";
import { roleCatalogue } from "../src/access-catalogue";
import { deleteAccount } from "../src/account-deletion";
import { getAdminOverview } from "../src/admin-overview";
import {
	listCommunityFeed,
	listCommunityPublishingResources,
	listSavedCommunityPosts,
	publishCommunityPost,
	setCommunityPostBookmark,
} from "../src/community";
import {
	countReportsWaitingOn,
	decideReport,
	getPostingRestrictionEnd,
	getReportedPost,
	liftPostingRestriction,
	listOpenReports,
	listRemovedPosts,
	reportCommunityPost,
	restoreCommunityPost,
} from "../src/community-moderation";
import type { DbExecutor } from "../src/db-executor";
import { listSavedItems } from "../src/saved-items";
import { auditLog } from "../src/schema/audit_log";
import { communityPosts } from "../src/schema/community_posts";
import { communityReports } from "../src/schema/community_reports";
import { notes } from "../src/schema/notes";
import { notifications } from "../src/schema/notifications";
import { getStaffQueueCounts } from "../src/staff-queues";
import {
	createPerson,
	inRolledBackTransaction,
	withFreshCatalogue,
} from "./governance-helpers";

const describeWithDatabase = process.env.DATABASE_URL
	? describe
	: describe.skip;

async function createPost(
	tx: DbExecutor,
	authorUserId: string,
	title = "A post",
) {
	const [post] = await tx
		.insert(communityPosts)
		.values({
			authorUserId,
			postType: "note",
			snapshot: { excerpt: "What the author shared.", title },
		})
		.returning({ id: communityPosts.id });
	if (!post) throw new Error("Unable to create a post.");
	return post.id;
}

async function actionsOn(tx: DbExecutor, targetId: string | number) {
	const rows = await tx
		.select({ action: auditLog.action })
		.from(auditLog)
		.where(eq(auditLog.targetId, String(targetId)))
		.orderBy(desc(auditLog.id));
	return rows.map(({ action }) => action);
}

/** The people every scenario needs: an author, a reporter and an Admin to decide. */
async function cast(tx: DbExecutor) {
	await withFreshCatalogue(tx);
	const author = await createPerson(tx);
	const reporter = await createPerson(tx);
	const moderator = await createPerson(tx, "Admin");
	const postId = await createPost(tx, author.id);
	return { author, moderator, postId, reporter };
}

async function report(tx: DbExecutor, postId: number, reporterUserId: string) {
	return reportCommunityPost(tx, {
		postId,
		reason: "personal_attack",
		reporterUserId,
	});
}

afterAll(async () => {
	await pool.end();
});

describeWithDatabase("Community moderation", () => {
	describe("reporting a post", () => {
		it("puts one row in the queue however many people report it", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, postId, reporter } = await cast(tx);
				const second = await createPerson(tx);

				expect(await report(tx, postId, reporter.id)).toBe("reported");
				expect(await report(tx, postId, second.id)).toBe("reported");

				const queue = await listOpenReports(tx);
				const row = queue.find((item) => item.postId === postId);
				expect(row?.reporters).toBe(2);
				expect(row?.title).toBe("A post");
				expect(author.id).toBeTruthy();
			});
		});

		it("lets a person report a post only once, even after it was dismissed", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				expect(await report(tx, postId, reporter.id)).toBe("already_reported");

				await decideReport(tx, {
					decision: "dismissed",
					moderatorUserId: moderator.id,
					postId,
				});
				expect(await report(tx, postId, reporter.id)).toBe("already_reported");
			});
		});

		it("refuses your own post, a missing post and an unexplained 'something else'", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, postId, reporter } = await cast(tx);
				expect(await report(tx, postId, author.id)).toBe("own_post");
				expect(await report(tx, 2_000_000_000, reporter.id)).toBe(
					"unavailable",
				);
				expect(
					await reportCommunityPost(tx, {
						details: "  ",
						postId,
						reason: "other",
						reporterUserId: reporter.id,
					}),
				).toBe("needs_details");
			});
		});

		it("changes nothing for readers until a moderator decides", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				const [post] = await tx
					.select({ removedAt: communityPosts.removedAt })
					.from(communityPosts)
					.where(eq(communityPosts.id, postId));
				expect(post?.removedAt).toBeNull();
			});
		});
	});

	describe("deciding a report", () => {
		it("removes the post, closes every report, tells the author the rule and audits it", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await report(tx, postId, (await createPerson(tx)).id);

				await decideReport(tx, {
					decision: "removed",
					moderatorUserId: moderator.id,
					postId,
					ruleKey: "encourage-one-another",
				});

				const reports = await tx
					.select({ resolution: communityReports.resolution })
					.from(communityReports)
					.where(eq(communityReports.communityPostId, postId));
				expect(reports.map(({ resolution }) => resolution)).toEqual([
					"removed",
					"removed",
				]);
				const queue = await listOpenReports(tx);
				expect(queue.some((item) => item.postId === postId)).toBe(false);

				const [notice] = await tx
					.select()
					.from(notifications)
					.where(eq(notifications.userId, author.id));
				expect(notice?.body).toContain("Encourage one another");
				expect(notice?.destination).toBe(
					"/community/guidelines#encourage-one-another",
				);
				expect(await actionsOn(tx, postId)).toEqual(["community_post.removed"]);
			});
		});

		it("keeps a removed post out of the feed and off the reader's saved list", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, postId, reporter } = await cast(tx);
				await setCommunityPostBookmark(
					tx as typeof db,
					reporter.id,
					postId,
					true,
				);
				await report(tx, postId, reporter.id);
				await decideReport(tx, {
					decision: "removed",
					moderatorUserId: moderator.id,
					postId,
					ruleKey: "contribute-thoughtfully",
				});
				const feed = await listCommunityFeed(tx as typeof db, reporter.id, {
					page: 1,
					pageSize: 50,
					view: "recent",
				});
				expect(feed.posts.some(({ id }) => id === postId)).toBe(false);
				expect(
					await listSavedCommunityPosts(tx as typeof db, reporter.id),
				).toEqual([]);
				expect(
					(await listSavedItems(tx as typeof db, reporter.id)).bookmarks,
				).toEqual([]);
			});
		});

		it("records a warning against the author as well as the removal", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await decideReport(tx, {
					decision: "removed_and_warned",
					moderatorUserId: moderator.id,
					postId,
					ruleKey: "respect-privacy",
				});
				expect(await actionsOn(tx, author.id)).toEqual(["user.warned"]);
				expect(await getPostingRestrictionEnd(tx, author.id)).toBeNull();
			});
		});

		it("dismissing leaves the post up, and tells the author nothing", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await decideReport(tx, {
					decision: "dismissed",
					moderatorUserId: moderator.id,
					postId,
				});
				const [post] = await tx
					.select({ removedAt: communityPosts.removedAt })
					.from(communityPosts)
					.where(eq(communityPosts.id, postId));
				expect(post?.removedAt).toBeNull();
				expect(
					await tx
						.select()
						.from(notifications)
						.where(eq(notifications.userId, author.id)),
				).toEqual([]);
				expect(await actionsOn(tx, postId)).toEqual([
					"community_report.dismissed",
				]);
			});
		});

		it("refuses a removal with no rule, because the author must be told one", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await expect(
					decideReport(tx, {
						decision: "removed",
						moderatorUserId: moderator.id,
						postId,
					}),
				).rejects.toThrow("Choose which rule");
			});
		});

		it("doesn't let moderators decide their own post or a report they filed", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, reporter } = await cast(tx);
				const ownPost = await createPost(tx, moderator.id);
				await report(tx, ownPost, reporter.id);
				await expect(
					decideReport(tx, {
						decision: "dismissed",
						moderatorUserId: moderator.id,
						postId: ownPost,
					}),
				).rejects.toThrow("your own post");

				const author = await createPerson(tx);
				const reported = await createPost(tx, author.id);
				await report(tx, reported, moderator.id);
				await expect(
					decideReport(tx, {
						decision: "removed",
						moderatorUserId: moderator.id,
						postId: reported,
						ruleKey: "respect-privacy",
					}),
				).rejects.toThrow("You reported this post");

				expect(await countReportsWaitingOn(tx, moderator.id)).toBe(
					(await listOpenReports(tx)).length - 2,
				);
			});
		});

		it("refuses to decide a report twice", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await decideReport(tx, {
					decision: "dismissed",
					moderatorUserId: moderator.id,
					postId,
				});
				await expect(
					decideReport(tx, {
						decision: "removed",
						moderatorUserId: moderator.id,
						postId,
						ruleKey: "respect-privacy",
					}),
				).rejects.toThrow("already been decided");
			});
		});
	});

	describe("restricting posting", () => {
		async function restricted(tx: DbExecutor) {
			const people = await cast(tx);
			await report(tx, people.postId, people.reporter.id);
			await decideReport(tx, {
				decision: "restricted",
				moderatorUserId: people.moderator.id,
				note: "Repeated after a warning.",
				postId: people.postId,
				ruleKey: "encourage-one-another",
			});
			return people;
		}

		it("needs a reason", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await expect(
					decideReport(tx, {
						decision: "restricted",
						moderatorUserId: moderator.id,
						postId,
						ruleKey: "encourage-one-another",
					}),
				).rejects.toThrow("Give a reason");
			});
		});

		it("removes the post and blocks new posts for seven days", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, postId } = await restricted(tx);
				const until = await getPostingRestrictionEnd(tx, author.id);
				const days = ((until?.getTime() ?? 0) - Date.now()) / 86_400_000;
				expect(days).toBeGreaterThan(6.9);
				expect(days).toBeLessThanOrEqual(7);
				expect(await actionsOn(tx, postId)).toEqual(["community_post.removed"]);
				expect(await actionsOn(tx, author.id)).toEqual(["user.restricted"]);

				const [note] = await tx
					.insert(notes)
					.values({
						content: "A private note.",
						title: "Private",
						userId: author.id,
					})
					.returning({ id: notes.id });
				const result = await publishCommunityPost(tx as typeof db, author.id, {
					sourceId: note?.id ?? 0,
					type: "note",
				});
				expect(result).toEqual({
					refused: "restricted",
					restrictedUntil: until,
				});
			});
		});

		it("still lets a restricted person report", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, reporter } = await restricted(tx);
				const other = await createPost(tx, reporter.id);
				expect(await report(tx, other, author.id)).toBe("reported");
			});
		});

		it("can be lifted with a reason, and says so to the person", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, moderator } = await restricted(tx);
				await expect(
					liftPostingRestriction(tx, {
						moderatorUserId: moderator.id,
						reason: "  ",
						targetUserId: author.id,
					}),
				).rejects.toThrow("Give a reason");

				await liftPostingRestriction(tx, {
					moderatorUserId: moderator.id,
					reason: "Reviewed on appeal.",
					targetUserId: author.id,
				});
				expect(await getPostingRestrictionEnd(tx, author.id)).toBeNull();
				expect(await actionsOn(tx, author.id)).toEqual([
					"user.restriction_lifted",
					"user.restricted",
				]);
				await expect(
					liftPostingRestriction(tx, {
						moderatorUserId: moderator.id,
						reason: "Again.",
						targetUserId: author.id,
					}),
				).rejects.toThrow("isn't restricted");
			});
		});
	});

	describe("restoring a post", () => {
		it("brings the post back and stops it counting against the author", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await decideReport(tx, {
					decision: "removed",
					moderatorUserId: moderator.id,
					postId,
					ruleKey: "encourage-one-another",
				});
				const removed = await listRemovedPosts(tx, { page: 1 });
				expect(removed.posts.some((post) => post.postId === postId)).toBe(true);

				await restoreCommunityPost(tx, {
					moderatorUserId: moderator.id,
					note: "Removed by mistake.",
					postId,
				});
				const [post] = await tx
					.select({ removedAt: communityPosts.removedAt })
					.from(communityPosts)
					.where(eq(communityPosts.id, postId));
				expect(post?.removedAt).toBeNull();
				expect(await actionsOn(tx, postId)).toEqual([
					"community_post.restored",
					"community_post.removed",
				]);

				const later = await createPost(tx, author.id, "A later post");
				await report(tx, later, reporter.id);
				const detail = await getReportedPost(tx, {
					postId: later,
					viewerUserId: moderator.id,
				});
				expect(detail?.author.earlierRemovals).toEqual([]);
			});
		});

		it("refuses a post that isn't removed, and needs a reason", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, postId } = await cast(tx);
				await expect(
					restoreCommunityPost(tx, {
						moderatorUserId: moderator.id,
						note: "Back.",
						postId,
					}),
				).rejects.toThrow("isn't removed");
				await expect(
					restoreCommunityPost(tx, {
						moderatorUserId: moderator.id,
						note: " ",
						postId,
					}),
				).rejects.toThrow("Give a reason");
			});
		});

		it("won't let a removed item be shared a second time", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, reporter } = await cast(tx);
				const author = await createPerson(tx);
				const [note] = await tx
					.insert(notes)
					.values({
						content: "A private note.",
						title: "Shared",
						userId: author.id,
					})
					.returning({ id: notes.id });
				const noteId = note?.id ?? 0;
				const published = await publishCommunityPost(
					tx as typeof db,
					author.id,
					{ sourceId: noteId, type: "note" },
				);
				if (!published || "refused" in published) {
					throw new Error("Expected a Community post.");
				}
				await report(tx, published.id, reporter.id);
				await decideReport(tx, {
					decision: "removed",
					moderatorUserId: moderator.id,
					postId: published.id,
					ruleKey: "contribute-thoughtfully",
				});

				expect(
					await publishCommunityPost(tx as typeof db, author.id, {
						sourceId: noteId,
						type: "note",
					}),
				).toEqual({ refused: "removed" });
				const resources = await listCommunityPublishingResources(
					tx as typeof db,
					author.id,
				);
				expect(resources.find(({ id }) => id === noteId)).toMatchObject({
					isPublished: false,
					isRemoved: true,
				});
			});
		});
	});

	describe("what a moderator sees", () => {
		it("shows the published words only, never the private note behind them", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { moderator, reporter } = await cast(tx);
				const author = await createPerson(tx);
				const [note] = await tx
					.insert(notes)
					.values({
						content: "A SECRET LINE the author kept private.",
						title: "A private title",
						userId: author.id,
					})
					.returning({ id: notes.id });
				const published = await publishCommunityPost(
					tx as typeof db,
					author.id,
					{
						snapshot: { excerpt: "Only this was shared.", title: "Shared" },
						sourceId: note?.id ?? 0,
						type: "note",
					},
				);
				if (!published || "refused" in published) {
					throw new Error("Expected a Community post.");
				}
				await report(tx, published.id, reporter.id);

				const detail = await getReportedPost(tx, {
					postId: published.id,
					viewerUserId: moderator.id,
				});
				expect(detail?.post.excerpt).toBe("Only this was shared.");
				const everything = JSON.stringify([detail, await listOpenReports(tx)]);
				expect(everything).not.toContain("SECRET");
				expect(everything).not.toContain("private title");
				expect(everything).not.toContain(author.email);
			});
		});

		it("gives the author's standing, and says who can't decide", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, moderator, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await decideReport(tx, {
					decision: "removed",
					moderatorUserId: moderator.id,
					postId,
					ruleKey: "encourage-one-another",
				});
				const later = await createPost(tx, author.id, "Second post");
				await report(tx, later, reporter.id);

				const detail = await getReportedPost(tx, {
					postId: later,
					viewerUserId: moderator.id,
				});
				expect(detail?.author.earlierRemovals).toMatchObject([
					{ rule: "Encourage one another", title: "A post" },
				]);
				expect(detail?.suggestedRule).toBe("encourage-one-another");
				expect(detail?.conflict).toBeNull();

				const asReporter = await getReportedPost(tx, {
					postId: later,
					viewerUserId: reporter.id,
				});
				expect(asReporter?.conflict).toBe("reporter");
				const asAuthor = await getReportedPost(tx, {
					postId: later,
					viewerUserId: author.id,
				});
				expect(asAuthor?.conflict).toBe("author");
			});
		});

		it("drops a report from the queue when its author deletes their account", async () => {
			await inRolledBackTransaction(async (tx) => {
				const { author, postId, reporter } = await cast(tx);
				await report(tx, postId, reporter.id);
				await deleteAccount(tx, author.id);

				expect(
					(await listOpenReports(tx)).some((item) => item.postId === postId),
				).toBe(false);
				const removed = await listRemovedPosts(tx, { page: 1 });
				expect(removed.posts.some((post) => post.postId === postId)).toBe(
					false,
				);
				const staff = await createPerson(tx, "Admin");
				await expect(
					restoreCommunityPost(tx, {
						moderatorUserId: staff.id,
						note: "Back.",
						postId,
					}),
				).rejects.toThrow("can't be restored");
			});
		});
	});
});

describeWithDatabase("Administration overview", () => {
	const keysOf = (name: string) => {
		const role = roleCatalogue.find((candidate) => candidate.name === name);
		if (!role) throw new Error(`No role named ${name}`);
		return role.grants;
	};
	const tileKeys = (overview: Awaited<ReturnType<typeof getAdminOverview>>) =>
		overview.tiles.map(({ key }) => key);

	it("gives a Superadmin every tile", async () => {
		await inRolledBackTransaction(async (tx) => {
			await withFreshCatalogue(tx);
			const person = await createPerson(tx, "Superadmin");
			const overview = await getAdminOverview(tx, {
				permissionKeys: keysOf("Superadmin"),
				userId: person.id,
			});
			expect(tileKeys(overview)).toEqual([
				"awaiting-review",
				"ready-to-publish",
				"open-issues",
				"open-reports",
				"active-contributors",
				"recent-publications",
				"new-members",
				"scripture-changes",
				"authorization-changes",
			]);
			expect(overview.pipeline?.map(({ label }) => label)).toEqual([
				"Research",
				"Verification",
				"Writing",
				"Review",
				"Ready",
				"Published",
			]);
		});
	});

	it("keeps an Admin out of Scripture and authorization governance", async () => {
		await inRolledBackTransaction(async (tx) => {
			await withFreshCatalogue(tx);
			const person = await createPerson(tx, "Admin");
			const overview = await getAdminOverview(tx, {
				permissionKeys: keysOf("Admin"),
				userId: person.id,
			});
			expect(tileKeys(overview)).not.toContain("scripture-changes");
			expect(tileKeys(overview)).not.toContain("authorization-changes");
			expect(overview.foundations).toBeNull();
			expect(overview.canOpenAudit).toBe(true);
		});
	});

	it("shows someone who only moderates just the reports", async () => {
		await inRolledBackTransaction(async (tx) => {
			await withFreshCatalogue(tx);
			const person = await createPerson(tx);
			const overview = await getAdminOverview(tx, {
				permissionKeys: ["community.moderate"],
				userId: person.id,
			});
			expect(tileKeys(overview)).toEqual(["open-reports"]);
			expect(overview.pipeline).toBeNull();
			expect(overview.activity).toBeNull();
			expect(overview.canOpenAudit).toBe(false);
			expect(overview.canOpenEditorial).toBe(false);
		});
	});

	it("counts reports the same way in the tile and calls attention to them", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { author, moderator, postId, reporter } = await cast(tx);
			await report(tx, postId, reporter.id);
			const overview = await getAdminOverview(tx, {
				permissionKeys: keysOf("Admin"),
				userId: moderator.id,
			});
			const open = await listOpenReports(tx);
			expect(
				overview.tiles.find(({ key }) => key === "open-reports")?.value,
			).toBe(open.length);
			expect(
				overview.attention.find(({ key }) => key === "reports")?.severity,
			).toBe("community");
			const counts = await getStaffQueueCounts(tx, {
				permissionKeys: keysOf("Admin"),
				userId: moderator.id,
			});
			expect(counts.communityReports).toBe(open.length);
			expect(author.id).toBeTruthy();
		});
	});

	it("limits recent activity to what this person's audit access allows", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { moderator, postId, reporter } = await cast(tx);
			await report(tx, postId, reporter.id);
			const other = await createPerson(tx, "Admin");
			await decideReport(tx, {
				decision: "dismissed",
				moderatorUserId: moderator.id,
				postId,
			});

			const asOtherAdmin = await getAdminOverview(tx, {
				permissionKeys: keysOf("Admin"),
				userId: other.id,
			});
			expect(asOtherAdmin.activity?.map(({ domain }) => domain)).not.toContain(
				"community",
			);
			const asModerator = await getAdminOverview(tx, {
				permissionKeys: keysOf("Admin"),
				userId: moderator.id,
			});
			expect(asModerator.activity?.[0]?.domain).toBe("community");
		});
	});

	it("lists what needs attention most urgent first", async () => {
		await inRolledBackTransaction(async (tx) => {
			const { moderator, postId, reporter } = await cast(tx);
			await report(tx, postId, reporter.id);
			const overview = await getAdminOverview(tx, {
				permissionKeys: keysOf("Superadmin"),
				userId: moderator.id,
			});
			const order = [
				"high",
				"community",
				"ready",
				"authorization",
				"scripture",
			];
			const ranks = overview.attention.map(({ severity }) =>
				order.indexOf(severity),
			);
			expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
		});
	});

	it("reports nothing about infrastructure or private libraries", async () => {
		await inRolledBackTransaction(async (tx) => {
			await withFreshCatalogue(tx);
			const person = await createPerson(tx, "Superadmin");
			const overview = await getAdminOverview(tx, {
				permissionKeys: keysOf("Superadmin"),
				userId: person.id,
			});
			const labels = overview.tiles.map(({ label }) => label).join(" ");
			expect(labels).not.toMatch(/uptime|cpu|database|server|prayer|note/i);
		});
	});
});
