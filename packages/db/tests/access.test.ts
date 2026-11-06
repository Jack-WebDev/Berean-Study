import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import {
	assignSignUpRoles,
	getPermissionKeys,
	getPrimaryRole,
} from "../src/access";
import { permissionCatalogue } from "../src/access-catalogue";
import {
	applyAccessCatalogue,
	grantFoundingSuperadmin,
} from "../src/access-setup";
import { recordAudit } from "../src/audit";
import type { DbExecutor } from "../src/db-executor";
import { auditLog } from "../src/schema/audit_log";
import { user } from "../src/schema/auth";
import { permissions } from "../src/schema/permissions";
import { rolePermissions } from "../src/schema/role_permissions";
import { roles } from "../src/schema/roles";
import { userRoles } from "../src/schema/user_roles";

const describeWithDatabase = process.env.DATABASE_URL
	? describe
	: describe.skip;

class RollBack extends Error {}

/** Runs a test inside a transaction that is always undone, leaving the database as it was. */
async function inRolledBackTransaction(
	test: (tx: DbExecutor) => Promise<void>,
) {
	await expect(
		db.transaction(async (tx) => {
			await test(tx);
			throw new RollBack();
		}),
	).rejects.toBeInstanceOf(RollBack);
}

async function createAccount(tx: DbExecutor) {
	const id = randomUUID();
	const email = `${id}@example.org`;
	await tx.insert(user).values({
		id,
		name: "Test Person",
		email,
		emailVerified: true,
	});
	return { email, id };
}

async function roleIdNamed(tx: DbExecutor, name: string) {
	const [role] = await tx
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.name, name));
	if (!role) throw new Error(`No role named ${name}`);
	return role.id;
}

/** Removes existing Superadmins inside the transaction, so limits start from zero. */
async function clearSuperadmins(tx: DbExecutor) {
	await tx
		.delete(userRoles)
		.where(eq(userRoles.roleId, await roleIdNamed(tx, "Superadmin")));
}

describeWithDatabase("access", () => {
	afterAll(async () => {
		await pool.end();
	});

	describe("access catalogue", () => {
		it("can run repeatedly and keeps the Superadmin holding everything", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				await applyAccessCatalogue(tx);

				const rows = await tx
					.select({ key: permissions.key })
					.from(rolePermissions)
					.innerJoin(
						permissions,
						eq(permissions.id, rolePermissions.permissionId),
					)
					.where(
						eq(rolePermissions.roleId, await roleIdNamed(tx, "Superadmin")),
					);
				expect(rows).toHaveLength(permissionCatalogue.length);
			});
		});

		it("keeps a permission someone removed from a role on the Roles screen", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				const contributorId = await roleIdNamed(tx, "Contributor");
				const [permission] = await tx
					.select({ id: permissions.id })
					.from(permissions)
					.where(eq(permissions.key, "research.manage"));
				if (!permission) throw new Error("Permission missing");
				await tx
					.delete(rolePermissions)
					.where(
						and(
							eq(rolePermissions.roleId, contributorId),
							eq(rolePermissions.permissionId, permission.id),
						),
					);

				await applyAccessCatalogue(tx);

				const rows = await tx
					.select()
					.from(rolePermissions)
					.where(
						and(
							eq(rolePermissions.roleId, contributorId),
							eq(rolePermissions.permissionId, permission.id),
						),
					);
				expect(rows).toEqual([]);
			});
		});

		it("restores a permission removed from the locked Superadmin role", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				const superadminId = await roleIdNamed(tx, "Superadmin");
				await tx
					.delete(rolePermissions)
					.where(eq(rolePermissions.roleId, superadminId));

				await applyAccessCatalogue(tx);

				const rows = await tx
					.select()
					.from(rolePermissions)
					.where(eq(rolePermissions.roleId, superadminId));
				expect(rows).toHaveLength(permissionCatalogue.length);
			});
		});

		it("repairs accounts with no role, and leaves other accounts alone", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				const withoutRoles = await createAccount(tx);
				const contributor = await createAccount(tx);
				await tx.insert(userRoles).values({
					userId: contributor.id,
					roleId: await roleIdNamed(tx, "Contributor"),
				});

				await applyAccessCatalogue(tx);

				expect((await getPrimaryRole(tx, withoutRoles.id))?.name).toBe(
					"Member",
				);
				expect(
					await tx
						.select({ roleId: userRoles.roleId })
						.from(userRoles)
						.where(eq(userRoles.userId, contributor.id)),
				).toHaveLength(1);
			});
		});
	});

	describe("people's access", () => {
		it("gives a new account the Member permissions and no staff label", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				const account = await createAccount(tx);

				await assignSignUpRoles(tx, account.id);

				const keys = await getPermissionKeys(tx, account.id);
				expect(keys).toContain("study.read");
				expect(keys).not.toContain("content.write");
				expect(await getPrimaryRole(tx, account.id)).toEqual({
					name: "Member",
					autoAssign: true,
				});
			});
		});

		it("combines permissions across roles and displays the strongest role", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				const account = await createAccount(tx);
				for (const name of ["Member", "Greek Reviewer", "Admin"]) {
					await tx.insert(userRoles).values({
						userId: account.id,
						roleId: await roleIdNamed(tx, name),
					});
				}

				const keys = await getPermissionKeys(tx, account.id);
				expect(keys).toContain("publication.publish");
				expect(keys).toContain("editorial.check_original_language");
				expect((await getPrimaryRole(tx, account.id))?.name).toBe("Admin");
			});
		});
	});

	describe("founding Superadmins", () => {
		it("allows two, records each, and then refuses a third", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				await clearSuperadmins(tx);
				const first = await createAccount(tx);
				const second = await createAccount(tx);
				const third = await createAccount(tx);

				expect(await grantFoundingSuperadmin(tx, first.email)).toBe("granted");
				expect(await grantFoundingSuperadmin(tx, second.email)).toBe("granted");
				await expect(grantFoundingSuperadmin(tx, third.email)).rejects.toThrow(
					"Two Superadmins already exist",
				);

				const entries = await tx
					.select({ action: auditLog.action, domain: auditLog.domain })
					.from(auditLog)
					.where(inArray(auditLog.targetId, [first.id, second.id]));
				expect(entries).toEqual([
					{ action: "role.granted", domain: "authorization" },
					{ action: "role.granted", domain: "authorization" },
				]);
			});
		});

		it("does nothing for someone who is already a Superadmin", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				await clearSuperadmins(tx);
				const account = await createAccount(tx);

				await grantFoundingSuperadmin(tx, account.email);

				expect(
					await grantFoundingSuperadmin(tx, account.email.toUpperCase()),
				).toBe("already-superadmin");
			});
		});

		it("explains when the account doesn't exist", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				await expect(
					grantFoundingSuperadmin(tx, "nobody@example.org"),
				).rejects.toThrow("Register that account first");
			});
		});
	});

	describe("audit log", () => {
		it("captures the actor's role and the area of the app", async () => {
			await inRolledBackTransaction(async (tx) => {
				await applyAccessCatalogue(tx);
				const account = await createAccount(tx);
				await tx.insert(userRoles).values({
					userId: account.id,
					roleId: await roleIdNamed(tx, "Admin"),
				});

				await recordAudit(tx, {
					actorUserId: account.id,
					action: "revision.published",
					targetType: "content_revision",
					targetId: 42,
				});

				const [entry] = await tx
					.select()
					.from(auditLog)
					.where(eq(auditLog.actorUserId, account.id));
				expect(entry).toMatchObject({
					actorRole: "Admin",
					domain: "publication",
					targetId: "42",
				});
			});
		});

		it.each(["update", "delete"] as const)(
			"refuses to %s an entry, even directly in the database",
			async (operation) => {
				await expect(
					db.transaction(async (tx) => {
						const account = await createAccount(tx);
						await recordAudit(tx, {
							actorUserId: account.id,
							action: "user.suspended",
							targetType: "user",
							targetId: account.id,
						});
						const change = eq(auditLog.actorUserId, account.id);
						await (operation === "update"
							? tx.update(auditLog).set({ action: "tampered" }).where(change)
							: tx.delete(auditLog).where(change));
					}),
				).rejects.toMatchObject({
					cause: expect.objectContaining({
						message: expect.stringContaining("append-only"),
					}),
				});
			},
		);
	});
});
