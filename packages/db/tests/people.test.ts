import { randomUUID } from "node:crypto";
import { eq, getTableName, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import { deleteAccount, erasedOnRetirement } from "../src/account-deletion";
import { recordAudit } from "../src/audit";
import { editorialAuditDomains } from "../src/audit-catalogue";
import { exportAuditEntries, listAuditEntries } from "../src/audit-log";
import type { DbExecutor } from "../src/db-executor";
import {
	getPersonProfile,
	isAccountSuspended,
	liftSuspension,
	listPeople,
	suspendAccount,
} from "../src/people";
import {
	createRole,
	getRoleMatrix,
	saveRolePermissions,
} from "../src/role-admin";
import { auditLog } from "../src/schema/audit_log";
import { session, user } from "../src/schema/auth";
import { communityPosts } from "../src/schema/community_posts";
import { communityReports } from "../src/schema/community_reports";
import { notes } from "../src/schema/notes";
import { userRoles } from "../src/schema/user_roles";
import { decideChange, listProposals } from "../src/two-person";
import {
	createPerson,
	inRolledBackTransaction,
	roleIdNamed,
	withFreshCatalogue,
} from "./governance-helpers";

async function addSession(tx: DbExecutor, userId: string) {
	await tx.insert(session).values({
		id: randomUUID(),
		token: randomUUID(),
		userId,
		expiresAt: new Date(Date.now() + 86_400_000),
		updatedAt: new Date(),
	});
}

async function addNote(tx: DbExecutor, userId: string, content: string) {
	const [note] = await tx
		.insert(notes)
		.values({ userId, content, title: "Private thoughts" })
		.returning({ id: notes.id });
	if (!note) throw new Error("No note");
	return note.id;
}

async function addPost(tx: DbExecutor, authorUserId: string) {
	const [post] = await tx
		.insert(communityPosts)
		.values({
			authorUserId,
			postType: "note",
			snapshot: { body: "A shared thought" },
		})
		.returning({ id: communityPosts.id });
	if (!post) throw new Error("No post");
	return post.id;
}

describe.runIf(process.env.DATABASE_URL)("people", () => {
	afterAll(async () => {
		await pool.end();
	});

	describe("profile", () => {
		it("never includes private content", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const member = await createPerson(tx);
				await addNote(tx, member.id, "SECRET-PRIVATE-THOUGHT");

				const profile = await getPersonProfile(tx, member.id);

				expect(profile?.person.id).toBe(member.id);
				const serialized = JSON.stringify(profile);
				expect(serialized).not.toContain("SECRET-PRIVATE-THOUGHT");
				expect(serialized).not.toContain("Private thoughts");
			});
		});

		it("counts community activity", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const member = await createPerson(tx);
				const reporter = await createPerson(tx);
				const postId = await addPost(tx, member.id);
				await tx.insert(communityReports).values({
					communityPostId: postId,
					reportedByUserId: reporter.id,
					reason: "spam",
				});

				const profile = await getPersonProfile(tx, member.id);

				expect(profile?.stats).toMatchObject({
					posts: 1,
					reportsAgainst: 1,
					reportsFiled: 0,
					removals: 0,
				});
			});
		});
	});

	describe("list", () => {
		it("finds people by name or email, and can show staff only", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const member = await createPerson(tx);
				const staff = await createPerson(tx, "Contributor");
				const marker = randomUUID();
				await tx
					.update(user)
					.set({ name: `Marker ${marker}` })
					.where(eq(user.id, member.id));
				await tx
					.update(user)
					.set({ name: `Marker ${marker}` })
					.where(eq(user.id, staff.id));

				const everyone = await listPeople(tx, { page: 1, query: marker });
				const staffOnly = await listPeople(tx, {
					page: 1,
					query: marker,
					staffOnly: true,
				});

				expect(everyone.total).toBe(2);
				expect(staffOnly.people.map(({ id }) => id)).toEqual([staff.id]);
				expect(staffOnly.people[0]?.roles).toEqual(["Member", "Contributor"]);
			});
		});
	});

	describe("suspension", () => {
		it("signs the person out, shows in their status, and can be lifted", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx);
				await addSession(tx, member.id);

				await suspendAccount(tx, {
					actorUserId: superadmin.id,
					targetUserId: member.id,
					reason: "Abusive messages",
					days: 14,
				});

				expect(await isAccountSuspended(tx, member.id)).toBe(true);
				expect(
					await tx.select().from(session).where(eq(session.userId, member.id)),
				).toEqual([]);
				expect((await getPersonProfile(tx, member.id))?.person.status).toBe(
					"suspended",
				);

				await liftSuspension(tx, {
					actorUserId: superadmin.id,
					targetUserId: member.id,
					reason: "Appeal upheld",
				});
				expect(await isAccountSuspended(tx, member.id)).toBe(false);
			});
		});

		it("ends by itself when its time is up", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx);
				await suspendAccount(tx, {
					actorUserId: superadmin.id,
					targetUserId: member.id,
					reason: "Cooling off",
					days: 1,
				});

				await tx.execute(
					sql`update account_suspensions
						set started_at = now() - interval '3 days', ends_at = now() - interval '1 day'
						where user_id = ${member.id}`,
				);

				expect(await isAccountSuspended(tx, member.id)).toBe(false);
			});
		});

		it("can't be used on a Superadmin, or on yourself", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const first = await createPerson(tx, "Superadmin");
				const second = await createPerson(tx, "Superadmin");
				const suspend = (targetUserId: string) =>
					suspendAccount(tx, {
						actorUserId: first.id,
						targetUserId,
						reason: "Disagreement",
						days: null,
					});

				await expect(suspend(second.id)).rejects.toThrow("manages admins");
				await expect(suspend(first.id)).rejects.toThrow("your own account");
			});
		});

		it("needs a reason", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx);

				await expect(
					suspendAccount(tx, {
						actorUserId: superadmin.id,
						targetUserId: member.id,
						reason: " ",
						days: null,
					}),
				).rejects.toThrow("Give a reason");
			});
		});
	});

	describe("roles and permissions", () => {
		it("records each change with its reason", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				const roleId = await roleIdNamed(tx, "Greek Reviewer");

				await saveRolePermissions(tx, {
					actorUserId: superadmin.id,
					reason: "They now write language notes",
					changes: [
						{ roleId, permission: "content.original_language", granted: true },
						{ roleId, permission: "editorial.review", granted: false },
					],
				});

				const matrix = await getRoleMatrix(tx);
				const grants = matrix.roles.find(({ id }) => id === roleId)?.grants;
				expect(grants).toContain("content.original_language");
				expect(grants).not.toContain("editorial.review");

				const entries = await tx
					.select({ action: auditLog.action, details: auditLog.details })
					.from(auditLog)
					.where(eq(auditLog.actorUserId, superadmin.id));
				expect(entries).toEqual(
					expect.arrayContaining([
						{
							action: "role_permission.added",
							details: {
								role: "Greek Reviewer",
								permission: "content.original_language",
								reason: "They now write language notes",
							},
						},
						expect.objectContaining({ action: "role_permission.removed" }),
					]),
				);
			});
		});

		it("holds an Admin-level permission until a second Superadmin confirms it", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const proposer = await createPerson(tx, "Superadmin");
				const confirmer = await createPerson(tx, "Superadmin");
				const roleId = await roleIdNamed(tx, "Contributor");
				const grantsOfContributor = async () =>
					(await getRoleMatrix(tx)).roles.find(({ id }) => id === roleId)
						?.grants;

				const result = await saveRolePermissions(tx, {
					actorUserId: proposer.id,
					reason: "Contributors should publish",
					changes: [
						{ roleId, permission: "publication.publish", granted: true },
						{ roleId, permission: "research.manage", granted: false },
					],
				});

				expect(result).toEqual({ applied: 1, proposed: 1 });
				expect(await grantsOfContributor()).not.toContain(
					"publication.publish",
				);
				expect(await grantsOfContributor()).not.toContain("research.manage");

				const [proposal] = await listProposals(tx, {
					status: "proposed",
					target: { type: "role", id: String(roleId) },
				});
				if (!proposal) throw new Error("No proposal");
				expect(proposal.destination).toBe("/admin/roles");

				await expect(
					decideChange(tx, {
						proposalId: proposal.id,
						deciderUserId: proposer.id,
						decision: "confirm",
						note: "Looks fine",
					}),
				).rejects.toThrow("You proposed this change");

				await decideChange(tx, {
					proposalId: proposal.id,
					deciderUserId: confirmer.id,
					decision: "confirm",
					note: "Agreed",
				});
				expect(await grantsOfContributor()).toContain("publication.publish");
			});
		});

		it("doesn't propose a permission the role already has", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				const result = await saveRolePermissions(tx, {
					actorUserId: superadmin.id,
					reason: "Nothing to do",
					changes: [
						{
							roleId: await roleIdNamed(tx, "Admin"),
							permission: "publication.publish",
							granted: true,
						},
					],
				});

				expect(result).toEqual({ applied: 0, proposed: 0 });
			});
		});

		it("refuses to change the locked Superadmin role", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				await expect(
					saveRolePermissions(tx, {
						actorUserId: superadmin.id,
						reason: "Oops",
						changes: [
							{
								roleId: await roleIdNamed(tx, "Superadmin"),
								permission: "roles.manage",
								granted: false,
							},
						],
					}),
				).rejects.toThrow("can't be changed");
			});
		});

		it("needs a reason", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				await expect(
					saveRolePermissions(tx, {
						actorUserId: superadmin.id,
						reason: "",
						changes: [],
					}),
				).rejects.toThrow("Give a reason");
			});
		});

		it("creates a role with no permissions and refuses a duplicate name", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");

				const roleId = await createRole(tx, {
					actorUserId: superadmin.id,
					name: "Hebrew Reviewer",
					description: "Checks Hebrew",
				});

				const matrix = await getRoleMatrix(tx);
				expect(matrix.roles.find(({ id }) => id === roleId)?.grants).toEqual(
					[],
				);
				await expect(
					createRole(tx, {
						actorUserId: superadmin.id,
						name: "hebrew reviewer",
						description: "",
					}),
				).rejects.toThrow("already exists");
			});
		});
	});

	describe("deleting an account", () => {
		it("really deletes an account with no record", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const member = await createPerson(tx);
				await addNote(tx, member.id, "Private");

				expect(await deleteAccount(tx, member.id)).toBe("deleted");

				expect(
					await tx.select().from(user).where(eq(user.id, member.id)),
				).toEqual([]);
			});
		});

		it("erases personal details but keeps the record when one exists", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const staff = await createPerson(tx, "Admin");
				await addSession(tx, staff.id);
				const noteId = await addNote(tx, staff.id, "Private");
				const plainPost = await addPost(tx, staff.id);
				await recordAudit(tx, {
					actorUserId: staff.id,
					action: "revision.published",
					targetType: "content_revision",
					targetId: 7,
				});

				expect(await deleteAccount(tx, staff.id)).toBe("retired");

				const [row] = await tx.select().from(user).where(eq(user.id, staff.id));
				expect(row).toMatchObject({
					name: "Deleted member",
					image: null,
					email: `deleted-${staff.id}@deleted.invalid`,
				});
				expect(row?.deletedAt).toBeInstanceOf(Date);
				expect(
					await tx.select().from(notes).where(eq(notes.id, noteId)),
				).toEqual([]);
				expect(
					await tx
						.select()
						.from(communityPosts)
						.where(eq(communityPosts.id, plainPost)),
				).toEqual([]);
				expect(
					await tx.select().from(session).where(eq(session.userId, staff.id)),
				).toEqual([]);
				expect(
					await tx
						.select()
						.from(userRoles)
						.where(eq(userRoles.userId, staff.id)),
				).toEqual([]);

				const history = await tx
					.select({ action: auditLog.action, actorRole: auditLog.actorRole })
					.from(auditLog)
					.where(eq(auditLog.actorUserId, staff.id));
				expect(history).toEqual(
					expect.arrayContaining([
						{ action: "revision.published", actorRole: "Admin" },
						{ action: "user.account_retired", actorRole: "Admin" },
					]),
				);
			});
		});

		it("keeps a reported post as an empty shell, so the report still makes sense", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const author = await createPerson(tx);
				const reporter = await createPerson(tx);
				const postId = await addPost(tx, author.id);
				await tx.insert(communityReports).values({
					communityPostId: postId,
					reportedByUserId: reporter.id,
					reason: "spam",
				});

				expect(await deleteAccount(tx, author.id)).toBe("retired");

				const [post] = await tx
					.select()
					.from(communityPosts)
					.where(eq(communityPosts.id, postId));
				expect(post?.snapshot).toEqual({});
				expect(post?.removedAt).toBeInstanceOf(Date);
			});
		});

		it("refuses to leave fewer than two Superadmins", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const first = await createPerson(tx, "Superadmin");
				await createPerson(tx, "Superadmin");

				await expect(deleteAccount(tx, first.id)).rejects.toThrow(
					"at least 2 Superadmins",
				);
			});
		});

		it("can't be acted on afterwards", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				const staff = await createPerson(tx, "Admin");
				await recordAudit(tx, {
					actorUserId: staff.id,
					action: "revision.published",
					targetType: "content_revision",
					targetId: 7,
				});
				await deleteAccount(tx, staff.id);

				await expect(
					suspendAccount(tx, {
						actorUserId: superadmin.id,
						targetUserId: staff.id,
						reason: "Too late",
						days: null,
					}),
				).rejects.toThrow("no longer exists");
			});
		});

		it("covers every table that would cascade on a real delete", async () => {
			// These two stay on purpose: contributors anchors editorial history, and
			// posts need their own handling because reports point at them.
			const handledSeparately = ["community_posts", "contributors"];
			const { rows } = await db.execute<{ table_name: string }>(sql`
				SELECT DISTINCT source.relname AS table_name
				FROM pg_constraint constraint_row
				JOIN pg_class source ON source.oid = constraint_row.conrelid
				JOIN pg_class referenced ON referenced.oid = constraint_row.confrelid
				WHERE constraint_row.contype = 'f'
					AND constraint_row.confdeltype = 'c'
					AND referenced.relname = 'user'
			`);

			const erased = erasedOnRetirement.map(({ table }) => getTableName(table));
			expect([...erased, ...handledSeparately].sort()).toEqual(
				rows.map(({ table_name }) => table_name).sort(),
			);
		});
	});

	describe("audit log", () => {
		async function seedEntries(tx: DbExecutor, actorUserId: string) {
			await recordAudit(tx, {
				actorUserId,
				action: "revision.published",
				targetType: "content_revision",
				targetId: 1,
			});
			await recordAudit(tx, {
				actorUserId,
				action: "user.suspended",
				targetType: "user",
				targetId: actorUserId,
			});
		}

		it("shows an Admin editorial activity and their own, not the rest", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				const admin = await createPerson(tx, "Admin");
				await seedEntries(tx, superadmin.id);

				const seen = await listAuditEntries(
					tx,
					{ canViewAll: false, userId: admin.id },
					{ page: 1 },
				);
				const fromSuperadmin = seen.entries.filter(
					({ actorUserId }) => actorUserId === superadmin.id,
				);
				expect(fromSuperadmin.map(({ action }) => action)).toEqual([
					"revision.published",
				]);
				for (const { domain, actorUserId } of seen.entries) {
					if (actorUserId !== admin.id) {
						expect(editorialAuditDomains).toContain(domain);
					}
				}

				await seedEntries(tx, admin.id);
				const mine = await listAuditEntries(
					tx,
					{ canViewAll: false, userId: admin.id },
					{ page: 1, mine: true },
				);
				expect(mine.entries.map(({ action }) => action).sort()).toEqual([
					"revision.published",
					"user.suspended",
				]);
			});
		});

		it("shows a Superadmin everything, and filters by area", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				await seedEntries(tx, superadmin.id);

				const users = await listAuditEntries(
					tx,
					{ canViewAll: true, userId: superadmin.id },
					{ page: 1, domain: "users", mine: true },
				);

				expect(users.entries.map(({ action }) => action)).toEqual([
					"user.suspended",
				]);
				expect(users.entries[0]?.targetName).toBe("Test Person");
			});
		});

		it("shows Deleted member for someone who has gone", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const staff = await createPerson(tx, "Admin");
				await recordAudit(tx, {
					actorUserId: staff.id,
					action: "revision.published",
					targetType: "content_revision",
					targetId: 1,
				});
				await deleteAccount(tx, staff.id);

				const { entries } = await listAuditEntries(
					tx,
					{ canViewAll: true, userId: staff.id },
					{ page: 1, mine: true },
				);

				expect(entries.map(({ actorName }) => actorName)).toContain(
					"Deleted member",
				);
			});
		});

		it("exports CSV that a spreadsheet can't run as a formula", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const superadmin = await createPerson(tx, "Superadmin");
				await tx
					.update(user)
					.set({ name: '=HYPERLINK("http://evil")' })
					.where(eq(user.id, superadmin.id));
				await recordAudit(tx, {
					actorUserId: superadmin.id,
					action: "user.warned",
					targetType: "post",
					targetId: 1,
					details: { reason: 'He said "no"' },
				});

				const csv = await exportAuditEntries(
					tx,
					{ canViewAll: true, userId: superadmin.id },
					{ mine: true },
				);

				expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
				expect(csv.split("\r\n")).toHaveLength(2);
			});
		});
	});
});
