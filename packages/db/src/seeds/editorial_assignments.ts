import { editorialAssignments } from "../schema/editorial_assignments";
import {
	createdAt,
	db,
	numberId,
	rows,
	type SeedContext,
	save,
	textId,
} from "./utils";
export async function seedEditorialAssignments(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(editorialAssignments)
		.values(
			rows(count, (i) => ({
				contentRevisionId: numberId(context, "contentRevisions", i),
				assigneeUserId: textId(context, "users", i),
				assignedByUserId: textId(context, "users", i + 1),
				assignedAt: createdAt(),
			})),
		)
		.returning({ id: editorialAssignments.id });
	save(
		context,
		"editorialAssignments",
		inserted.map(({ id }) => id),
	);
	return;
}
