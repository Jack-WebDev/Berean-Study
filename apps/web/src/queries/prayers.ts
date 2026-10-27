import { queryOptions } from "@tanstack/react-query";

import {
	getPrayer,
	listPrayers,
	listPrayersReadyForReflection,
} from "@/functions/prayers";

import { prayerKeys } from "./keys";

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

export const prayersReadyForReflectionQueryOptions = () =>
	queryOptions({
		queryKey: prayerKeys.readyForReflection(),
		queryFn: () => listPrayersReadyForReflection(),
	});
