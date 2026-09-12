import type { LucideIcon } from "lucide-react";
import {
	BookOpenIcon,
	FileClockIcon,
	FileTextIcon,
	HouseIcon,
	LibraryIcon,
	ScrollTextIcon,
	SearchIcon,
	SettingsIcon,
	ShapesIcon,
	ShieldCheckIcon,
	UserRoundCogIcon,
	UsersRoundIcon,
} from "lucide-react";

export type NavigationItem = {
	href: string;
	icon: LucideIcon;
	label: string;
	mobileLabel?: string;
	requiredPermission?: string;
};

export const publicNavigationItems = [
	{ href: "/#browse", icon: BookOpenIcon, label: "Read" },
	{ href: "/#search", icon: SearchIcon, label: "Search" },
] as const satisfies readonly NavigationItem[];

export const primaryNavigationItems = [
	{ href: "/home", icon: HouseIcon, label: "Home" },
	{
		href: "/bible",
		icon: BookOpenIcon,
		label: "Browse Scripture",
		mobileLabel: "Browse",
	},
	{ href: "/library", icon: LibraryIcon, label: "Library" },
	{ href: "/search", icon: SearchIcon, label: "Search" },
] as const satisfies readonly NavigationItem[];

export const secondaryNavigationItems = [
	{ href: "/themes", icon: ShapesIcon, label: "Study Tools" },
	{ href: "/history", icon: FileClockIcon, label: "Reading History" },
	{ href: "/settings", icon: SettingsIcon, label: "Settings" },
] as const satisfies readonly NavigationItem[];

export const editorialNavigationItems = [
	{
		href: "/editorial/assignments",
		icon: FileTextIcon,
		label: "My Assignments",
		requiredPermission: "content.update",
	},
	{
		href: "/editorial/reviews",
		icon: ScrollTextIcon,
		label: "Reviews",
		requiredPermission: "content.review",
	},
	{
		href: "/editorial/issues",
		icon: ShieldCheckIcon,
		label: "Content Issues",
		requiredPermission: "issues.manage",
	},
] as const satisfies readonly NavigationItem[];

export const administrationNavigationItems = [
	{
		href: "/admin/users",
		icon: UsersRoundIcon,
		label: "Users",
		requiredPermission: "access.manage",
	},
	{
		href: "/admin/access",
		icon: UserRoundCogIcon,
		label: "Roles & Permissions",
		requiredPermission: "access.manage",
	},
	{
		href: "/admin/audit-log",
		icon: FileClockIcon,
		label: "Audit Log",
		requiredPermission: "audit.read",
	},
] as const satisfies readonly NavigationItem[];

export function accessibleNavigationItems(
	items: readonly NavigationItem[],
	permissionKeys: readonly string[],
) {
	const permissions = new Set(permissionKeys);
	return items.filter(
		(item) =>
			!item.requiredPermission || permissions.has(item.requiredPermission),
	);
}

export function isSecondaryLocation(pathname: string) {
	return [
		...secondaryNavigationItems,
		...editorialNavigationItems,
		...administrationNavigationItems,
	].some(
		(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
	);
}
