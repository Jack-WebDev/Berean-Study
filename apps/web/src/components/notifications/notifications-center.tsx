import { Button } from "@berean-study/ui/components/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	getNotificationInbox,
	markAllNotificationsRead,
	markNotificationRead,
} from "@/functions/notifications";

import { NotificationDetail } from "./notification-detail";
import { NotificationFilterBar, NotificationList } from "./notification-list";
import { NotificationOptions } from "./notification-options";
import type { Inbox, Notification, NotificationFilter } from "./types";

export function NotificationsCenter() {
	const [inbox, setInbox] = useState<Inbox | null>(null);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [filter, setFilter] = useState<NotificationFilter>("all");
	const [hasLoadError, setHasLoadError] = useState(false);
	const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

	useEffect(() => {
		void getNotificationInbox()
			.then(setInbox)
			.catch(() => setHasLoadError(true));
	}, []);

	const notifications = inbox
		? filter === "unread"
			? inbox.notifications.filter((notification) => !notification.readAt)
			: inbox.notifications
		: [];
	const selected =
		notifications.find((notification) => notification.id === selectedId) ??
		notifications[0];

	function selectNotification(notification: Notification) {
		setSelectedId(notification.id);
		if (notification.readAt || !inbox) return;

		setInbox((currentInbox) =>
			currentInbox
				? {
						...currentInbox,
						notifications: currentInbox.notifications.map((item) =>
							item.id === notification.id
								? { ...item, readAt: new Date() }
								: item,
						),
						unreadCount: Math.max(0, currentInbox.unreadCount - 1),
					}
				: currentInbox,
		);

		void markNotificationRead({ data: { id: notification.id } }).catch(() => {
			toast.error("Unable to mark the notification as read.");
		});
	}

	async function markAllRead() {
		if (!inbox || inbox.unreadCount === 0 || isMarkingAllRead) return;
		setIsMarkingAllRead(true);

		try {
			await markAllNotificationsRead();
			setInbox((currentInbox) =>
				currentInbox
					? {
							...currentInbox,
							notifications: currentInbox.notifications.map((notification) => ({
								...notification,
								readAt: notification.readAt ?? new Date(),
							})),
							unreadCount: 0,
						}
					: currentInbox,
			);
		} catch {
			toast.error("Unable to mark notifications as read.");
		} finally {
			setIsMarkingAllRead(false);
		}
	}

	return (
		<div className="min-h-full bg-background px-2.5 py-[18px]">
			<header className="mb-5.5 flex items-start justify-between px-3">
				<div>
					<h1 className="font-serif text-[28px] leading-[34px] tracking-[-0.035em]">
						Notifications
					</h1>
					<p className="mt-[5px] text-[13px] text-muted-foreground">
						Stay up to date with your account, activity, and the latest from
						Berean Study.
					</p>
				</div>
				<div className="flex items-center gap-3 pt-[10px]">
					<Button
						className="h-[38px] rounded-[9px] px-[14px] text-[12px]"
						disabled={!inbox || inbox.unreadCount === 0 || isMarkingAllRead}
						onClick={markAllRead}
						variant="outline"
					>
						Mark all as read
					</Button>
					<NotificationOptions />
				</div>
			</header>
			<section className="grid min-h-[660px] overflow-hidden rounded-[14px] border border-border/70 bg-card shadow-sm lg:grid-cols-[380px_minmax(0,1fr)]">
				<aside className="flex min-h-0 flex-col border-border/70 border-r">
					<NotificationFilterBar
						filter={filter}
						onFilterChange={setFilter}
						unreadCount={inbox?.unreadCount ?? 0}
					/>
					<NotificationList
						hasLoadError={hasLoadError}
						isLoading={inbox === null && !hasLoadError}
						notifications={notifications}
						onSelect={selectNotification}
						selectedId={selected?.id ?? null}
					/>
				</aside>
				<NotificationDetail notification={selected} />
			</section>
		</div>
	);
}
