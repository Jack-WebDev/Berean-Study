import { applyAccessCatalogue } from "../access-setup";
import { db, pool } from "../index";

async function main() {
	await applyAccessCatalogue(db);
	console.log("Permissions and roles are up to date.");
}

void main()
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => pool.end());
