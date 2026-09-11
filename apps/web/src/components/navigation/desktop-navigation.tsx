import { Link } from "@tanstack/react-router";

import { navigationItems } from "./navigation-items";

export function DesktopNavigation() {
	return (
		<nav
			aria-label="Primary navigation"
			className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex"
		>
			{navigationItems.map((item) => (
				<Link
					key={item.hash}
					to="/"
					hash={item.hash}
					className="rounded-md px-1 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
}
