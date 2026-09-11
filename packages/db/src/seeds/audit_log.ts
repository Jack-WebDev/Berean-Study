import { auditLog } from "../schema/audit_log";
import {
	createdAt,
	db,
	faker,
	rows,
	type SeedContext,
	save,
	textId,
} from "./utils";
export async function seedAuditLog(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const inserted = await db
		.insert(auditLog)
		.values(
			rows(count, (i) => ({
				actorUserId: textId(context, "users", i),
				action: "seeded",
				targetType: "seed",
				targetId: faker.string.uuid(),
				details: { seed: true, index: i },
				occurredAt: createdAt(),
			})),
		)
		.returning({ id: auditLog.id });
	save(
		context,
		"auditLog",
		inserted.map(({ id }) => id),
	);
	return;
}
