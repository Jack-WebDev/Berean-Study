import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import { getPermissionKeys } from "../src/access";
import type { DbExecutor } from "../src/db-executor";
import { changeRoles, getPersonProfile, openAccessCase } from "../src/people";
import { auditLog } from "../src/schema/audit_log";
import { changeProposals } from "../src/schema/change_proposals";
import { notifications } from "../src/schema/notifications";
import { roles } from "../src/schema/roles";
import { userRoles } from "../src/schema/user_roles";
import { decideChange } from "../src/two-person";
import {
	createPerson,
	inRolledBackTransaction,
	roleIdNamed,
	withFreshCatalogue,
} from "./governance-helpers";

async function auditActionsFor(tx: DbExecutor, userId: string) {
	const rows = await tx
		.select({ action: auditLog.action })
		.from(auditLog)
		.where(eq(auditLog.targetId, userId));
	return rows.map(({ action }) => action);
}

async function roleNamesOf(tx: DbExecutor, userId: string) {
	const rows = await tx
		.select({ name: roles.name })
		.from(userRoles)
		.innerJoin(roles, eq(roles.id, userRoles.roleId))
		.where(eq(userRoles.userId, userId));
	return rows.map(({ name }) => name).sort();
}

async function pendingProposalFor(tx: DbExecutor, targetId: string) {
	const [proposal] = await tx
		.select()
		.from(changeProposals)
		.where(eq(changeProposals.targetId, targetId));
	if (!proposal) throw new Error("No proposal found");
	return proposal;
}

async function promoteToAdmin(
	tx: DbExecutor,
	actorUserId: string,
	targetUserId: string,
) {
	return changeRoles(tx, {
		actorUserId,
		targetUserId,
		grant: [await roleIdNamed(tx, "Admin")],
		revoke: [],
		reason: "Has led the Romans series",
	});
}

describe.runIf(process.env.DATABASE_URL)("two-person changes", () => {
	afterAll(async () => {
		await pool.end();
	});

	describe("role changes", () => {
		it("applies an ordinary role straight away and records it", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const admin = await createPerson(tx, "Admin");
				const member = await createPerson(tx);

				const result = await changeRoles(tx, {
					actorUserId: admin.id,
					targetUserId: member.id,
					grant: [await roleIdNamed(tx, "Contributor")],
					revoke: [],
					reason: "Joining the Romans team",
				});

				expect(result).toEqual({ applied: ["Contributor"], proposed: [] });
				expect(await roleNamesOf(tx, member.id)).toEqual([
					"Contributor",
					"Member",
				]);
				expect(await auditActionsFor(tx, member.id)).toEqual(["role.granted"]);
			});
		});

		it("holds a protected role until a second person confirms it", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const requester = await createPerson(tx, "Admin");
				const confirmer = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx, "Contributor");

				const result = await promoteToAdmin(tx, requester.id, member.id);

				expect(result).toEqual({ applied: [], proposed: ["Admin"] });
				expect(await roleNamesOf(tx, member.id)).not.toContain("Admin");

				const proposal = await pendingProposalFor(tx, member.id);
				await decideChange(tx, {
					proposalId: proposal.id,
					deciderUserId: confirmer.id,
					decision: "confirm",
					note: "Agreed",
				});

				expect(await roleNamesOf(tx, member.id)).toContain("Admin");
				expect(await getPermissionKeys(tx, member.id)).toContain(
					"publication.publish",
				);
				expect((await pendingProposalFor(tx, member.id)).status).toBe(
					"applied",
				);
				expect(await auditActionsFor(tx, member.id)).toEqual(
					expect.arrayContaining([
						"promotion.requested",
						"promotion.decided",
						"role.granted",
					]),
				);
			});
		});

		it("treats a custom role with elevated permissions as protected", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const admin = await createPerson(tx, "Admin");
				const member = await createPerson(tx);
				const [custom] = await tx
					.insert(roles)
					.values({ name: "Harmless Helper" })
					.returning({ id: roles.id });
				if (!custom) throw new Error("No role");
				const [publish] = await tx
					.execute<{ id: number }>(
						`select id from permissions where key = 'publication.publish'`,
					)
					.then(({ rows }) => rows);
				if (!publish) throw new Error("No permission");
				await tx.execute(
					`insert into role_permissions (role_id, permission_id) values (${custom.id}, ${publish.id})`,
				);

				const result = await changeRoles(tx, {
					actorUserId: admin.id,
					targetUserId: member.id,
					grant: [custom.id],
					revoke: [],
					reason: "Trying to get around the rule",
				});

				expect(result.proposed).toEqual(["Harmless Helper"]);
				expect(await roleNamesOf(tx, member.id)).toEqual(["Member"]);
			});
		});

		it("doesn't let an Admin request the Superadmin role", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const admin = await createPerson(tx, "Admin");
				const member = await createPerson(tx);

				await expect(
					changeRoles(tx, {
						actorUserId: admin.id,
						targetUserId: member.id,
						grant: [await roleIdNamed(tx, "Superadmin")],
						revoke: [],
						reason: "Please",
					}),
				).rejects.toThrow("Only a Superadmin");
			});
		});

		it("doesn't let a contributor change anyone's roles", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const contributor = await createPerson(tx, "Contributor");
				const member = await createPerson(tx);

				await expect(
					changeRoles(tx, {
						actorUserId: contributor.id,
						targetUserId: member.id,
						grant: [await roleIdNamed(tx, "Greek Reviewer")],
						revoke: [],
						reason: "Please",
					}),
				).rejects.toThrow("don't have permission");
			});
		});

		it("doesn't let anyone change their own roles", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const admin = await createPerson(tx, "Admin");

				await expect(
					changeRoles(tx, {
						actorUserId: admin.id,
						targetUserId: admin.id,
						grant: [await roleIdNamed(tx, "Greek Reviewer")],
						revoke: [],
						reason: "Please",
					}),
				).rejects.toThrow("your own roles");
			});
		});

		it("keeps the Member role on everyone", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const admin = await createPerson(tx, "Admin");
				const member = await createPerson(tx);

				await expect(
					changeRoles(tx, {
						actorUserId: admin.id,
						targetUserId: member.id,
						grant: [],
						revoke: [await roleIdNamed(tx, "Member")],
						reason: "Please",
					}),
				).rejects.toThrow("can't be removed");
			});
		});

		it("refuses to drop below two Superadmins, but allows it with a third", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const first = await createPerson(tx, "Superadmin");
				const second = await createPerson(tx, "Superadmin");
				const superadminRole = await roleIdNamed(tx, "Superadmin");
				const removeSecond = () =>
					changeRoles(tx, {
						actorUserId: first.id,
						targetUserId: second.id,
						grant: [],
						revoke: [superadminRole],
						reason: "Stepping down",
					});

				await expect(removeSecond()).rejects.toThrow("at least 2 Superadmins");

				const third = await createPerson(tx, "Superadmin");
				await removeSecond();
				await decideChange(tx, {
					proposalId: (await pendingProposalFor(tx, second.id)).id,
					deciderUserId: third.id,
					decision: "confirm",
					note: "Agreed",
				});

				expect(await roleNamesOf(tx, second.id)).toEqual(["Member"]);
			});
		});
	});

	describe("deciding", () => {
		it("refuses the person who proposed the change", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const proposer = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx);
				await promoteToAdmin(tx, proposer.id, member.id);

				await expect(
					decideChange(tx, {
						proposalId: (await pendingProposalFor(tx, member.id)).id,
						deciderUserId: proposer.id,
						decision: "confirm",
						note: "Looks good to me",
					}),
				).rejects.toThrow("You proposed this change");

				expect(await roleNamesOf(tx, member.id)).toEqual(["Member"]);
			});
		});

		it("is refused by the database too, if the code ever got it wrong", async () => {
			await expect(
				db.transaction(async (tx) => {
					await withFreshCatalogue(tx);
					const proposer = await createPerson(tx, "Superadmin");
					const member = await createPerson(tx);
					await promoteToAdmin(tx, proposer.id, member.id);
					await tx
						.update(changeProposals)
						.set({
							status: "applied",
							decidedByUserId: proposer.id,
							decisionNote: "Sneaky",
							decidedAt: new Date(),
						})
						.where(eq(changeProposals.targetId, member.id));
				}),
			).rejects.toMatchObject({
				cause: expect.objectContaining({
					constraint: "change_proposals_decider_not_proposer_check",
				}),
			});
		});

		it("refuses someone without the permission to decide", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const proposer = await createPerson(tx, "Superadmin");
				const otherAdmin = await createPerson(tx, "Admin");
				const member = await createPerson(tx);
				await promoteToAdmin(tx, proposer.id, member.id);

				await expect(
					decideChange(tx, {
						proposalId: (await pendingProposalFor(tx, member.id)).id,
						deciderUserId: otherAdmin.id,
						decision: "confirm",
						note: "Agreed",
					}),
				).rejects.toThrow("don't have permission");
			});
		});

		it("refuses the person the change is about", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const proposer = await createPerson(tx, "Superadmin");
				const target = await createPerson(tx, "Superadmin");
				await promoteToAdmin(tx, proposer.id, target.id);

				await expect(
					decideChange(tx, {
						proposalId: (await pendingProposalFor(tx, target.id)).id,
						deciderUserId: target.id,
						decision: "confirm",
						note: "Agreed",
					}),
				).rejects.toThrow("about you");
			});
		});

		it("requires a note", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const proposer = await createPerson(tx, "Superadmin");
				const decider = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx);
				await promoteToAdmin(tx, proposer.id, member.id);

				await expect(
					decideChange(tx, {
						proposalId: (await pendingProposalFor(tx, member.id)).id,
						deciderUserId: decider.id,
						decision: "confirm",
						note: "   ",
					}),
				).rejects.toThrow("Add a note");
			});
		});

		it("leaves things unchanged when rejected, and can't be decided twice", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const proposer = await createPerson(tx, "Superadmin");
				const decider = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx);
				await promoteToAdmin(tx, proposer.id, member.id);
				const { id: proposalId } = await pendingProposalFor(tx, member.id);

				await decideChange(tx, {
					proposalId,
					deciderUserId: decider.id,
					decision: "reject",
					note: "Not yet",
				});

				expect(await roleNamesOf(tx, member.id)).toEqual(["Member"]);
				await expect(
					decideChange(tx, {
						proposalId,
						deciderUserId: decider.id,
						decision: "confirm",
						note: "Changed my mind",
					}),
				).rejects.toThrow("already been decided");
			});
		});

		it("refuses a duplicate of a waiting change", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const proposer = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx);
				await promoteToAdmin(tx, proposer.id, member.id);

				await expect(
					promoteToAdmin(tx, proposer.id, member.id),
				).rejects.toThrow("already waiting");
			});
		});

		it("tells deciders, then tells the proposer and the person concerned", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const requester = await createPerson(tx, "Admin");
				const decider = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx, "Contributor");
				const recipients = async () =>
					(
						await tx
							.select({ userId: notifications.userId })
							.from(notifications)
							.where(eq(notifications.kind, "change_proposal"))
					).map(({ userId }) => userId);

				await promoteToAdmin(tx, requester.id, member.id);
				expect(await recipients()).toContain(decider.id);
				expect(await recipients()).not.toContain(requester.id);

				await decideChange(tx, {
					proposalId: (await pendingProposalFor(tx, member.id)).id,
					deciderUserId: decider.id,
					decision: "confirm",
					note: "Agreed",
				});
				expect(await recipients()).toEqual(
					expect.arrayContaining([requester.id, member.id]),
				);
			});
		});
	});

	describe("access cases", () => {
		const openCase = (
			tx: DbExecutor,
			actorUserId: string,
			targetUserId: string,
		) =>
			openAccessCase(tx, {
				actorUserId,
				targetUserId,
				ground: "safety",
				scope: ["notes"],
				expiresInDays: 14,
				reason: "A court order, reference 123",
			});

		it("needs a second person and records the decision with its expiry", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const opener = await createPerson(tx, "Superadmin");
				const decider = await createPerson(tx, "Superadmin");
				const member = await createPerson(tx);
				const proposalId = await openCase(tx, opener.id, member.id);

				await expect(
					decideChange(tx, {
						proposalId,
						deciderUserId: opener.id,
						decision: "confirm",
						note: "Fine",
					}),
				).rejects.toThrow("You proposed this change");

				await decideChange(tx, {
					proposalId,
					deciderUserId: decider.id,
					decision: "confirm",
					note: "Order checked",
				});

				const profile = await getPersonProfile(tx, member.id);
				expect(profile?.accessCases).toEqual([
					expect.objectContaining({
						status: "applied",
						scope: ["notes"],
						expiresAt: expect.any(Date),
					}),
				]);
				expect(await auditActionsFor(tx, member.id)).toEqual(
					expect.arrayContaining([
						"access_case.opened",
						"access_case.approved",
					]),
				);
			});
		});

		it("can't be opened about yourself", async () => {
			await inRolledBackTransaction(async (tx) => {
				await withFreshCatalogue(tx);
				const opener = await createPerson(tx, "Superadmin");

				await expect(openCase(tx, opener.id, opener.id)).rejects.toThrow(
					"about yourself",
				);
			});
		});
	});
});
