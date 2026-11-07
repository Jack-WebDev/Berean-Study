import type { db } from "./index";

/**
 * The database or an open transaction. Functions that accept this can join a
 * caller's transaction, so several changes succeed or fail together.
 */
export type DbExecutor = Pick<
	typeof db,
	| "delete"
	| "execute"
	| "insert"
	| "select"
	| "selectDistinct"
	| "selectDistinctOn"
	| "transaction"
	| "update"
>;
