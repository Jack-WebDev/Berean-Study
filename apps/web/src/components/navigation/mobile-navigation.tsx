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
								isActive={isCurrentLocation(pathname, item.href)}
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
					<MoreNavigationSection
						items={secondaryNavigationItems}
						onNavigate={() => setMoreOpen(false)}
					/>
					{editorialItems.length > 0 && (
						<MoreNavigationSection
							items={editorialItems}
							label="Editorial"
							onNavigate={() => setMoreOpen(false)}
						/>
					)}
					{administrationItems.length > 0 && (
						<MoreNavigationSection
							items={administrationItems}
							label="Administration"
							onNavigate={() => setMoreOpen(false)}
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
}: {
	items: readonly NavigationItem[];
	label?: string;
	onNavigate: () => void;
}) {
	return (
		<section className="py-2">
			{label && (
				<p className="px-2 py-2 font-medium text-muted-foreground text-xs">
					{label}
				</p>
			)}
			<div className="flex flex-col">
				{items.map((item) => {
					const Icon = item.icon;
					return (
						<a
							className="flex min-h-11 items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							href={item.href}
							key={item.href}
							onClick={onNavigate}
						>
							<Icon
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
							<span className="flex-1">{item.label}</span>
							<span aria-hidden="true" className="text-muted-foreground">
								›
							</span>
						</a>
					);
				})}
			</div>
			<Separator className="mt-2" />
		</section>
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

function isCurrentLocation(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`);
}
