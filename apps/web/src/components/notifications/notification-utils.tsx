import {
	BellIcon,
	BookmarkIcon,
	BookOpenIcon,
	FileTextIcon,
	HeartIcon,
	type LucideIcon,
	MegaphoneIcon,
	MessageCircleIcon,
	ShieldIcon,
} from "lucide-react";

export type NotificationCategory =
	| "account"
	| "announcements"
	| "community"
	| "prayer"
	| "reading"
	| "saved"
	| "security"
	| "study";

type NotificationPresentation = {
	badgeClassName: string;
	icon: LucideIcon;
	iconClassName: string;
	label: string;
};

const notificationPresentations: Record<
	NotificationCategory,
	NotificationPresentation
> = {
	account: {
		badgeClassName:
			"bg-slate-100 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300",
		icon: BellIcon,
		iconClassName:
			"bg-slate-100 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300",
		label: "Account",
	},
	announcements: {
		badgeClassName:
			"bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
		icon: MegaphoneIcon,
		iconClassName:
			"bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
		label: "Announcements",
	},
	community: {
		badgeClassName:
			"bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
		icon: MessageCircleIcon,
		iconClassName:
			"bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
		label: "Community",
	},
	prayer: {
		badgeClassName:
			"bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
		icon: HeartIcon,
		iconClassName:
			"bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
		label: "Prayer & testimonies",
	},
	reading: {
		badgeClassName:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
		icon: BookOpenIcon,
		iconClassName:
			"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
		label: "Reading",
	},
	saved: {
		badgeClassName:
			"bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
		icon: BookmarkIcon,
		iconClassName:
			"bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
		label: "Saved",
	},
	security: {
		badgeClassName:
			"bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
		icon: ShieldIcon,
		iconClassName:
			"bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
		label: "Security",
	},
	study: {
		badgeClassName:
			"bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
		icon: FileTextIcon,
		iconClassName:
			"bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
		label: "Study resources",
	},
};

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	year: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
});

export function fullDate(date: Date) {
	return fullDateFormatter.format(date);
}

export function groupNotifications<T extends { createdAt: Date }>(
	notifications: T[],
) {
	const groups: Array<{ label: string; notifications: T[] }> = [];

	for (const notification of notifications) {
		const label = relativeDateGroup(notification.createdAt);
		const currentGroup = groups.at(-1);

		if (currentGroup?.label === label) {
			currentGroup.notifications.push(notification);
			continue;
		}

		groups.push({ label, notifications: [notification] });
	}

	return groups;
}

export function iconForKind(kind: string): LucideIcon {
	return presentationForKind(kind).icon;
}

export function kindLabel(kind: string) {
	return presentationForKind(kind).label;
}

export function presentationForKind(kind: string): NotificationPresentation {
	return notificationPresentations[categoryForKind(kind)];
}

export function categoryForKind(kind: string): NotificationCategory {
	if (includesAny(kind, ["security", "sign_in", "session"])) return "security";
	if (includesAny(kind, ["comment", "reply", "mention", "note"])) {
		return "community";
	}
	if (includesAny(kind, ["saved", "bookmark", "collection"])) return "saved";
	if (kind.includes("prayer") || kind.includes("testimony")) return "prayer";
	if (kind.includes("reading")) return "reading";
	if (kind.includes("resource")) return "study";
	if (includesAny(kind, ["feature", "publication", "announcement"])) {
		return "announcements";
	}
	return "account";
}

export function listTime(date: Date) {
	return relativeDateGroup(date) === "Today"
		? timeFormatter.format(date)
		: shortDateFormatter.format(date);
}

export function relativeTime(date: Date) {
	const difference = Date.now() - date.getTime();
	const minutes = Math.max(0, Math.floor(difference / 60_000));
	if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return shortDateFormatter.format(date);
}

function relativeDateGroup(date: Date) {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const ageInDays = Math.floor(
		(today.getTime() - itemDay.getTime()) / 86_400_000,
	);

	if (ageInDays === 0) return "Today";
	if (ageInDays === 1) return "Yesterday";
	if (ageInDays < 7) return "Earlier this week";
	return "Earlier";
}

function includesAny(value: string, candidates: string[]) {
	return candidates.some((candidate) => value.includes(candidate));
}
