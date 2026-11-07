import { defineNodeTestConfig } from "@berean-study/testkit/vitest";
import { mergeConfig } from "vitest/config";

// These tests share one real database, and some touch every account, so test
// files take turns rather than changing the data underneath each other.
//
// Each test also rebuilds the catalogues in a transaction, which takes a while on a
// busy machine. A test that times out keeps running and holding its locks, so the
// tests after it time out too. A longer limit still catches a real hang.
export default mergeConfig(defineNodeTestConfig(), {
	test: { fileParallelism: false, testTimeout: 30_000 },
});
