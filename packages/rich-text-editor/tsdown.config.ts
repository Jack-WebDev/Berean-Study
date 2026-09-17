import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/types.ts"],
	outDir: "dist",
	platform: "node",
	dts: true,
	clean: true,
});
