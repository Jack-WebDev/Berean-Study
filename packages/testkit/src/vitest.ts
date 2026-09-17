import { defineConfig } from "vitest/config";

const testFiles = ["tests/**/*.{test,spec}.{ts,tsx}"];

export function defineDomTestConfig() {
	return defineConfig({
		test: {
			environment: "jsdom",
			include: testFiles,
		},
	});
}

export function defineNodeTestConfig() {
	return defineConfig({
		test: {
			environment: "node",
			include: testFiles,
		},
	});
}
