import {
	BellIcon,
	BookOpenIcon,
	type LucideIcon,
	MessageCircleIcon,
	ShieldIcon,
	StarIcon,
	UsersIcon,
} from "lucide-react";

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
	if (kind === "security_sign_in") return ShieldIcon;
	if (kind.includes("commentary")) return BookOpenIcon;
	if (kind.includes("reply") || kind.includes("note")) return MessageCircleIcon;
	if (kind.includes("feature") || kind.includes("publication")) return StarIcon;
	if (kind.includes("welcome")) return UsersIcon;
	return BellIcon;
}

export function kindLabel(kind: string) {
	return kind === "security_sign_in"
		? "Account security"
		: kind.replaceAll("_", " ");
}

export function listTime(date: Date) {
	return relativeDateGroup(date) === "Today"
		? timeFormatter.format(date)
		: shortDateFormatter.format(date);
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
	if (ageInDays < 7) return "This week";
	return "Earlier";
}
