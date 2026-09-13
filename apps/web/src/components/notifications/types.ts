import type { getNotificationInbox } from "@/functions/notifications";

export type Inbox = Awaited<ReturnType<typeof getNotificationInbox>>;
export type Notification = Inbox["notifications"][number];
export type NotificationFilter = "all" | "unread";
