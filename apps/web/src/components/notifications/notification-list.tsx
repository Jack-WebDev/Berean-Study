import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { BellIcon, ChevronDownIcon } from "lucide-react";

import {
	groupNotifications,
	iconForKind,
	listTime,
} from "./notification-utils";
import type { Notification, NotificationFilter } from "./types";

export function NotificationFilterBar({
	filter,
	onFilterChange,
	unreadCount,
}: {
	filter: NotificationFilter;
	onFilterChange: (filter: NotificationFilter) => void;
	unreadCount: number;
}) {
	return (
		<div className="flex h-[56px] shrink-0 items-center border-border/70 border-b px-[18px]">
			<button
				className={[
					"h-[28px] rounded-[8px] px-[11px] font-medium text-[12px] transition-colors",
					filter === "all"
						? "bg-muted text-foreground"
						: "text-muted-foreground hover:text-foreground",
				].join(" ")}
				onClick={() => onFilterChange("all")}
				type="button"
			>
				All
			</button>
			<button
				className={[
					"ml-[9px] flex h-[28px] items-center gap-[9px] rounded-[8px] px-[9px] font-medium text-[12px] transition-colors",
					filter === "unread" ? "bg-muted text-foreground" : "text-foreground",
				].join(" ")}
				onClick={() => onFilterChange("unread")}
				type="button"
			>
				Unread
				<span className="grid size-[21px] place-items-center rounded-full bg-muted text-[11px] tabular-nums">
					{unreadCount}
				</span>
			</button>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							className="ml-[25px] h-[28px] gap-[7px] px-0 text-[12px]"
							type="button"
							variant="ghost"
						/>
					}
				>
					Filter
					<ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-32 rounded-lg p-1" sideOffset={6}>
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={() => onFilterChange("all")}>
							All notifications
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onFilterChange("unread")}>
							Unread only
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

export function NotificationList({
	hasLoadError,
	isLoading,
	notifications,
	onSelect,
	selectedId,
}: {
	hasLoadError: boolean;
	isLoading: boolean;
	notifications: Notification[];
	onSelect: (notification: Notification) => void;
	selectedId: number | null;
}) {
	if (hasLoadError) {
		return (
			<NotificationEmptyState
				title="Notifications unavailable"
				description="Unable to load notifications. Please try again shortly."
			/>
		);
	}

	if (isLoading) return <NotificationListSkeleton />;
	if (notifications.length === 0) {
		return (
			<NotificationEmptyState
				icon
				title="All caught up"
				description="You have no notifications here."
			/>
		);
	}

	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			{groupNotifications(notifications).map((group) => (
				<div key={group.label}>
					<p className="px-[18px] pt-[13px] pb-[9px] text-[12px] text-muted-foreground">
						{group.label}
					</p>
					<ul>
						{group.notifications.map((notification) => (
							<NotificationRow
								key={notification.id}
								notification={notification}
								onSelect={onSelect}
								selected={notification.id === selectedId}
							/>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}

function NotificationRow({
	notification,
	onSelect,
	selected,
}: {
	notification: Notification;
	onSelect: (notification: Notification) => void;
	selected: boolean;
}) {
	const Icon = iconForKind(notification.kind);
	const unread = !notification.readAt;

	return (
		<li className="border-border/60 border-b last:border-b-0">
			<button
				className={[
					"relative flex w-full items-start gap-[13px] px-[18px] py-[12px] text-left transition-colors",
					selected ? "bg-[#edf4ff] dark:bg-blue-950/20" : "hover:bg-muted/35",
				].join(" ")}
				onClick={() => onSelect(notification)}
				type="button"
			>
				{selected ? (
					<span className="absolute inset-y-0 left-0 w-[2px] bg-[#5d91e8]" />
				) : null}
				<span
					className={[
						"grid size-[40px] shrink-0 place-items-center rounded-full",
						selected
							? "bg-[#e1edff] text-[#163768]"
							: "bg-muted/60 text-foreground",
					].join(" ")}
				>
					<Icon className="size-[20px]" strokeWidth={1.7} />
				</span>
				<span className="min-w-0 flex-1 pt-[1px]">
					<span className="flex items-start justify-between gap-2">
						<span
							className={[
								"truncate font-serif text-[13px] leading-[17px]",
								unread ? "font-semibold" : "",
							].join(" ")}
						>
							{notification.title}
						</span>
						<span
							className={[
								"mt-[5px] size-[8px] shrink-0 rounded-full",
								unread ? "bg-blue-600" : "bg-muted-foreground/25",
							].join(" ")}
						/>
					</span>
					<span className="mt-[3px] line-clamp-2 block pr-2 text-[12px] text-muted-foreground leading-[17px]">
						{notification.body}
					</span>
					<span className="mt-[3px] block text-[11px] text-muted-foreground">
						{listTime(notification.createdAt)}
					</span>
				</span>
			</button>
		</li>
	);
}

function NotificationEmptyState({
	description,
	icon = false,
	title,
}: {
	description: string;
	icon?: boolean;
	title: string;
}) {
	return (
		<Empty className="border-0">
			<EmptyHeader>
				{icon ? (
					<EmptyMedia variant="icon">
						<BellIcon aria-hidden="true" />
					</EmptyMedia>
				) : null}
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function NotificationListSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-label="Loading notifications"
			aria-live="polite"
			className="flex flex-col gap-4 p-[18px]"
			role="status"
		>
			{Array.from({ length: 5 }, (_, index) => (
				<div className="flex gap-3" key={index}>
					<Skeleton className="size-10 shrink-0 rounded-full" />
					<div className="flex flex-1 flex-col gap-2 pt-1">
						<Skeleton className="h-3 w-3/4" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-1/3" />
					</div>
				</div>
			))}
		</div>
	);
}
