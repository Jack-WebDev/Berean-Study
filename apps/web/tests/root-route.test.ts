import { describe, expect, it } from "vitest";
import { Route } from "../src/routes/__root";

describe("root route metadata", () => {
	it("provides an app-controlled favicon link", async () => {
		const head = await Route.options.head?.({} as never);

		expect(head?.links).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					href: "/favicon.png",
					id: "favicon",
					rel: "icon",
				}),
			]),
		);
	});
});
