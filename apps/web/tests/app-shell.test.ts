import { ShapesIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import { isCurrentLocation } from "../src/components/navigation/is-current-location";
import type { NavigationItem } from "../src/components/navigation/navigation-items";

const overviewItem = {
	exact: true,
	hash: "",
	href: "/study-tools",
	hideIcon: true,
	icon: ShapesIcon,
	label: "Overview",
} as const satisfies NavigationItem;

const themesItem = {
	href: "/study-tools/themes",
	hideIcon: true,
	icon: ShapesIcon,
	label: "Themes",
} as const satisfies NavigationItem;

describe("isCurrentLocation", () => {
	it("does not mark the overview child active for a nested study tool route", () => {
		expect(isCurrentLocation("/study-tools/themes", overviewItem)).toBe(false);
		expect(isCurrentLocation("/study-tools/themes", themesItem)).toBe(true);
	});
});
