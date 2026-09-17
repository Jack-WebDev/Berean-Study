#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const vitestPackage = require.resolve("vitest/package.json");
const vitest = fileURLToPath(
	new URL("./vitest.mjs", pathToFileURL(vitestPackage)),
);
const result = spawnSync(process.execPath, [vitest, ...process.argv.slice(2)], {
	cwd: process.cwd(),
	stdio: "inherit",
});

process.exitCode = result.status ?? 1;
