import { afterAll, describe, expect, it } from "vitest";

import { pool } from "../src";
import { resolveScriptureReference } from "../src/scripture-reference";
import { applyScriptureCatalogue } from "../src/scripture-setup";
import { inRolledBackTransactionWithoutScripture } from "./governance-helpers";

afterAll(async () => {
	await pool.end();
});

describe("reading a typed reference", () => {
	it("finds the book however its name is written, as Find in Bible does", async () => {
		await inRolledBackTransactionWithoutScripture(async (tx) => {
			await applyScriptureCatalogue(tx);

			for (const typed of ["Rom. 8:28", "rom 8:28", "ROMANS 8:28"]) {
				expect((await resolveScriptureReference(tx, typed)).bookSlug).toBe(
					"romans",
				);
			}
			for (const typed of ["1 Jn. 2:1", "1jn 2:1", "1 John 2:1"]) {
				expect((await resolveScriptureReference(tx, typed)).bookSlug).toBe(
					"1-john",
				);
			}
			await expect(
				resolveScriptureReference(tx, "Hezekiah 1:1"),
			).rejects.toThrow('find a book called "Hezekiah"');
		});
	});
});
