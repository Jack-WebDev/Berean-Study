import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import type { DbExecutor } from "./db-executor";
import { GovernanceError } from "./governance-error";
import { user } from "./schema/auth";
import { contentItems } from "./schema/content_items";
import { researchNoteSources } from "./schema/research_note_sources";
import { researchNotes } from "./schema/research_notes";
import { sources } from "./schema/sources";
import { resolveScriptureReference } from "./scripture-reference";

const NOTE_LIST_LIMIT = 100;

/** Staff's shared working notes, newest first, optionally narrowed by a search. */
export async function listResearchNotes(
	client: DbExecutor,
	filter: { bookSlug?: string; search?: string },
) {
	const search = filter.search?.trim();
	const pattern = search ? `%${search.replace(/[%_\\]/g, "\\$&")}%` : null;
	const notes = await client
		.select({
			authorName: user.name,
			authorUserId: researchNotes.createdByUserId,
			content: researchNotes.content,
			id: researchNotes.id,
			reference: researchNotes.reference,
			updatedAt: researchNotes.updatedAt,
		})
		.from(researchNotes)
		.innerJoin(user, eq(user.id, researchNotes.createdByUserId))
		.where(
			and(
				pattern
					? or(
							ilike(researchNotes.reference, pattern),
							ilike(researchNotes.content, pattern),
						)
					: undefined,
				filter.bookSlug
					? sql`${researchNotes.bookId} = (select b.id from books b where b.slug = ${filter.bookSlug})`
					: undefined,
			),
		)
		.orderBy(desc(researchNotes.updatedAt), desc(researchNotes.id))
		.limit(NOTE_LIST_LIMIT);

	const links =
		notes.length > 0
			? await client
					.select({
						locator: researchNoteSources.locator,
						noteId: researchNoteSources.researchNoteId,
						sourceId: researchNoteSources.sourceId,
						status: sources.status,
						title: contentItems.title,
					})
					.from(researchNoteSources)
					.innerJoin(sources, eq(sources.id, researchNoteSources.sourceId))
					.leftJoin(
						contentItems,
						and(
							eq(contentItems.kind, "source"),
							eq(contentItems.scopeKey, sql`${sources.id}::text`),
						),
					)
					.where(
						inArray(
							researchNoteSources.researchNoteId,
							notes.map(({ id }) => id),
						),
					)
			: [];

	return notes.map((note) => ({
		...note,
		sources: links
			.filter(({ noteId }) => noteId === note.id)
			.map(({ locator, sourceId, status, title }) => ({
				locator,
				sourceId,
				status,
				title: title ?? "Untitled source",
			})),
	}));
}

/** Creates a note, or replaces one, including which sources it draws on. */
export async function saveResearchNote(
	client: DbExecutor,
	input: {
		actorUserId: string;
		content: string;
		id?: number;
		reference: string;
		sources: { locator: string; sourceId: number }[];
	},
) {
	const content = input.content.trim();
	const reference = input.reference.trim();
	if (!content) throw new GovernanceError("Write the note first.");
	if (!reference) throw new GovernanceError("Say which passage this is about.");
	const { bookId } = await resolveScriptureReference(client, reference);

	return client.transaction(async (tx) => {
		const existingLinks = input.id
			? await tx
					.select({ sourceId: researchNoteSources.sourceId })
					.from(researchNoteSources)
					.where(eq(researchNoteSources.researchNoteId, input.id))
			: [];
		const kept = new Set(existingLinks.map(({ sourceId }) => sourceId));
		const newIds = [
			...new Set(input.sources.map(({ sourceId }) => sourceId)),
		].filter((id) => !kept.has(id));
		if (newIds.length > 0) {
			const usable = await tx
				.select({ id: sources.id })
				.from(sources)
				.where(and(inArray(sources.id, newIds), eq(sources.status, "active")));
			if (usable.length !== newIds.length) {
				throw new GovernanceError(
					"A source here has been retired or merged, so it can't be added.",
				);
			}
		}

		let noteId = input.id;
		if (noteId) {
			const updated = await tx
				.update(researchNotes)
				.set({ bookId, content, reference, updatedAt: new Date() })
				.where(eq(researchNotes.id, noteId))
				.returning({ id: researchNotes.id });
			if (updated.length === 0) {
				throw new GovernanceError("This note no longer exists.");
			}
			await tx
				.delete(researchNoteSources)
				.where(eq(researchNoteSources.researchNoteId, noteId));
		} else {
			const [created] = await tx
				.insert(researchNotes)
				.values({
					bookId,
					content,
					createdByUserId: input.actorUserId,
					reference,
				})
				.returning({ id: researchNotes.id });
			if (!created) throw new Error("Could not save the note.");
			noteId = created.id;
		}

		const unique = new Map(
			input.sources.map((link) => [link.sourceId, link.locator.trim()]),
		);
		if (unique.size > 0) {
			await tx.insert(researchNoteSources).values(
				[...unique].map(([sourceId, locator]) => ({
					locator: locator || null,
					researchNoteId: noteId,
					sourceId,
				})),
			);
		}
		return noteId;
	});
}

/** People can work on each other's notes, but only the author can throw one away. */
export async function deleteResearchNote(
	client: DbExecutor,
	input: { actorUserId: string; id: number },
) {
	await client.transaction(async (tx) => {
		const [note] = await tx
			.select({ authorUserId: researchNotes.createdByUserId })
			.from(researchNotes)
			.where(eq(researchNotes.id, input.id));
		if (!note) throw new GovernanceError("This note no longer exists.");
		if (note.authorUserId !== input.actorUserId) {
			throw new GovernanceError(
				"Only the person who wrote this note can delete it.",
			);
		}
		await tx
			.delete(researchNoteSources)
			.where(eq(researchNoteSources.researchNoteId, input.id));
		await tx.delete(researchNotes).where(eq(researchNotes.id, input.id));
	});
}
