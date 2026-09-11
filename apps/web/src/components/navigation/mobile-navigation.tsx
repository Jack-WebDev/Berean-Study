import { Link } from "@tanstack/react-router";

import { navigationItems } from "./navigation-items";

export function MobileNavigation() {
	return (
		<nav
			aria-label="Mobile navigation"
			className="fixed inset-x-0 bottom-0 z-50 border-border/70 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
		>
			<div className="grid h-16 grid-cols-2">
				{navigationItems.map((item) => {
					const Icon = item.icon;

					return (
						<Link
							key={item.hash}
							to="/"
							hash={item.hash}
							className="flex min-w-0 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors active:text-primary"
						>
							<Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />

							<span className="font-medium text-[11px]">{item.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
