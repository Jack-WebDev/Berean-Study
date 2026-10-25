import { queryOptions } from "@tanstack/react-query";

import { getNotificationPreferences } from "@/functions/notification-preferences";

import { notificationPreferenceKeys } from "./keys";

export const notificationPreferencesQueryOptions = () =>
	queryOptions({
		queryKey: notificationPreferenceKeys.all,
		queryFn: () => getNotificationPreferences(),
	});
