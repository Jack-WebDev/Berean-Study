import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { BellIcon, ChevronRightIcon, SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	getRecentNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from "@/functions/notifications";

import {
	categoryForKind,
	presentationForKind,
	relativeTime,
} from "./notifications/notification-utils";

type RecentNotifications = Awaited<ReturnType<typeof getRecentNotifications>>;
type DropdownFilter = "all" | "security" | "unread";

const dropdownFilters: Array<{ id: DropdownFilter; label: string }> = [
	{ id: "all", label: "All" },
	{ id: "unread", label: "Unread" },
	{ id: "security", label: "Security" },
];

export function NotificationMenu() {
	const [inbox, setInbox] = useState<RecentNotifications | null>(null);
	const [filter, setFilter] = useState<DropdownFilter>("all");
	const [hasLoadError, setHasLoadError] = useState(false);
	const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

	useEffect(() => {
		void getRecentNotifications()
			.then(setInbox)
			.catch(() => setHasLoadError(true));
	}, []);

	const visibleNotifications = inbox?.notifications.filter((notification) => {
		if (filter === "unread") return !notification.readAt;
		return filter === "security"
			? categoryForKind(notification.kind) === "security"
			: true;
	});

	function markRead(id: number) {
		if (!inbox) return;
		const notification = inbox.notifications.find((item) => item.id === id);
		if (!notification || notification.readAt) return;

		setInbox((current) =>
			current
				? {
						...current,
						notifications: current.notifications.map((item) =>
							item.id === id ? { ...item, readAt: new Date() } : item,
						),
						unreadCount: Math.max(0, current.unreadCount - 1),
					}
				: current,
		);
		void markNotificationRead({ data: { id } }).catch(() => {
			toast.error("Unable to mark the notification as read.");
		});
	}

	async function markAllRead() {
		if (!inbox || inbox.unreadCount === 0 || isMarkingAllRead) return;
		const previousInbox = inbox;
		setIsMarkingAllRead(true);
		setInbox({
			...inbox,
			notifications: inbox.notifications.map((notification) => ({
				...notification,
				readAt: notification.readAt ?? new Date(),
			})),
			unreadCount: 0,
		});

		try {
			await markAllNotificationsRead();
		} catch {
			setInbox(previousInbox);
			toast.error("Unable to mark notifications as read.");
		} finally {
			setIsMarkingAllRead(false);
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={
							inbox?.unreadCount
								? "Open notifications with unread items"
								: "Open notifications"
						}
						className="relative rounded-md text-[#17315a] hover:bg-[#faf4e9] dark:text-foreground dark:hover:bg-muted"
						size="icon"
						type="button"
						variant="ghost"
					/>
				}
			>
				<BellIcon
					aria-hidden="true"
					className="size-[19px]"
					strokeWidth={1.8}
				/>
				{inbox && inbox.unreadCount > 0 ? (
					<span className="absolute top-[7px] right-[7px] size-2 rounded-full border border-white bg-[#d9a646] dark:border-card" />
				) : null}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="relative mt-1 w-[min(34rem,calc(100vw-1.5rem))] overflow-visible rounded-[18px] border border-[#e9e2d5] bg-[#fffdf8] p-0 text-[#13294b] shadow-[0_16px_38px_rgba(39,54,69,0.16)] before:absolute before:top-[-7px] before:right-[13px] before:size-[14px] before:rotate-45 before:border-[#e9e2d5] before:border-t before:border-l before:bg-[#fffdf8] dark:border-border dark:bg-popover dark:text-popover-foreground dark:shadow-[0_16px_38px_rgba(0,0,0,0.38)] dark:before:border-border dark:before:bg-popover"
				sideOffset={12}
			>
				<div className="relative rounded-[18px] bg-[#fffdf8] px-5 pt-5 pb-3 dark:bg-popover">
					<div className="flex items-center justify-between gap-3">
						<h2 className="font-semibold text-[22px] tracking-[-0.03em]">
							Notifications
						</h2>
						<div className="flex items-center gap-3">
							<Button
								className="h-auto p-0 text-[#5e6980] text-[13px] underline underline-offset-2 hover:bg-transparent hover:text-[#13294b] dark:text-muted-foreground dark:hover:text-foreground"
								disabled={!inbox || inbox.unreadCount === 0 || isMarkingAllRead}
								onClick={markAllRead}
								variant="ghost"
							>
								Mark all read
							</Button>
							<Button
								aria-label="Notification settings"
								className="size-7 rounded-md text-[#65728a] hover:bg-[#f6efe3] hover:text-[#13294b] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
								render={<Link to="/account/notifications" />}
								size="icon-sm"
								variant="ghost"
							>
								<SettingsIcon aria-hidden="true" className="size-[19px]" />
							</Button>
						</div>
					</div>
					<fieldset
						aria-label="Filter notifications"
						className="mt-5 flex gap-2"
					>
						{dropdownFilters.map((item) => (
							<button
								aria-pressed={filter === item.id}
								className={[
									"h-10 rounded-full px-5 font-medium text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b68b3e]/50",
									filter === item.id
										? "bg-[#f7eddb] text-[#27334b] dark:bg-secondary dark:text-secondary-foreground"
										: "bg-[#f6f5f3] text-[#687287] hover:bg-[#f1eee9] dark:bg-muted dark:text-muted-foreground dark:hover:bg-secondary",
								].join(" ")}
								key={item.id}
								onClick={() => setFilter(item.id)}
								type="button"
							>
								{item.label}
							</button>
						))}
					</fieldset>
				</div>
				<DropdownMenuSeparator className="mx-5 bg-[#eee8de] dark:bg-border" />
				<div className="relative rounded-b-[18px] bg-[#fffdf8] px-5 dark:bg-popover">
					{hasLoadError ? (
						<DropdownMessage
							description="Please try again shortly."
							title="Notifications unavailable"
						/>
					) : !inbox ? (
						<DropdownSkeleton />
					) : visibleNotifications?.length === 0 ? (
						<DropdownMessage
							description={
								filter === "unread"
									? "You're all caught up."
									: "There’s nothing to show in this category."
							}
							title={
								filter === "all"
									? "No notifications yet"
									: `No ${filter} notifications`
							}
						/>
					) : (
						<ul>
							{visibleNotifications?.map((notification) => (
								<DropdownNotificationRow
									key={notification.id}
									notification={notification}
									onOpen={() => markRead(notification.id)}
								/>
							))}
						</ul>
					)}
					<DropdownMenuSeparator className="bg-[#eee8de] dark:bg-border" />
					<DropdownMenuItem
						className="my-3 flex h-12 justify-center rounded-[13px] bg-[#f8f1e6] font-semibold text-[#1b3155] text-[15px] hover:bg-[#f2e8d8] focus:bg-[#f2e8d8] dark:bg-secondary dark:text-secondary-foreground dark:focus:bg-muted dark:hover:bg-muted"
						render={<Link to="/notifications" />}
					>
						View all notifications{" "}
						<ChevronRightIcon aria-hidden="true" className="ml-auto size-5" />
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function DropdownNotificationRow({
	notification,
	onOpen,
}: {
	notification: RecentNotifications["notifications"][number];
	onOpen: () => void;
}) {
	const presentation = presentationForKind(notification.kind);
	const Icon = presentation.icon;
	const unread = !notification.readAt;
	return (
		<li className={unread ? "bg-[#fffaf0] dark:bg-amber-950/15" : ""}>
			<DropdownMenuItem
				className="relative min-h-[88px] items-start gap-4 rounded-none px-1 py-4 text-[#13294b] hover:bg-[#fcf8ef] focus:bg-[#fcf8ef] dark:text-foreground dark:focus:bg-muted dark:hover:bg-muted"
				onClick={onOpen}
				render={
					notification.destination ? (
						<Link to={notification.destination as never} />
					) : undefined
				}
			>
				<span
					className={`grid size-12 shrink-0 place-items-center rounded-full ${presentation.iconClassName}`}
				>
					<Icon aria-hidden="true" className="size-[23px]" strokeWidth={1.65} />
				</span>
				<span className="min-w-0 flex-1 pr-5">
					<span className="block font-semibold text-[16px] leading-5">
						{notification.title}
					</span>
					<span className="mt-1 line-clamp-2 block text-[#71809a] text-[14px] leading-[21px] dark:text-muted-foreground">
						{notification.body}
					</span>
				</span>
				<span className="absolute top-5 right-0 flex items-center gap-3 text-[#71809a] text-[13px] dark:text-muted-foreground">
					{relativeTime(notification.createdAt)}
					{unread ? (
						<span className="size-3 rounded-full bg-[#d9a646]" />
					) : null}
				</span>
			</DropdownMenuItem>
		</li>
	);
}

function DropdownMessage({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<div className="px-4 py-10 text-center">
			<p className="font-semibold text-[15px]">{title}</p>
			<p className="mt-1 text-[#71809a] text-[14px] dark:text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function DropdownSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-label="Loading notifications"
			className="space-y-4 py-5"
			role="status"
		>
			{Array.from({ length: 4 }, (_, index) => (
				<div className="flex gap-4" key={index}>
					<span className="size-12 animate-pulse rounded-full bg-[#f1ede6] dark:bg-muted" />
					<span className="flex flex-1 flex-col gap-2 py-1">
						<span className="h-3 w-3/5 animate-pulse rounded bg-[#f1ede6] dark:bg-muted" />
						<span className="h-3 animate-pulse rounded bg-[#f5f2ed] dark:bg-secondary" />
					</span>
				</div>
			))}
		</div>
	);
}
