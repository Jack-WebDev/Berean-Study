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

export const notificationTopicPreferenceKeys = [
	"comments",
	"updates",
	"resources",
	"replies",
	"mentions",
	"reports",
	"security",
	"account",
] as const;

export type NotificationTopicPreferenceKey =
	(typeof notificationTopicPreferenceKeys)[number];

export type EmailNotificationPreferences = Record<
	NotificationTopicPreferenceKey,
	boolean
>;

export type NotificationPreferences = Record<
	NotificationPreferenceKey,
	boolean
> & {
	emailTopics: EmailNotificationPreferences;
};

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
	emailTopics: {
		comments: false,
		updates: false,
		resources: false,
		replies: false,
		mentions: false,
		reports: false,
		security: false,
		account: false,
	},
};

export function shouldDeliverEmailNotification(
	preferences: NotificationPreferences,
	type: Exclude<NotificationPreferenceKey, "email" | "push">,
) {
	return preferences.email && preferences.emailTopics[type];
}
