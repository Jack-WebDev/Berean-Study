import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { BellIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
	getRecentNotifications,
	markNotificationRead,
} from "@/functions/notifications";

type RecentNotifications = Awaited<ReturnType<typeof getRecentNotifications>>;

export function NotificationMenu() {
	const [inbox, setInbox] = useState<RecentNotifications | null>(null);
	const [hasLoadError, setHasLoadError] = useState(false);

	useEffect(() => {
		void getRecentNotifications()
			.then(setInbox)
			.catch(() => setHasLoadError(true));
	}, []);

	function markRead(id: number) {
		if (!inbox) return;

		const notification = inbox.notifications.find((item) => item.id === id);
		if (!notification || notification.readAt) return;

		setInbox({
			...inbox,
			notifications: inbox.notifications.map((item) =>
				item.id === id ? { ...item, readAt: new Date() } : item,
			),
			unreadCount: inbox.unreadCount - 1,
		});
		void markNotificationRead({ data: { id } });
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={
							inbox?.unreadCount
								? `${inbox.unreadCount} unread notifications`
								: "Open notifications"
						}
						className="relative rounded-md text-foreground/80"
						size="icon"
						type="button"
						variant="ghost"
					/>
				}
			>
				<BellIcon aria-hidden="true" />
				{inbox && inbox.unreadCount > 0 ? (
					<span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 font-medium text-[10px] text-destructive-foreground leading-4">
						{inbox.unreadCount > 99 ? "99+" : inbox.unreadCount}
					</span>
				) : null}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-80 rounded-xl p-1.5"
				sideOffset={8}
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="px-3 py-2 font-medium text-foreground text-sm">
						Notifications
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{hasLoadError ? (
						<p className="px-3 py-5 text-center text-destructive text-sm">
							Unable to load notifications.
						</p>
					) : !inbox ? (
						<p className="px-3 py-5 text-center text-muted-foreground text-sm">
							Loading notifications…
						</p>
					) : inbox.notifications.length === 0 ? (
						<p className="px-3 py-5 text-center text-muted-foreground text-sm">
							You have no notifications yet.
						</p>
					) : (
						inbox.notifications.map((notification) => (
							<DropdownMenuItem
								className="items-start rounded-lg px-3 py-2.5"
								key={notification.id}
								onClick={() => markRead(notification.id)}
								render={
									notification.destination ? (
										<Link to={notification.destination as never} />
									) : undefined
								}
							>
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium text-sm">
										{notification.title}
									</span>
									<span className="mt-0.5 line-clamp-2 block text-muted-foreground text-xs">
										{notification.body}
									</span>
								</span>
								{notification.readAt ? null : (
									<span className="mt-1.5 size-2 rounded-full bg-accent" />
								)}
							</DropdownMenuItem>
						))
					)}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="justify-center rounded-lg px-3 py-2.5 font-medium text-sm"
						render={<Link to="/notifications" />}
					>
						View all notifications
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
