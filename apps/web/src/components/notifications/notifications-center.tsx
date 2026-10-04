import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { Input } from "@berean-study/ui/components/input";
import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	EllipsisIcon,
	SearchIcon,
	SettingsIcon,
	ShieldIcon,
	UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	getNotificationPage,
	markAllNotificationsRead,
	markNotificationRead,
	markNotificationUnread,
} from "@/functions/notifications";

import {
	categoryForKind,
	groupNotifications,
	presentationForKind,
	relativeTime,
} from "./notification-utils";

type NotificationPage = Awaited<ReturnType<typeof getNotificationPage>>;
type Notification = NotificationPage["notifications"][number];
type NotificationFilter =
	| "all"
	| "community"
	| "reading"
	| "saved"
	| "security"
	| "unread";

const filters: Array<{
	id: NotificationFilter;
	icon?: typeof BookOpenIcon;
	label: string;
}> = [
	{ id: "all", label: "All" },
	{ id: "unread", label: "Unread" },
	{ id: "community", icon: UsersIcon, label: "Community" },
	{ id: "reading", icon: BookOpenIcon, label: "Reading" },
	{ id: "saved", label: "Saved" },
	{ id: "security", icon: ShieldIcon, label: "Security" },
];

export function NotificationsCenter() {
	const [page, setPage] = useState<NotificationPage | null>(null);
	const [filter, setFilter] = useState<NotificationFilter>("all");
	const [query, setQuery] = useState("");
	const [hasLoadError, setHasLoadError] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

	useEffect(() => {
		let current = true;
		setPage(null);
		setHasLoadError(false);
		void getNotificationPage({
			data: pageRequest(filter, query),
		})
			.then((nextPage) => {
				if (current) setPage(nextPage);
			})
			.catch(() => {
				if (current) setHasLoadError(true);
			});
		return () => {
			current = false;
		};
	}, [filter, query]);

	async function loadMore() {
		if (!page?.nextCursor || isLoadingMore) return;
		setIsLoadingMore(true);
		try {
			const nextPage = await getNotificationPage({
				data: pageRequest(filter, query, page.nextCursor),
			});
			setPage((current) =>
				current
					? {
							...nextPage,
							notifications: [
								...current.notifications,
								...nextPage.notifications,
							],
						}
					: current,
			);
		} catch {
			toast.error("Unable to load more notifications.");
		} finally {
			setIsLoadingMore(false);
		}
	}

	function updateReadState(notification: Notification, read: boolean) {
		setPage((current) => {
			if (!current) return current;
			const notifications = current.notifications
				.map((item) =>
					item.id === notification.id
						? { ...item, readAt: read ? new Date() : null }
						: item,
				)
				.filter(
					(item) => filter !== "unread" || !read || item.id !== notification.id,
				);
			return {
				...current,
				notifications,
				unreadCount: Math.max(0, current.unreadCount + (read ? -1 : 1)),
			};
		});
	}

	function restoreReadState(notification: Notification, read: boolean) {
		setPage((current) => {
			if (!current) return current;
			if (read) {
				return {
					...current,
					notifications:
						filter === "unread"
							? current.notifications.filter(
									(item) => item.id !== notification.id,
								)
							: current.notifications.map((item) =>
									item.id === notification.id
										? { ...item, readAt: new Date() }
										: item,
								),
					unreadCount: Math.max(0, current.unreadCount - 1),
				};
			}
			const restored = { ...notification, readAt: null };
			const exists = current.notifications.some(
				(item) => item.id === notification.id,
			);
			return {
				...current,
				notifications: exists
					? current.notifications.map((item) =>
							item.id === notification.id ? restored : item,
						)
					: [restored, ...current.notifications],
				unreadCount: current.unreadCount + 1,
			};
		});
	}

	function markRead(notification: Notification) {
		if (notification.readAt) return;
		updateReadState(notification, true);
		void markNotificationRead({ data: { id: notification.id } }).catch(() => {
			restoreReadState(notification, false);
			toast.error("Unable to mark the notification as read.");
		});
	}

	function markUnread(notification: Notification) {
		if (!notification.readAt) return;
		updateReadState(notification, false);
		void markNotificationUnread({ data: { id: notification.id } }).catch(() => {
			restoreReadState(notification, true);
			toast.error("Unable to mark the notification as unread.");
		});
	}

	async function markAllRead() {
		if (!page || page.unreadCount === 0 || isMarkingAllRead) return;
		const previousPage = page;
		setIsMarkingAllRead(true);
		setPage({
			...page,
			notifications:
				filter === "unread"
					? []
					: page.notifications.map((notification) => ({
							...notification,
							readAt: notification.readAt ?? new Date(),
						})),
			unreadCount: 0,
		});
		try {
			await markAllNotificationsRead();
		} catch {
			setPage(previousPage);
			toast.error("Unable to mark notifications as read.");
		} finally {
			setIsMarkingAllRead(false);
		}
	}

	return (
		<main className="min-h-full bg-[#fffdf8] px-4 py-7 text-[#13294b] sm:px-7 lg:px-10 lg:py-8 dark:bg-background dark:text-foreground">
			<div className="mx-auto w-full max-w-[1160px]">
				<header className="mb-6">
					<h1 className="font-serif text-[34px] leading-tight tracking-[-0.04em] sm:text-[38px]">
						Notifications
					</h1>
					<p className="mt-1.5 max-w-2xl text-[#71809a] text-[14px] sm:text-[15px] dark:text-muted-foreground">
						Stay up to date with your reading, saved content, community
						activity, and account updates.
					</p>
				</header>
				<section className="overflow-hidden rounded-[14px] border border-[#e9e4db] bg-white shadow-[0_2px_10px_rgba(26,47,69,0.035)] dark:border-border dark:bg-card dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
					<NotificationToolbar
						filter={filter}
						isMarkingAllRead={isMarkingAllRead}
						onFilterChange={setFilter}
						onMarkAllRead={markAllRead}
						onQueryChange={setQuery}
						query={query}
						totalCount={page?.totalCount ?? 0}
						unreadCount={page?.unreadCount ?? 0}
						categoryCounts={page?.categoryCounts}
					/>
					<NotificationFeed
						hasLoadError={hasLoadError}
						isLoading={page === null && !hasLoadError}
						notifications={page?.notifications ?? []}
						onMarkRead={markRead}
						onMarkUnread={markUnread}
						query={query}
					/>
					{page?.nextCursor ? (
						<div className="flex justify-center border-[#eee9e1] border-t py-5 dark:border-border">
							<Button
								className="h-9 rounded-lg border-[#ded4c4] px-5 text-[#294363] dark:border-border dark:text-foreground"
								disabled={isLoadingMore}
								onClick={loadMore}
								variant="outline"
							>
								{isLoadingMore ? "Loading…" : "Load more"}
							</Button>
						</div>
					) : null}
				</section>
			</div>
		</main>
	);
}

function NotificationToolbar({
	categoryCounts,
	filter,
	isMarkingAllRead,
	onFilterChange,
	onMarkAllRead,
	onQueryChange,
	query,
	totalCount,
	unreadCount,
}: {
	categoryCounts: NotificationPage["categoryCounts"] | undefined;
	filter: NotificationFilter;
	isMarkingAllRead: boolean;
	onFilterChange: (filter: NotificationFilter) => void;
	onMarkAllRead: () => void;
	onQueryChange: (query: string) => void;
	query: string;
	totalCount: number;
	unreadCount: number;
}) {
	return (
		<div className="flex flex-col gap-4 border-[#eee9e1] border-b px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-4 dark:border-border">
			<fieldset
				aria-label="Filter notifications"
				className="flex min-w-0 gap-1 overflow-x-auto"
			>
				{filters.map((item) => {
					const Icon = item.icon;
					const count =
						item.id === "all"
							? totalCount
							: item.id === "unread"
								? unreadCount
								: categoryCounts?.[item.id];
					return (
						<button
							aria-pressed={filter === item.id}
							className={[
								"flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 font-medium text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b68b3e]/50",
								filter === item.id
									? "bg-[#f8eedb] text-[#7b5924] dark:bg-secondary dark:text-secondary-foreground"
									: "text-[#71809a] hover:bg-[#faf7f0] hover:text-[#273d5a] dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground",
							].join(" ")}
							key={item.id}
							onClick={() => onFilterChange(item.id)}
							type="button"
						>
							{Icon ? (
								<Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
							) : null}
							{item.label}
							{count === undefined ? null : (
								<span className="tabular-nums">({count})</span>
							)}
						</button>
					);
				})}
			</fieldset>
			<div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
				<div className="relative min-w-[180px] flex-1 lg:w-[180px] lg:flex-none">
					<SearchIcon
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8190a5] dark:text-muted-foreground"
					/>
					<Input
						aria-label="Search notifications"
						className="h-9 rounded-lg border-[#e5dfd5] bg-white pl-9 text-[#203958] text-[12px] placeholder:text-[#8692a2] dark:border-input dark:bg-input/30 dark:text-foreground dark:placeholder:text-muted-foreground"
						onChange={(event) => onQueryChange(event.target.value)}
						placeholder="Search notifications..."
						value={query}
					/>
				</div>
				<Button
					className="h-9 rounded-lg border-[#e5dfd5] px-3 text-[#294363] text-[12px] dark:border-border dark:text-foreground"
					disabled={unreadCount === 0 || isMarkingAllRead}
					onClick={onMarkAllRead}
					variant="outline"
				>
					Mark all as read
				</Button>
				<Button
					className="h-9 rounded-lg border-[#e5dfd5] px-3 text-[#294363] text-[12px] dark:border-border dark:text-foreground"
					render={<Link to="/account/notifications" />}
					variant="outline"
				>
					<SettingsIcon aria-hidden="true" /> Notification settings
				</Button>
			</div>
		</div>
	);
}

function NotificationFeed({
	hasLoadError,
	isLoading,
	notifications,
	onMarkRead,
	onMarkUnread,
	query,
}: {
	hasLoadError: boolean;
	isLoading: boolean;
	notifications: Notification[];
	onMarkRead: (notification: Notification) => void;
	onMarkUnread: (notification: Notification) => void;
	query: string;
}) {
	if (hasLoadError)
		return (
			<FeedMessage
				description="Please try again shortly."
				title="Notifications unavailable"
			/>
		);
	if (isLoading) return <FeedSkeleton />;
	if (notifications.length === 0)
		return (
			<FeedMessage
				description={
					query
						? "Try a different search."
						: "There’s nothing to show in this category."
				}
				title={query ? "No notifications found" : "No notifications yet"}
			/>
		);
	return (
		<div>
			{groupNotifications(notifications).map((group) => (
				<section className="px-3 pt-3 pb-2 sm:px-4" key={group.label}>
					<h2 className="px-1 pb-2 font-serif text-[#273d5a] text-[16px] dark:text-foreground">
						{group.label}
					</h2>
					<ul className="overflow-hidden rounded-[11px] border border-[#eee9e1] dark:border-border">
						{group.notifications.map((notification) => (
							<NotificationRow
								key={notification.id}
								notification={notification}
								onMarkRead={onMarkRead}
								onMarkUnread={onMarkUnread}
							/>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}

function NotificationRow({
	notification,
	onMarkRead,
	onMarkUnread,
}: {
	notification: Notification;
	onMarkRead: (notification: Notification) => void;
	onMarkUnread: (notification: Notification) => void;
}) {
	const unread = !notification.readAt;
	const presentation = presentationForKind(notification.kind);
	const Icon = presentation.icon;
	const action = actionForCategory(categoryForKind(notification.kind));
	const content = (
		<>
			<span
				className={`mt-1 size-2 shrink-0 rounded-full ${unread ? "bg-[#d3a146]" : "bg-transparent"}`}
			/>
			<span
				className={`grid size-11 shrink-0 place-items-center rounded-full ${presentation.iconClassName}`}
			>
				<Icon aria-hidden="true" className="size-5" strokeWidth={1.65} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block font-semibold text-[#17335a] text-[13px] leading-5 dark:text-foreground">
					{notification.title}
				</span>
				<span className="mt-0.5 line-clamp-2 block text-[#71809a] text-[12px] leading-[18px] dark:text-muted-foreground">
					{notification.body}
				</span>
				<span
					className={`mt-2 inline-flex rounded-full px-3 py-0.5 font-medium text-[10px] ${presentation.badgeClassName}`}
				>
					{presentation.label}
				</span>
			</span>
		</>
	);
	return (
		<li
			className={
				unread ? "bg-[#fffaf0] dark:bg-amber-950/15" : "bg-white dark:bg-card"
			}
		>
			<article className="relative flex min-h-[102px] items-start gap-3 border-[#eee9e1] border-b px-3 py-3 last:border-b-0 sm:px-4 dark:border-border">
				<div className="flex min-w-0 flex-1 items-start gap-3">
					{notification.destination ? (
						<Link
							className="flex min-w-0 flex-1 items-start gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b68b3e]/50 dark:focus-visible:ring-ring"
							onClick={() => onMarkRead(notification)}
							to={notification.destination as never}
						>
							{content}
						</Link>
					) : (
						<button
							className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b68b3e]/50 dark:focus-visible:ring-ring"
							onClick={() => onMarkRead(notification)}
							type="button"
						>
							{content}
						</button>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-2 pt-1">
					<time className="hidden text-[#71809a] text-[11px] sm:block dark:text-muted-foreground">
						{relativeTime(notification.createdAt)}
					</time>
					{notification.destination ? (
						<Button
							className="h-8 rounded-lg border-[#decfae] px-3 text-[#294363] text-[11px] dark:border-border dark:text-foreground"
							onClick={() => onMarkRead(notification)}
							render={<Link to={notification.destination as never} />}
							variant="outline"
						>
							{action}
						</Button>
					) : null}
					<NotificationRowOptions
						notification={notification}
						onMarkRead={onMarkRead}
						onMarkUnread={onMarkUnread}
					/>
				</div>
			</article>
		</li>
	);
}

function NotificationRowOptions({
	notification,
	onMarkRead,
	onMarkUnread,
}: {
	notification: Notification;
	onMarkRead: (notification: Notification) => void;
	onMarkUnread: (notification: Notification) => void;
}) {
	const unread = !notification.readAt;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={`Options for ${notification.title}`}
						className="size-8 rounded-lg text-[#65728a] dark:text-muted-foreground"
						size="icon-sm"
						variant="ghost"
					/>
				}
			>
				<EllipsisIcon aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-36 rounded-lg border-[#e9e2d5] bg-[#fffdf8] p-1 text-[#17335a] dark:border-border dark:bg-popover dark:text-popover-foreground"
			>
				<DropdownMenuItem
					className="rounded-md"
					onClick={() =>
						unread ? onMarkRead(notification) : onMarkUnread(notification)
					}
				>
					{unread ? "Mark as read" : "Mark as unread"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function FeedMessage({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<div className="px-6 py-20 text-center">
			<p className="font-serif text-[#273d5a] text-[19px] dark:text-foreground">
				{title}
			</p>
			<p className="mt-2 text-[#71809a] text-[13px] dark:text-muted-foreground">
				{description}
			</p>
		</div>
	);
}
function FeedSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-label="Loading notifications"
			className="space-y-3 p-4"
			role="status"
		>
			{Array.from({ length: 5 }, (_, index) => (
				<div
					className="flex h-24 animate-pulse items-start gap-3 rounded-[11px] border border-[#eee9e1] p-4 dark:border-border"
					key={index}
				>
					<span className="mt-1 size-2 rounded-full bg-[#f0e9dc] dark:bg-muted" />
					<span className="size-11 rounded-full bg-[#f2eee7] dark:bg-muted" />
					<span className="flex flex-1 flex-col gap-2">
						<span className="h-3 w-2/5 rounded bg-[#f2eee7] dark:bg-muted" />
						<span className="h-3 w-4/5 rounded bg-[#f6f3ee] dark:bg-secondary" />
						<span className="h-3 w-1/4 rounded bg-[#f6f3ee] dark:bg-secondary" />
					</span>
				</div>
			))}
		</div>
	);
}

function actionForCategory(category: ReturnType<typeof categoryForKind>) {
	switch (category) {
		case "security":
			return "Review";
		case "reading":
			return "Open Reading";
		case "saved":
			return "View collection";
		case "study":
			return "Read now";
		case "prayer":
			return "View reflections";
		default:
			return "View";
	}
}
function pageRequest(
	filter: NotificationFilter,
	query: string,
	cursor?: NonNullable<NotificationPage["nextCursor"]>,
) {
	return {
		category: filter === "all" || filter === "unread" ? undefined : filter,
		cursor,
		limit: 20,
		query: query || undefined,
		unreadOnly: filter === "unread",
	};
}
