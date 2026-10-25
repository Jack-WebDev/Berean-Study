import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import {
	getNotificationPage,
	getRecentNotifications,
} from "@/functions/notifications";

import { type NotificationPageParams, notificationKeys } from "./keys";

export type { NotificationPageParams } from "./keys";

export const recentNotificationsQueryOptions = () =>
	queryOptions({
		queryKey: notificationKeys.recent(),
		queryFn: () => getRecentNotifications(),
	});

/** Pages through notifications matching `params`, following each next cursor. */
export const notificationPagesQueryOptions = (
	params: Omit<NotificationPageParams, "cursor">,
) =>
	infiniteQueryOptions({
		queryKey: notificationKeys.page(params),
		queryFn: ({ pageParam }) =>
			getNotificationPage({ data: { ...params, cursor: pageParam } }),
		initialPageParam: undefined as NotificationPageParams["cursor"],
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});
