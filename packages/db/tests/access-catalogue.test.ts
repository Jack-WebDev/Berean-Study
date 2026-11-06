import { describe, expect, it } from "vitest";

import {
	type PermissionKey,
	permissionCatalogue,
	roleCatalogue,
} from "../src/access-catalogue";
import { auditDomainFor, auditDomains } from "../src/audit-catalogue";

function grantsOf(roleName: string): readonly PermissionKey[] {
	const role = roleCatalogue.find(({ name }) => name === roleName);
	if (!role) throw new Error(`No role named ${roleName}`);
	return role.grants;
}

describe("role catalogue", () => {
	it("has no duplicate permission codes", () => {
		const keys = permissionCatalogue.map(({ key }) => key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("gives only the locked role every permission", () => {
		const everyPermission = permissionCatalogue.length;
		for (const role of roleCatalogue) {
			expect(role.grants.length === everyPermission).toBe(role.locked);
		}
	});

	it("gives new sign-ups exactly one role", () => {
		expect(
			roleCatalogue
				.filter(({ autoAssign }) => autoAssign)
				.map(({ name }) => name),
		).toEqual(["Member"]);
	});

	it("keeps publishing away from contributors", () => {
		const grants = grantsOf("Contributor");
		expect(grants).toContain("editorial.review");
		expect(grants).not.toContain("publication.publish");
		expect(grants).not.toContain("editorial.assign");
	});

	it("keeps foundations and the full audit log away from admins", () => {
		const grants = grantsOf("Admin");
		expect(grants).toContain("publication.publish");
		expect(grants).toContain("audit.view");
		for (const key of [
			"admins.manage",
			"roles.manage",
			"scripture.manage",
			"canon.manage",
			"translations.manage",
			"audit.view_all",
		] as const) {
			expect(grants).not.toContain(key);
		}
	});

	it("reserves the original-language check for Greek Reviewers and Superadmins", () => {
		const holders = roleCatalogue
			.filter(({ grants }) =>
				grants.includes("editorial.check_original_language"),
			)
			.map(({ name }) => name);
		expect(holders).toEqual(["Greek Reviewer", "Superadmin"]);
	});
});

describe("audit catalogue", () => {
	it("files every action under a known area", () => {
		expect(auditDomains).toContain(auditDomainFor("role.granted"));
		expect(auditDomainFor("revision.published")).toBe("publication");
	});
});
