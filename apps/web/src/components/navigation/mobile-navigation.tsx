import { cn } from "@berean-study/ui/lib/utils";

import {
	authenticatedNavigationItems,
	publicNavigationItems,
} from "./navigation-items";

export function MobileNavigation({
	isAuthenticated = false,
}: {
	isAuthenticated?: boolean;
}) {
	const navigationItems = isAuthenticated
		? authenticatedNavigationItems
		: publicNavigationItems;
	return (
		<nav
			aria-label="Mobile navigation"
			className="fixed inset-x-0 bottom-0 z-50 border-border/70 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
		>
			<div
				className={cn(
					"grid h-16",
					isAuthenticated ? "grid-cols-3" : "grid-cols-2",
				)}
			>
				{navigationItems.map((item) => {
					const Icon = item.icon;

					return (
						<a
							key={item.href}
							href={item.href}
							className="flex min-w-0 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors active:text-primary"
						>
							<Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />

							<span className="font-medium text-[11px]">{item.label}</span>
						</a>
					);
				})}
			</div>
		</nav>
	);
}
