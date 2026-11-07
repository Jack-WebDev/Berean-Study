import { queryOptions } from "@tanstack/react-query";

import {
	getAdminOverview,
	getStaffQueueCounts,
} from "@/functions/staff-queues";

import { staffQueueKeys } from "./keys";

export const staffQueueCountsQueryOptions = () =>
	queryOptions({
		queryKey: staffQueueKeys.counts(),
		queryFn: () => getStaffQueueCounts(),
		// These are glanceable sidebar counts, so being a minute behind is fine.
		staleTime: 60_000,
	});

export const adminOverviewQueryOptions = () =>
	queryOptions({
		queryKey: staffQueueKeys.overview(),
		queryFn: () => getAdminOverview(),
	});
