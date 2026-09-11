import { contributors } from "../schema/contributors";
import { db, rows, type SeedContext, textId } from "./utils";
export async function seedContributors(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db
		.insert(contributors)
		.values(rows(count, (i) => ({ userId: textId(context, "users", i) })));
	return;
}
