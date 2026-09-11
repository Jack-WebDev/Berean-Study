import { themePassages } from "../schema/theme_passages";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedThemePassages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(themePassages).values(
		rows(count, (i) => ({
			themeId: numberId(context, "themes", i),
			passageId: numberId(context, "passages", i),
		})),
	);
	return;
}
