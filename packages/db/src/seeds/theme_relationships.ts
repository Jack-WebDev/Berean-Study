import { themeRelationships } from "../schema/theme_relationships";
import { db, distinctPair, rows, type SeedContext } from "./utils";
export async function seedThemeRelationships(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const values = rows(count, (i) => {
		const pair = distinctPair(context, "themes", i);
		return (
			pair && {
				sourceThemeId: pair[0],
				targetThemeId: pair[1],
				relationshipType: "related_to" as const,
			}
		);
	}).filter(
		(
			value,
		): value is {
			sourceThemeId: number;
			targetThemeId: number;
			relationshipType: "related_to";
		} => Boolean(value),
	);
	await db.insert(themeRelationships).values(values);
	return;
}
