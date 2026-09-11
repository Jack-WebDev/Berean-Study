import { Button } from "@berean-study/ui/components/button";
import { Link } from "@tanstack/react-router";
import { BookOpenIcon, InfoIcon, LibraryIcon, SearchIcon } from "lucide-react";

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

					<nav
						aria-label="Primary navigation"
						className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 md:flex"
					>
						<DesktopLink hash="browse">Read</DesktopLink>
						<DesktopLink hash="search">Search</DesktopLink>
						<DesktopLink hash="library">Library</DesktopLink>
						<DesktopLink hash="about">About</DesktopLink>
					</nav>

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

			<MobileTabBar />
		</>
	);
}

function DesktopLink({ children, hash }: { children: string; hash: string }) {
	return (
		<Link
			to="/"
			hash={hash}
			className="rounded-md px-1 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{children}
		</Link>
	);
}

function MobileTabBar() {
	return (
		<nav
			aria-label="Mobile navigation"
			className="fixed inset-x-0 bottom-0 z-50 border-border/70 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
		>
			<div className="grid h-16 grid-cols-4">
				<MobileTab hash="browse" icon={BookOpenIcon} label="Read" />

				<MobileTab hash="search" icon={SearchIcon} label="Search" />

				<MobileTab hash="library" icon={LibraryIcon} label="Library" />

				<MobileTab hash="about" icon={InfoIcon} label="About" />
			</div>
		</nav>
	);
}

function MobileTab({
	hash,
	icon: Icon,
	label,
}: {
	hash: string;
	icon: typeof BookOpenIcon;
	label: string;
}) {
	return (
		<Link
			to="/"
			hash={hash}
			className="flex min-w-0 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors active:text-primary"
		>
			<Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />

			<span className="font-medium text-[11px]">{label}</span>
		</Link>
	);
}
