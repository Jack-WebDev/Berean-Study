import { editorialChecks } from "../schema/editorial_checks";
import {
	createdAt,
	db,
	faker,
	numberId,
	rows,
	type SeedContext,
	textId,
} from "./utils";
export async function seedEditorialChecks(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(editorialChecks).values(
		rows(count, (i) => ({
			contentRevisionId: numberId(context, "contentRevisions", i),
			editorialChecklistId: numberId(context, "editorialChecklists", i),
			checkedByUserId: textId(context, "users", i),
			result: faker.helpers.arrayElement([
				"passed",
				"failed",
				"not_applicable",
			]),
			checkedAt: createdAt(),
		})),
	);
	return;
}
