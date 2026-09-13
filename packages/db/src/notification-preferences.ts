export const notificationPreferenceKeys = [
	"email",
	"push",
	"comments",
	"updates",
	"resources",
	"replies",
	"mentions",
	"reports",
	"security",
	"account",
] as const;

export type NotificationPreferenceKey =
	(typeof notificationPreferenceKeys)[number];

export type NotificationPreferences = Record<
	NotificationPreferenceKey,
	boolean
>;

export const defaultNotificationPreferences: NotificationPreferences = {
	email: false,
	push: false,
	comments: false,
	updates: false,
	resources: false,
	replies: false,
	mentions: false,
	reports: false,
	security: false,
	account: false,
};

export function shouldDeliverEmailNotification(
	preferences: NotificationPreferences,
	type: Exclude<NotificationPreferenceKey, "email" | "push">,
) {
	return preferences.email && preferences[type];
}
