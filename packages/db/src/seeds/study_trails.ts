import { studyTrails } from "../schema/study_trails";
import { createdAt, db, rows, type SeedContext, save, textId } from "./utils";
export async function seedStudyTrails(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(studyTrails)
		.values(
			rows(count, (i) => ({
				userId: textId(context, "users", i),
				title: `Seed Study Trail ${i + 1}`,
				createdAt: createdAt(),
				updatedAt: createdAt(),
			})),
		)
		.returning({ id: studyTrails.id });
	save(
		context,
		"studyTrails",
		inserted.map(({ id }) => id),
	);
	return;
}
