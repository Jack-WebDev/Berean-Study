import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@berean-study/ui/components/drawer";
import { Separator } from "@berean-study/ui/components/separator";
import { cn } from "@berean-study/ui/lib/utils";
import { useRouterState } from "@tanstack/react-router";
import { MoreHorizontalIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import {
	accessibleNavigationItems,
	administrationNavigationItems,
	editorialNavigationItems,
	isSecondaryLocation,
	type NavigationItem,
	primaryNavigationItems,
	publicNavigationItems,
	secondaryNavigationItems,
} from "./navigation-items";

export function PublicMobileNavigation() {
	return (
		<nav
			aria-label="Mobile navigation"
			className="fixed inset-x-0 bottom-0 z-40 border-border/70 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
		>
			<div className="grid h-16 grid-cols-2">
				{publicNavigationItems.map((item) => {
					const Icon = item.icon;

					return (
						<a
							className={mobileNavigationClassName(false)}
							href={item.href}
							key={item.href}
						>
							<Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
							<span>{item.label}</span>
						</a>
					);
				})}
			</div>
		</nav>
	);
}

export function MobileNavigation({
	onOpenSearch,
	permissionKeys,
}: {
	onOpenSearch: () => void;
	permissionKeys: readonly string[];
}) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const [moreOpen, setMoreOpen] = useState(false);
	const editorialItems = accessibleNavigationItems(
		editorialNavigationItems,
		permissionKeys,
	);
	const administrationItems = accessibleNavigationItems(
		administrationNavigationItems,
		permissionKeys,
	);
	const libraryItem = primaryNavigationItems.find(
		(item) => item.href === "/library",
	);

	return (
		<Drawer
			open={moreOpen}
			onOpenChange={setMoreOpen}
			showSwipeHandle
			swipeDirection="down"
		>
			<nav
				aria-label="Mobile navigation"
				className="fixed inset-x-0 bottom-0 z-40 border-border/70 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
			>
				<div className="grid h-16 grid-cols-5">
					{primaryNavigationItems.map((item) =>
						item.href === "/search" ? (
							<MobileSearchTrigger
								key={item.href}
								onOpenSearch={onOpenSearch}
							/>
						) : (
							<MobileNavigationLink
								item={item}
								isActive={isCurrentLocation(pathname, item)}
								key={item.href}
							/>
						),
					)}
					<DrawerTrigger
						render={
							<button
								aria-label="More navigation"
								className={mobileNavigationClassName(
									moreOpen || isSecondaryLocation(pathname),
								)}
								type="button"
							/>
						}
					>
						<MoreHorizontalIcon
							aria-hidden="true"
							className="size-5"
							strokeWidth={1.7}
						/>
						<span>More</span>
					</DrawerTrigger>
				</div>
			</nav>
			<DrawerContent className="max-h-[min(70dvh,36rem)] rounded-t-xl">
				<DrawerHeader className="px-5 pt-3 text-left">
					<DrawerTitle className="font-serif text-xl">More</DrawerTitle>
					<DrawerDescription className="sr-only">
						Additional Berean Study destinations
					</DrawerDescription>
				</DrawerHeader>
				<div className="min-h-0 overflow-y-auto px-3 pb-6">
					{libraryItem ? (
						<MoreNavigationSection
							items={[libraryItem]}
							label="Library"
							onNavigate={() => setMoreOpen(false)}
							pathname={pathname}
						/>
					) : null}
					<MoreNavigationSection
						items={secondaryNavigationItems}
						onNavigate={() => setMoreOpen(false)}
						pathname={pathname}
					/>
					{editorialItems.length > 0 && (
						<MoreNavigationSection
							items={editorialItems}
							label="Editorial"
							onNavigate={() => setMoreOpen(false)}
							pathname={pathname}
						/>
					)}
					{administrationItems.length > 0 && (
						<MoreNavigationSection
							items={administrationItems}
							label="Administration"
							onNavigate={() => setMoreOpen(false)}
							pathname={pathname}
						/>
					)}
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function MoreNavigationSection({
	items,
	label,
	onNavigate,
	pathname,
}: {
	items: readonly NavigationItem[];
	label?: string;
	onNavigate: () => void;
	pathname: string;
}) {
	return (
		<section className="py-2">
			{label && (
				<p className="px-2 py-2 font-medium text-muted-foreground text-xs">
					{label}
				</p>
			)}
			<div className="flex flex-col">
				{items.map((item) => (
					<MoreNavigationItem
						item={item}
						key={item.href}
						onNavigate={onNavigate}
						pathname={pathname}
					/>
				))}
			</div>
			<Separator className="mt-2" />
		</section>
	);
}

function MoreNavigationItem({
	item,
	onNavigate,
	pathname,
}: {
	item: NavigationItem;
	onNavigate: () => void;
	pathname: string;
}) {
	const Icon = item.icon;
	const isActive = isCurrentLocation(pathname, item);
	const isChildActive = item.children?.some((child) =>
		isCurrentLocation(pathname, child),
	);
	const isSelected = isActive && !isChildActive;

	return (
		<div>
			<a
				aria-current={isSelected ? "page" : undefined}
				className={cn(
					"flex min-h-11 items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					isChildActive && "bg-muted/50",
					isSelected && "bg-muted font-medium",
				)}
				href={item.href}
				onClick={onNavigate}
			>
				<Icon aria-hidden="true" className="size-4 text-muted-foreground" />
				<span className="min-w-0 flex-1">{item.label}</span>
				<span aria-hidden="true" className="text-muted-foreground">
					›
				</span>
			</a>
			{item.children?.length ? (
				<div className="ml-7 border-muted border-l pl-2">
					{item.children.map((child) => (
						<MoreNavigationItem
							item={child}
							key={child.href}
							onNavigate={onNavigate}
							pathname={pathname}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

function MobileNavigationLink({
	item,
	isActive,
}: {
	item: NavigationItem;
	isActive: boolean;
}) {
	const Icon = item.icon;
	return (
		<a
			aria-current={isActive ? "page" : undefined}
			className={mobileNavigationClassName(isActive)}
			href={item.href}
		>
			<Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
			<span className="whitespace-nowrap">
				{item.mobileLabel ?? item.label}
			</span>
		</a>
	);
}

function MobileSearchTrigger({ onOpenSearch }: { onOpenSearch: () => void }) {
	return (
		<button
			aria-label="Search Berean Study"
			className={mobileNavigationClassName(false)}
			onClick={onOpenSearch}
			type="button"
		>
			<SearchIcon aria-hidden="true" className="size-5" strokeWidth={1.7} />
			<span>Search</span>
		</button>
	);
}

function mobileNavigationClassName(isActive: boolean) {
	return cn(
		"flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
		isActive
			? "font-medium text-foreground"
			: "text-muted-foreground active:text-foreground",
	);
}

function isCurrentLocation(pathname: string, item: NavigationItem) {
	return [item.href, ...(item.activePaths ?? [])].some(
		(href) => pathname === href || pathname.startsWith(`${href}/`),
	);
}
