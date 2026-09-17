import { hashPassword } from "better-auth/crypto";
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

function emailLocalPart(
	firstName: string,
	lastName: string,
	middleName?: string,
): string {
	const normalize = (value: string) =>
		value
			.normalize("NFKD")
			.replace(/\p{Diacritic}/gu, "")
			.replace(/[^a-zA-Z0-9]/g, "")
			.toLowerCase();

	return `${normalize(firstName)}${normalize(lastName).slice(0, 2)}${middleName ? normalize(middleName).slice(0, 1) : ""}`;
}
export async function seedAuth(
	context: SeedContext,
	count = 50,
): Promise<void> {
	const usedEmails = new Set<string>();
	const users = rows(count, () => {
		let firstName: string;
		let middleName: string | undefined;
		let lastName: string;
		let email: string;

		do {
			firstName = faker.person.firstName();
			middleName =
				faker.number.int({ min: 0, max: 2 }) === 0
					? faker.person.firstName()
					: undefined;
			lastName = faker.person.lastName();
			email = `${emailLocalPart(firstName, lastName, middleName)}@example.com`;
		} while (usedEmails.has(email));

		usedEmails.add(email);

		return {
			id: faker.string.uuid(),
			name: [firstName, middleName, lastName]
				.filter((part): part is string => Boolean(part))
				.join(" "),
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
	const accounts = await Promise.all(
		rows(count, async (index) => {
			const userId = textId(context, "users", index);
			const email = users[index % users.length]?.email ?? "";
			return {
				id: faker.string.uuid(),
				// Better Auth looks for this exact local credential issuer when signing in.
				issuer: "local:credential",
				accountId: userId,
				providerId: "credential",
				userId,
				password: await hashPassword(email),
				createdAt: createdAt(),
				updatedAt: createdAt(),
			};
		}),
	);
	await db.insert(account).values(accounts);
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
