import { defineNodeTestConfig } from "@berean-study/testkit/vitest";
import { mergeConfig } from "vitest/config";

// These tests share one real database, and some touch every account, so test
// files take turns rather than changing the data underneath each other.
export default mergeConfig(defineNodeTestConfig(), {
	test: { fileParallelism: false },
});
