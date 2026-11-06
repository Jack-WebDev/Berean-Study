import { applyScriptureCatalogue } from "../scripture-setup";
import { db, type SeedContext, save } from "./utils";

export async function seedScriptureCatalogue(
	context: SeedContext,
): Promise<void> {
	const ids = await applyScriptureCatalogue(db);
	save(context, "books", ids.bookIds);
	save(context, "canonTraditions", ids.canonIds);
	save(context, "translations", ids.translationIds);
	save(context, "versificationSystems", [ids.versificationId]);
}
