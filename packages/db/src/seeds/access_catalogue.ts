import { applyAccessCatalogue } from "../access-setup";
import { db, type SeedContext, save } from "./utils";

export async function seedAccessCatalogue(context: SeedContext): Promise<void> {
	save(context, "roles", await applyAccessCatalogue(db));
}
