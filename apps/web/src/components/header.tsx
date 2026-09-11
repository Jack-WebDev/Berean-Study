import { Button } from "@berean-study/ui/components/button";
import { Link } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";

import { DesktopNavigation } from "./navigation/desktop-navigation";
import { MobileNavigation } from "./navigation/mobile-navigation";

export default function Header() {
	return (
		<>
			<header className="sticky top-0 z-50 border-border/70 border-b bg-background/90 backdrop-blur-xl">
				<div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:h-16 sm:px-8 lg:px-12">
					<Link
						to="/"
						aria-label="Berean Study home"
						className="flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<img
							src="/logo.png"
							alt="Berean Study"
							width={2172}
							height={724}
							className="h-8 w-auto mix-blend-multiply sm:h-10"
						/>
					</Link>

					<DesktopNavigation />

					<Button
						render={<Link to="/" hash="search" />}
						aria-label="Search"
						variant="ghost"
						size="icon"
						className="ml-auto size-10 rounded-full active:bg-muted md:hover:bg-muted"
					>
						<SearchIcon
							aria-hidden="true"
							data-icon="inline-start"
							strokeWidth={1.7}
						/>
					</Button>
				</div>
			</header>

			<MobileNavigation />
		</>
	);
}
