import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { Button } from "@berean-study/ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@berean-study/ui/components/collapsible";
import { Kbd } from "@berean-study/ui/components/kbd";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarSeparator,
} from "@berean-study/ui/components/sidebar";
import { cn } from "@berean-study/ui/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRightIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import {
	applyDisplaySettings,
	type DisplaySettings,
	readDisplaySettings,
	saveDisplaySettings,
} from "./account/preferences/display-settings";
import { isCurrentLocation } from "./navigation/is-current-location";
import { MobileNavigation } from "./navigation/mobile-navigation";
import {
	accessibleStaffSections,
	type NavigationItem,
	type NavigationSection,
	primaryNavigationItems,
	secondaryNavigationItems,
} from "./navigation/navigation-items";
import { NavigationQueueCount } from "./navigation/navigation-queue-count";
import { NotificationMenu } from "./notification-menu";
import { GlobalSearchDialog } from "./search/global-search-dialog";
import UserMenu from "./user-menu";

type AppShellProps = {
	children: ReactNode;
	permissionKeys: readonly PermissionKey[];
	staffRoleLabel: string | null;
};

export function AppShell({
	children,
	permissionKeys,
	staffRoleLabel,
}: AppShellProps) {
	const [searchOpen, setSearchOpen] = useState(false);
	const location = useRouterState({
		select: (state) => state.location,
	});
	const staffSections = accessibleStaffSections(permissionKeys);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setSearchOpen(true);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<SidebarProvider>
			<AppSidebar
				hash={location.hash}
				pathname={location.pathname}
				staffRoleLabel={staffRoleLabel}
				staffSections={staffSections}
			/>
			<SidebarInset className="min-w-0">
				<ApplicationToolbar onOpenSearch={() => setSearchOpen(true)} />
				<div className="min-h-0 flex-1 pb-20 md:pb-0">{children}</div>
			</SidebarInset>
			<MobileNavigation
				onOpenSearch={() => setSearchOpen(true)}
				permissionKeys={permissionKeys}
			/>
			<GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
		</SidebarProvider>
	);
}

function AppSidebar({
	hash,
	pathname,
	staffRoleLabel,
	staffSections,
}: {
	hash: string;
	pathname: string;
	staffRoleLabel: string | null;
	staffSections: readonly NavigationSection[];
}) {
	return (
		<Sidebar collapsible="offcanvas" className="border-sidebar-border border-r">
			<SidebarHeader className="px-4 pt-5 pb-3">
				<Link
					to="/home"
					aria-label="Berean Study home"
					className="flex flex-col items-start rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<img
						src="/logo.png"
						alt="Berean Study"
						className="mx-auto h-auto w-44 dark:hidden"
					/>
					<img
						src="/logo-dark.png"
						alt=""
						aria-hidden="true"
						className="mx-auto hidden h-auto w-44 dark:block"
					/>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup className="px-3 py-2">
					<SidebarGroupContent>
						<NavigationMenu
							items={desktopPrimaryNavigationItems}
							hash={hash}
							pathname={pathname}
						/>
					</SidebarGroupContent>
				</SidebarGroup>
				{staffSections.map((section) => (
					<NavigationGroup
						hash={hash}
						items={section.items}
						key={section.label}
						label={section.label}
						pathname={pathname}
					/>
				))}
			</SidebarContent>
			<SidebarFooter className="px-3 pb-4">
				<SidebarSeparator className="mx-0 mt-auto" />
				<div className="pt-2">
					<UserMenu sidebar staffRoleLabel={staffRoleLabel} />
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}

function NavigationGroup({
	label,
	items,
	hash,
	pathname,
}: {
	label: string;
	items: readonly NavigationItem[];
	hash: string;
	pathname: string;
}) {
	return (
		<SidebarGroup>
			<SidebarGroupLabel className="gap-2.5 font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
				{label}
				<span aria-hidden="true" className="h-px flex-1 bg-sidebar-border" />
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<NavigationMenu hash={hash} items={items} pathname={pathname} />
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

function NavigationMenu({
	items,
	hash,
	pathname,
}: {
	items: readonly NavigationItem[];
	hash: string;
	pathname: string;
}) {
	return (
		<SidebarMenu>
			{items.map((item) => (
				<NavigationMenuItem
					hash={hash}
					item={item}
					key={item.href}
					pathname={pathname}
				/>
			))}
		</SidebarMenu>
	);
}

function NavigationMenuItem({
	item,
	hash,
	pathname,
}: {
	item: NavigationItem;
	hash: string;
	pathname: string;
}) {
	const hasChildren = Boolean(item.children?.length);
	const isCurrentRoute = isCurrentLocation(pathname, item, hash);
	const [isExpanded, setIsExpanded] = useState(isCurrentRoute);

	useEffect(() => {
		if (isCurrentLocation(pathname, item, hash)) setIsExpanded(true);
	}, [hash, item, pathname]);

	if (!hasChildren) {
		return <NavigationLink item={item} isActive={isCurrentRoute} />;
	}

	const isParentRoute = pathname === item.href || pathname === `${item.href}/`;
	const isChildRoute = isCurrentRoute && !isParentRoute;
	const Icon = item.icon;
	const submenuId = `navigation-submenu-${item.href.replaceAll("/", "-").slice(1)}`;

	return (
		<Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
			<SidebarMenuItem>
				<SidebarMenuButton
					aria-current={isParentRoute ? "page" : undefined}
					className={cn(
						"h-10 rounded-lg px-3 text-sm",
						isChildRoute && "bg-sidebar-accent/50",
					)}
					isActive={isParentRoute}
					render={<Link hash={item.hash} to={item.href} />}
					tooltip={item.label}
				>
					<Icon aria-hidden="true" />
					<span>{item.label}</span>
				</SidebarMenuButton>
				<CollapsibleTrigger
					aria-controls={submenuId}
					aria-expanded={isExpanded}
					aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label} navigation`}
					render={
						<SidebarMenuAction className="peer-data-[size=default]/menu-button:top-2.5" />
					}
				>
					<ChevronRightIcon
						aria-hidden="true"
						className={isExpanded ? "rotate-90" : undefined}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent id={submenuId} keepMounted>
					<SidebarMenuSub>
						{item.children?.map((child) => (
							<NavigationSubmenuLink
								child={child}
								isActive={isCurrentLocation(pathname, child, hash)}
								key={`${child.href}-${child.hash ?? ""}`}
							/>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
}

function NavigationLink({
	item,
	isActive,
}: {
	item: NavigationItem;
	isActive: boolean;
}) {
	const Icon = item.icon;

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				aria-current={isActive ? "page" : undefined}
				isActive={isActive}
				render={<Link hash={item.hash} to={item.href} />}
				tooltip={item.label}
				className="h-10 rounded-lg px-3 text-sm"
			>
				<Icon aria-hidden="true" />
				<span>{item.label}</span>
				{item.queue ? (
					<NavigationQueueCount className="ml-auto" queue={item.queue} />
				) : null}
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

function NavigationSubmenuLink({
	child,
	isActive,
}: {
	child: NavigationItem;
	isActive: boolean;
}) {
	const ChildIcon = child.icon;

	return (
		<SidebarMenuSubItem>
			<SidebarMenuSubButton
				aria-current={isActive ? "page" : undefined}
				className="rounded-md"
				isActive={isActive}
				render={<Link hash={child.hash} to={child.href} />}
			>
				{!child.hideIcon && <ChildIcon aria-hidden="true" />}
				<span>{child.label}</span>
			</SidebarMenuSubButton>
		</SidebarMenuSubItem>
	);
}

const desktopPrimaryNavigationItems = [
	...primaryNavigationItems,
	{
		href: "/study-tools",
		icon: secondaryNavigationItems[0].icon,
		label: "Study Tools",
		children: secondaryNavigationItems[0].children,
	},
] as const satisfies readonly NavigationItem[];

function ApplicationToolbar({ onOpenSearch }: { onOpenSearch: () => void }) {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains("dark"));
	}, []);

	const toggleAppearance = () => {
		const settings = readDisplaySettings();
		const theme: DisplaySettings["theme"] =
			document.documentElement.classList.contains("dark") ? "light" : "dark";
		const nextSettings = { ...settings, theme };

		applyDisplaySettings(nextSettings);
		saveDisplaySettings(nextSettings);
		setIsDark(theme === "dark");
	};

	return (
		<header className="hidden h-13 shrink-0 items-center border-border/60 border-b px-6 md:flex">
			<Button
				aria-label="Search Berean Study"
				className="mx-auto h-9 w-full max-w-xl justify-start rounded-lg border-border/70 bg-card px-3 text-muted-foreground shadow-sm"
				onClick={onOpenSearch}
				variant="outline"
			>
				<SearchIcon aria-hidden="true" data-icon="inline-start" />
				<span className="flex-1 text-left">
					Search Scripture, topics, people, and more...
				</span>
				<Kbd>⌘K</Kbd>
			</Button>
			<div className="absolute right-5 flex items-center gap-1">
				<NotificationMenu />
				<Button
					aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
					className="rounded-md text-foreground/80"
					onClick={toggleAppearance}
					size="icon"
					type="button"
					variant="ghost"
				>
					{isDark ? (
						<SunIcon aria-hidden="true" data-icon="inline-start" />
					) : (
						<MoonIcon aria-hidden="true" data-icon="inline-start" />
					)}
				</Button>
			</div>
		</header>
	);
}
