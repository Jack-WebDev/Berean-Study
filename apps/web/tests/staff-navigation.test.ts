import {
	type PermissionKey,
	roleCatalogue,
} from "@berean-study/db/access-catalogue";
import { describe, expect, it } from "vitest";

import {
	accessibleStaffItem,
	accessibleStaffSections,
} from "../src/components/navigation/navigation-items";

function grantsOf(roleName: string): readonly PermissionKey[] {
	const role = roleCatalogue.find(({ name }) => name === roleName);
	if (!role) throw new Error(`No role named ${roleName}`);
	return role.grants;
}

function sectionsFor(roleName: string) {
	return accessibleStaffSections(grantsOf(roleName)).map(({ label }) => label);
}

function linksFor(roleName: string) {
	return accessibleStaffSections(grantsOf(roleName)).flatMap(({ items }) =>
		items.map(({ label }) => label),
	);
}

describe("staff sidebar sections", () => {
	it("shows a member no staff sections", () => {
		expect(sectionsFor("Member")).toEqual([]);
	});

	it("shows a contributor only the Contributor section", () => {
		expect(sectionsFor("Contributor")).toEqual(["Contributor"]);
	});

	it("shows an admin Contributor and Administration", () => {
		expect(sectionsFor("Admin")).toEqual(["Contributor", "Administration"]);
	});

	it("shows a superadmin every section", () => {
		expect(sectionsFor("Superadmin")).toEqual([
			"Contributor",
			"Administration",
			"Management",
		]);
	});

	it("gives a Greek Reviewer the review pages but no writing pages", () => {
		expect(linksFor("Greek Reviewer")).toEqual(["Assignments", "Reviews"]);
	});

	it("follows each link's own permission for a custom role", () => {
		expect(
			accessibleStaffSections(["community.moderate"]).flatMap(({ items }) =>
				items.map(({ label }) => label),
			),
		).toEqual(["Overview", "Community Moderation"]);
	});
});

describe("staff page access", () => {
	it("allows a page only with the permission it needs", () => {
		expect(
			accessibleStaffItem("/admin/roles", grantsOf("Superadmin")),
		).toBeDefined();
		expect(
			accessibleStaffItem("/admin/roles", grantsOf("Admin")),
		).toBeUndefined();
	});

	it("rejects addresses that aren't staff pages", () => {
		expect(
			accessibleStaffItem("/admin/not-a-page", grantsOf("Superadmin")),
		).toBeUndefined();
	});
});
