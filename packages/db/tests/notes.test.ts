import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool } from "../src";
import { getNote, saveNote } from "../src/notes";
import { user } from "../src/schema/auth";

const describeWithDatabase = process.env.DATABASE_URL
	? describe
	: describe.skip;

describeWithDatabase("note saves", () => {
	it("rolls back note fields and tags when tag assignment fails", async () => {
		const suffix = randomUUID();
		const userId = `note-save-test-${suffix}`;
		const failureConstraintName = `note_save_rollback_${suffix.replaceAll("-", "")}`;
		let constraintAdded = false;

		try {
			await db.insert(user).values({
				email: `note-save-test-${suffix}@example.test`,
				id: userId,
				name: "Note save test user",
			});

			const note = await saveNote(db, userId, {
				content: "Original content",
				tags: ["Original tag"],
				title: "Original title",
			});
			if (!note) throw new Error("Unable to create test note.");

			await db.execute(
				sql.raw(
					`ALTER TABLE note_tag_assignments ADD CONSTRAINT ${failureConstraintName} CHECK (note_id <> ${note.id}) NOT VALID`,
				),
			);
			constraintAdded = true;

			await expect(
				saveNote(db, userId, {
					content: "Updated content",
					id: note.id,
					tags: ["Updated tag"],
					title: "Updated title",
				}),
			).rejects.toThrow();

			const savedNote = await getNote(db, userId, note.id);
			expect(savedNote).toMatchObject({
				content: "Original content",
				tags: [{ name: "Original tag" }],
				title: "Original title",
			});
		} finally {
			if (constraintAdded) {
				await db.execute(
					sql.raw(
						`ALTER TABLE note_tag_assignments DROP CONSTRAINT ${failureConstraintName}`,
					),
				);
			}
			await db.delete(user).where(eq(user.id, userId));
		}
	});
});

afterAll(async () => {
	await pool.end();
});
