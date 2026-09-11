import { faker } from "@faker-js/faker";

import { db } from "../index";

export type SeedContext = {
	ids: Record<string, Array<number | string>>;
};

export function createSeedContext(): SeedContext {
	return { ids: {} };
}

export function numberId(
	context: SeedContext,
	key: string,
	index: number,
): number {
	const ids = context.ids[key];
	if (!ids?.length) {
		throw new Error(`Seed '${key}' must run before this seed.`);
	}

	return Number(ids[index % ids.length]);
}

export function textId(
	context: SeedContext,
	key: string,
	index: number,
): string {
	const ids = context.ids[key];
	if (!ids?.length) {
		throw new Error(`Seed '${key}' must run before this seed.`);
	}

	return String(ids[index % ids.length]);
}

export function rows<T>(count: number, factory: (index: number) => T): T[] {
	return Array.from({ length: count }, (_, index) => factory(index));
}

export function save(
	context: SeedContext,
	key: string,
	values: Array<number | string>,
): void {
	context.ids[key] = values;
}

export function sentence(): string {
	return faker.lorem.sentences({ min: 2, max: 4 });
}

export function createdAt(): Date {
	return faker.date.recent({ days: 90 });
}

export function futureDate(): Date {
	return faker.date.future({ years: 1 });
}

export function distinctPair(
	context: SeedContext,
	key: string,
	index: number,
): [number, number] | undefined {
	const ids = context.ids[key];
	if (!ids || ids.length < 2) return undefined;

	return [numberId(context, key, index), numberId(context, key, index + 1)];
}

export { db, faker };
