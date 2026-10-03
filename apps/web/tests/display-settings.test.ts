import { afterEach, describe, expect, it } from "vitest";
import { applyDisplaySettings } from "../src/components/account/preferences/display-settings";

afterEach(() => {
	document.documentElement.classList.remove("dark");
	document.getElementById("favicon")?.remove();
});

describe("applyDisplaySettings", () => {
	it("updates the favicon to match the app theme", () => {
		const favicon = document.createElement("link");
		favicon.id = "favicon";
		favicon.rel = "icon";
		favicon.href = "/favicon.png";
		document.head.append(favicon);

		applyDisplaySettings({
			readingWidth: "default",
			textSize: "default",
			theme: "dark",
		});
		expect(favicon.getAttribute("href")).toBe("/favicon-dark.png");

		applyDisplaySettings({
			readingWidth: "default",
			textSize: "default",
			theme: "light",
		});
		expect(favicon.getAttribute("href")).toBe("/favicon.png");
	});
});
