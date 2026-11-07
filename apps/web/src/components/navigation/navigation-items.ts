import type { PermissionKey } from "@berean-study/db/access-catalogue";
import type { StaffQueue } from "@berean-study/db/staff-queues";
import type { LucideIcon } from "lucide-react";
import {
	BookMarkedIcon,
	BookmarkIcon,
	BookOpenIcon,
	BriefcaseIcon,
	ClipboardListIcon,
	DatabaseIcon,
	FileCheckIcon,
	FileClockIcon,
	FileTextIcon,
	FlagIcon,
	FolderIcon,
	HeartIcon,
	HouseIcon,
	KeyboardIcon,
	LanguagesIcon,
	LayoutDashboardIcon,
	LibraryIcon,
	ListOrderedIcon,
	NotebookPenIcon,
	ScrollTextIcon,
	SearchIcon,
	SendIcon,
	SettingsIcon,
	ShapesIcon,
	ShieldCheckIcon,
	UserRoundCogIcon,
	UserRoundPenIcon,
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
	/** Sidebar count of items waiting in this queue. */
	queue?: StaffQueue;
	/** The link appears for anyone holding at least one of these. */
	requiredPermissions?: readonly PermissionKey[];
};

export type NavigationSection = {
	items: readonly NavigationItem[];
	label: string;
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
		href: "/study-tools/difficult-questions",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Difficult Questions",
	},
	{
		href: "/study-tools/canonical-connections",
		hideIcon: true,
		icon: ShapesIcon,
		label: "Canonical Connections",
	},
	{
		href: "/study-tools/compare-passages",
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
				activePaths: [
					"/library/prayers",
					"/library/testimonies",
					"/library/reflections",
				],
				href: "/library/prayers",
				icon: HeartIcon,
				label: "Prayer Journal",
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

const contributorNavigationItems = [
	{
		exact: true,
		href: "/work",
		icon: BriefcaseIcon,
		label: "My Work",
		requiredPermissions: ["content.write", "scripture.enter"],
	},
	{
		href: "/work/scripture",
		icon: KeyboardIcon,
		label: "Scripture Entry",
		queue: "scriptureEntry",
		requiredPermissions: ["scripture.enter", "scripture.proofread"],
	},
	{
		href: "/work/research",
		icon: NotebookPenIcon,
		label: "Research",
		requiredPermissions: ["research.manage"],
	},
	{
		href: "/work/sources",
		icon: BookMarkedIcon,
		label: "Sources",
		requiredPermissions: ["sources.manage"],
	},
	{
		href: "/work/assignments",
		icon: ClipboardListIcon,
		label: "Assignments",
		queue: "myAssignments",
		requiredPermissions: ["content.write", "editorial.review"],
	},
	{
		href: "/work/reviews",
		icon: ScrollTextIcon,
		label: "Reviews",
		queue: "awaitingReview",
		requiredPermissions: ["editorial.review"],
	},
] as const satisfies readonly NavigationItem[];

const administrationNavigationItems = [
	{
		exact: true,
		href: "/admin",
		icon: LayoutDashboardIcon,
		label: "Overview",
		requiredPermissions: [
			"editorial.assign",
			"publication.publish",
			"publication.withdraw",
			"issues.manage",
			"community.moderate",
			"contributors.manage",
		],
	},
	{
		href: "/admin/editorial",
		icon: FileCheckIcon,
		label: "Editorial",
		queue: "awaitingReview",
		requiredPermissions: ["editorial.assign"],
	},
	{
		href: "/admin/publication",
		icon: SendIcon,
		label: "Publication",
		queue: "readyToPublish",
		requiredPermissions: ["publication.publish", "publication.withdraw"],
	},
	{
		href: "/admin/content-issues",
		icon: FlagIcon,
		label: "Content Issues",
		queue: "contentIssues",
		requiredPermissions: ["issues.manage"],
	},
	{
		href: "/admin/moderation",
		icon: ShieldCheckIcon,
		label: "Community Moderation",
		queue: "communityReports",
		requiredPermissions: ["community.moderate"],
	},
	{
		href: "/admin/contributors",
		icon: UserRoundPenIcon,
		label: "Contributors",
		requiredPermissions: ["contributors.manage"],
	},
] as const satisfies readonly NavigationItem[];

const managementNavigationItems = [
	{
		href: "/admin/users",
		icon: UsersRoundIcon,
		label: "Users",
		queue: "pendingConfirmations",
		requiredPermissions: ["admins.manage"],
	},
	{
		href: "/admin/roles",
		icon: UserRoundCogIcon,
		label: "Roles & Permissions",
		requiredPermissions: ["roles.manage"],
	},
	{
		href: "/admin/scripture",
		icon: DatabaseIcon,
		label: "Scripture Data",
		requiredPermissions: ["scripture.manage"],
	},
	{
		href: "/admin/canon",
		icon: ListOrderedIcon,
		label: "Canon & Versification",
		queue: "foundationChanges",
		requiredPermissions: ["canon.manage", "scripture.manage"],
	},
	{
		href: "/admin/translations",
		icon: LanguagesIcon,
		label: "Translations",
		requiredPermissions: ["translations.manage"],
	},
	{
		href: "/admin/audit",
		icon: FileClockIcon,
		label: "Audit Log",
		requiredPermissions: ["audit.view_all"],
	},
] as const satisfies readonly NavigationItem[];

export const staffNavigationSections: readonly NavigationSection[] = [
	{ items: contributorNavigationItems, label: "Contributor" },
	{ items: administrationNavigationItems, label: "Administration" },
	{ items: managementNavigationItems, label: "Management" },
];

function canAccess(
	item: NavigationItem,
	permissionKeys: readonly PermissionKey[],
) {
	return (
		!item.requiredPermissions ||
		item.requiredPermissions.some((key) => permissionKeys.includes(key))
	);
}

/**
 * The staff sections this person should see. Each link follows its own
 * permission, so a custom role sees exactly the pages it can use, and a section
 * with nothing to show is left out.
 */
export function accessibleStaffSections(
	permissionKeys: readonly PermissionKey[],
): NavigationSection[] {
	return staffNavigationSections
		.map((section) => ({
			...section,
			items: section.items.filter((item) => canAccess(item, permissionKeys)),
		}))
		.filter((section) => section.items.length > 0);
}

/** The staff page at this address, if this person is allowed to open it. */
export function accessibleStaffItem(
	href: string,
	permissionKeys: readonly PermissionKey[],
) {
	const item = staffNavigationSections
		.flatMap((section) => section.items)
		.find((candidate) => candidate.href === href);

	return item && canAccess(item, permissionKeys) ? item : undefined;
}

export function isSecondaryLocation(pathname: string) {
	return [
		...secondaryNavigationItems,
		...staffNavigationSections.flatMap((section) => section.items),
	].some(
		(item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
	);
}
