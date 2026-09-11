import { userPreferences } from "../schema/user_preferences";
import { db, numberId, rows, type SeedContext, textId } from "./utils";
export async function seedUserPreferences(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(userPreferences).values(
		rows(count, (i) => ({
			userId: textId(context, "users", i),
			preferredCanonTraditionId: numberId(context, "canonTraditions", i),
			preferredTranslationId: numberId(context, "translations", i),
		})),
	);
	return;
}
