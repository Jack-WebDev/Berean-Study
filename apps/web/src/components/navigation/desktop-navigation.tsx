import {
	authenticatedNavigationItems,
	publicNavigationItems,
} from "./navigation-items";

export function DesktopNavigation({
	isAuthenticated = false,
}: {
	isAuthenticated?: boolean;
}) {
	const navigationItems = isAuthenticated
		? authenticatedNavigationItems
		: publicNavigationItems;

	return (
		<nav
			aria-label="Primary navigation"
			className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex"
		>
			{navigationItems.map((item) => (
				<a
					key={item.href}
					href={item.href}
					className="rounded-md px-1 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{item.label}
				</a>
			))}
		</nav>
	);
}
