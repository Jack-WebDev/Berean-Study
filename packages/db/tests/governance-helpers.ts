import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { expect } from "vitest";

import { db } from "../src";
import { applyAccessCatalogue } from "../src/access-setup";
import type { DbExecutor } from "../src/db-executor";
import { user } from "../src/schema/auth";
import { roles } from "../src/schema/roles";
import { userRoles } from "../src/schema/user_roles";

class RollBack extends Error {}

/** Runs a test inside a transaction that is always undone, leaving the database as it was. */
export async function inRolledBackTransaction(
	test: (tx: DbExecutor) => Promise<void>,
) {
	await expect(
		db.transaction(async (tx) => {
			await test(tx);
			throw new RollBack();
		}),
	).rejects.toBeInstanceOf(RollBack);
}

/**
 * For tests that count or create Scripture. These share the development database,
 * which holds whatever people have entered, so they start with none of it. Taking
 * it out is part of the transaction, so it all comes back when the test ends.
 */
export function inRolledBackTransactionWithoutScripture(
	test: (tx: DbExecutor) => Promise<void>,
) {
	return inRolledBackTransaction(async (tx) => {
		await tx.execute(sql`TRUNCATE TABLE chapters CASCADE`);
		await test(tx);
	});
}

export async function createAccount(tx: DbExecutor) {
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

export async function roleIdNamed(tx: DbExecutor, name: string) {
	const [role] = await tx
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.name, name));
	if (!role) throw new Error(`No role named ${name}`);
	return role.id;
}

/** An account holding these roles, in a database with the current catalogue. */
export async function createPerson(tx: DbExecutor, ...roleNames: string[]) {
	const account = await createAccount(tx);
	for (const name of ["Member", ...roleNames]) {
		await tx
			.insert(userRoles)
			.values({ userId: account.id, roleId: await roleIdNamed(tx, name) });
	}
	return account;
}

/**
 * A fresh start for rules that count Superadmins: the catalogue is applied and
 * nobody holds the role until the test says so.
 */
export async function withFreshCatalogue(tx: DbExecutor) {
	await applyAccessCatalogue(tx);
	await tx
		.delete(userRoles)
		.where(eq(userRoles.roleId, await roleIdNamed(tx, "Superadmin")));
}
