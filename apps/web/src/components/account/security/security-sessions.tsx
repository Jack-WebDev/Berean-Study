import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import {
	ChevronDownIcon,
	EllipsisVerticalIcon,
	LaptopIcon,
	MonitorIcon,
} from "lucide-react";

import { SecurityPanelHeader } from "./security-panel";
import type { SecuritySession } from "./types";

export function ActiveSessionsPanel({
	sessions,
	currentSessionId,
	isLoading,
	showAll,
	onShowAllChange,
	onRevoke,
	onRevokeAll,
}: {
	sessions: SecuritySession[];
	currentSessionId?: string;
	isLoading: boolean;
	showAll: boolean;
	onShowAllChange: () => void;
	onRevoke: (token: string) => Promise<void>;
	onRevokeAll: () => void;
}) {
	const visibleSessions = showAll ? sessions : sessions.slice(0, 3);

	return (
		<section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
			<SecurityPanelHeader
				action="Sign out all"
				description="These are the devices currently signed in to your account."
				icon={MonitorIcon}
				onAction={onRevokeAll}
				title="Active sessions"
			/>
			<div className="mt-4 overflow-hidden rounded-lg border border-border/60">
				{isLoading ? (
					<p className="px-3 py-4 text-muted-foreground text-xs">
						Loading sessions…
					</p>
				) : visibleSessions.length > 0 ? (
					visibleSessions.map((session) => (
						<SessionRow
							current={session.id === currentSessionId}
							key={session.id}
							onRevoke={onRevoke}
							session={session}
						/>
					))
				) : (
					<p className="px-3 py-4 text-muted-foreground text-xs">
						No active sessions found.
					</p>
				)}
			</div>
			{sessions.length > 3 ? (
				<Button
					className="mx-auto mt-3 h-auto px-2 py-1 text-xs"
					onClick={onShowAllChange}
					variant="ghost"
				>
					{showAll ? "Show fewer sessions" : "Show more sessions"}
					<ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
				</Button>
			) : null}
		</section>
	);
}

function SessionRow({
	session,
	current,
	onRevoke,
}: {
	session: SecuritySession;
	current: boolean;
	onRevoke: (token: string) => Promise<void>;
}) {
	const device = describeDevice(session.userAgent);

	return (
		<div className="flex items-center gap-3 border-border/60 border-b px-3 py-2.5 last:border-b-0">
			<LaptopIcon
				aria-hidden="true"
				className="size-4 shrink-0 text-primary"
				strokeWidth={1.7}
			/>
			<span
				aria-hidden="true"
				className="size-2 shrink-0 rounded-full bg-primary"
			/>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-xs">{device}</p>
				<p className="truncate text-muted-foreground text-xs">
					{session.ipAddress ?? "Unknown location"} ·{" "}
					{relativeTime(session.createdAt)}
				</p>
			</div>
			{current ? (
				<span className="hidden rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground sm:inline">
					Current session
				</span>
			) : null}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							aria-label={`Manage ${device} session`}
							className="size-7 rounded-md"
							size="icon-sm"
							variant="ghost"
						/>
					}
				>
					<EllipsisVerticalIcon aria-hidden="true" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32 rounded-lg p-1">
					<DropdownMenuGroup>
						<DropdownMenuItem
							onClick={() => void onRevoke(session.token)}
							variant={current ? "default" : "destructive"}
						>
							{current ? "Sign out" : "Sign out device"}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function describeDevice(userAgent: string | null | undefined) {
	if (!userAgent) return "Unknown device";
	const platform = /Android/i.test(userAgent)
		? "Android"
		: /iPhone|iPad|iOS/i.test(userAgent)
			? "iOS"
			: /Macintosh/i.test(userAgent)
				? "macOS"
				: /Windows/i.test(userAgent)
					? "Windows"
					: /Linux/i.test(userAgent)
						? "Linux"
						: "Unknown device";
	const browser = /Edg\//.test(userAgent)
		? "Edge"
		: /Firefox\//.test(userAgent)
			? "Firefox"
			: /Chrome\//.test(userAgent)
				? "Chrome"
				: /Safari\//.test(userAgent)
					? "Safari"
					: null;
	return browser ? `${platform} · ${browser}` : platform;
}

function relativeTime(value: Date | string) {
	const seconds = Math.max(
		0,
		Math.floor((Date.now() - new Date(value).getTime()) / 1000),
	);
	if (seconds < 60) return "Active now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	const days = Math.floor(hours / 24);
	return `${days} day${days === 1 ? "" : "s"} ago`;
}
