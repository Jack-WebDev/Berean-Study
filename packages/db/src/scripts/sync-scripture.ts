import { db, pool } from "../index";
import { applyScriptureCatalogue } from "../scripture-setup";

async function main() {
	await applyScriptureCatalogue(db);
	console.log("Books, canons and translations are up to date.");
}

void main()
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => pool.end());
