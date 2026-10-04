import type { LucideIcon } from "lucide-react";
import {
	BookmarkIcon,
	BookOpenIcon,
	FileClockIcon,
	FileTextIcon,
	FolderIcon,
	HeartIcon,
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
	activePaths?: readonly string[];
	children?: readonly NavigationItem[];
	exact?: boolean;
	hash?: string;
	href: string;
	hideIcon?: boolean;
	icon: LucideIcon;
	label: string;
	mobileLabel?: string;
	requiredPermission?: string;
};

const studyToolNavigationItems = [
	{
		exact: true,
		hash: "",
		href: "/study-tools",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Overview",
	},
	{
		href: "/study-tools/themes",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Themes",
	},
	{
		href: "/study-tools/cross-references",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Cross References",
	},
	{
		href: "/study-tools/interpretive-questions",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Interpretive Questions",
	},
	{
		href: "/study-tools/original-language",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Original Language",
	},
	{
		href: "/study-tools/textual-notes",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Textual Notes",
	},
	{
		hash: "difficult-questions",
		href: "/study-tools",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Difficult Questions",
	},
	{
		hash: "canonical-connections",
		href: "/study-tools",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Canonical Connections",
	},
	{
		hash: "compare-passages",
		href: "/study-tools",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Compare Passages",
	},
] as const satisfies readonly NavigationItem[];

export const publicNavigationItems = [
	{ href: "/#browse", icon: BookOpenIcon, label: "Read" },
	{ href: "/#search", icon: SearchIcon, label: "Search" },
] as const satisfies readonly NavigationItem[];

export const primaryNavigationItems = [
	{ href: "/home", icon: HouseIcon, label: "Home" },
	{
		href: "/community",
		icon: UsersRoundIcon,
		label: "Community",
	},
	{
		href: "/bible",
		icon: BookOpenIcon,
		label: "Browse Scripture",
		mobileLabel: "Browse",
	},
	{
		children: [
			{ href: "/library/notes", icon: FileTextIcon, label: "Notes" },
			{
				href: "/library/collections",
				icon: FolderIcon,
				label: "Collections",
			},
			{ href: "/library/saved", icon: BookmarkIcon, label: "Saved" },
			{
				activePaths: ["/library/prayers", "/library/testimonies"],
				href: "/library/prayers",
				icon: HeartIcon,
				label: "Prayers & Testimonies",
			},
		],
		href: "/library",
		icon: LibraryIcon,
		label: "Library",
	},
] as const satisfies readonly NavigationItem[];

export const secondaryNavigationItems = [
	{
		children: studyToolNavigationItems,
		href: "/study-tools",
		icon: ShapesIcon,
		label: "Study Tools",
	},
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
