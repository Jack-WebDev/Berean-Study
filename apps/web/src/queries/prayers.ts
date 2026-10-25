import { queryOptions } from "@tanstack/react-query";

import {
	getPrayer,
	getPrayerReflection,
	listLibraryReflections,
	listPrayers,
} from "@/functions/prayers";

import { type LibraryReflectionFilters, prayerKeys } from "./keys";

export type { LibraryReflectionFilters } from "./keys";

export const prayersQueryOptions = () =>
	queryOptions({
		queryKey: prayerKeys.list(),
		queryFn: () => listPrayers(),
	});

export const prayerQueryOptions = (id: number) =>
	queryOptions({
		queryKey: prayerKeys.detail(id),
		queryFn: () => getPrayer({ data: { id } }),
	});

export const prayerReflectionQueryOptions = (
	prayerId: number,
	reflectionId: number,
) =>
	queryOptions({
		queryKey: prayerKeys.reflection(prayerId, reflectionId),
		queryFn: () => getPrayerReflection({ data: { prayerId, reflectionId } }),
	});

export const libraryReflectionsQueryOptions = (
	filters: LibraryReflectionFilters,
) =>
	queryOptions({
		queryKey: prayerKeys.libraryReflections(filters),
		queryFn: () => listLibraryReflections({ data: filters }),
	});
