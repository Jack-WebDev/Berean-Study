import { claimUsages } from "../schema/claim_usages";
import { db, numberId, rows, type SeedContext } from "./utils";
export async function seedClaimUsages(
	context: SeedContext,
	count = 50,
): Promise<void> {
	await db.insert(claimUsages).values(
		rows(count, (i) => ({
			claimId: numberId(context, "claims", i),
			contentRevisionId: numberId(context, "contentRevisions", i),
		})),
	);
	return;
}
