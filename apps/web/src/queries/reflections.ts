import { queryOptions } from "@tanstack/react-query";

import { getReflection, listReflections } from "@/functions/reflections";

import { type ReflectionFilters, reflectionKeys } from "./keys";

export type { ReflectionFilters } from "./keys";

export const reflectionsQueryOptions = (filters: ReflectionFilters = {}) =>
	queryOptions({
		queryKey: reflectionKeys.list(filters),
		queryFn: () => listReflections({ data: filters }),
	});

export const reflectionQueryOptions = (id: number) =>
	queryOptions({
		queryKey: reflectionKeys.detail(id),
		queryFn: () => getReflection({ data: { id } }),
	});
