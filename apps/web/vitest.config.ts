import { fileURLToPath } from "node:url";
import { defineDomTestConfig } from "@berean-study/testkit/vitest";
import { mergeConfig } from "vitest/config";

export default mergeConfig(defineDomTestConfig(), {
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
