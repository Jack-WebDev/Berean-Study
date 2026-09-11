import { account, session, user, verification } from "../schema/auth";
import {
	createdAt,
	db,
	faker,
	futureDate,
	rows,
	type SeedContext,
	save,
	textId,
} from "./utils";
export async function seedAuth(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const users = rows(count, (index) => {
		const email = `seed-${index}-${faker.string.alphanumeric(10)}@example.com`;
		return {
			id: faker.string.uuid(),
			name: faker.person.fullName(),
			email,
			emailVerified: true,
			image: faker.image.avatar(),
			createdAt: createdAt(),
			updatedAt: createdAt(),
		};
	});
	await db.insert(user).values(users);
	save(
		context,
		"users",
		users.map(({ id }) => id),
	);

	await db.insert(session).values(
		rows(count, (index) => ({
			id: faker.string.uuid(),
			expiresAt: futureDate(),
			token: faker.string.uuid(),
			userId: textId(context, "users", index),
			createdAt: createdAt(),
			updatedAt: createdAt(),
			ipAddress: faker.internet.ip(),
			userAgent: faker.internet.userAgent(),
		})),
	);
	await db.insert(account).values(
		rows(count, (index) => {
			const userId = textId(context, "users", index);
			const email = users[index % users.length]?.email ?? "";
			return {
				id: faker.string.uuid(),
				issuer: "berean-study",
				accountId: userId,
				providerId: "credential",
				userId,
				password: email,
				createdAt: createdAt(),
				updatedAt: createdAt(),
			};
		}),
	);
	await db.insert(verification).values(
		rows(count, (index) => ({
			id: faker.string.uuid(),
			identifier: users[index % users.length]?.email ?? faker.internet.email(),
			value: faker.string.alphanumeric(32),
			expiresAt: futureDate(),
			createdAt: createdAt(),
			updatedAt: createdAt(),
		})),
	);
	return;
}
