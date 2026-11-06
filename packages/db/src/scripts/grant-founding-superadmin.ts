import { grantFoundingSuperadmin } from "../access-setup";
import { db, pool } from "../index";

async function main() {
	const email = process.argv.slice(2).find((arg) => arg.includes("@"));
	if (!email) {
		throw new Error(
			"Say which account to promote: pnpm db:superadmin:grant person@example.org",
		);
	}

	const result = await grantFoundingSuperadmin(db, email);
	console.log(
		result === "granted"
			? `${email} is now a Superadmin.`
			: `${email} is already a Superadmin.`,
	);
}

void main()
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => pool.end());
