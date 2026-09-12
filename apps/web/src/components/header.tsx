import { Button } from "@berean-study/ui/components/button";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import { DesktopNavigation } from "./navigation/desktop-navigation";
import { PublicMobileNavigation } from "./navigation/mobile-navigation";

export default function Header() {
	const { data: session, isPending } = authClient.useSession();
	const isAuthenticated = Boolean(session);

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
							className="h-12 w-auto mix-blend-multiply dark:hidden"
						/>
						<img
							src="/logo-dark.png"
							alt=""
							aria-hidden="true"
							width={2172}
							height={724}
							className="hidden h-12 w-auto dark:block"
						/>
					</Link>

					<DesktopNavigation />

					<div className="ml-auto flex items-center gap-1 sm:gap-2">
						{isPending ? (
							<Skeleton className="h-9 w-24" />
						) : isAuthenticated ? (
							<Button
								render={<Link to="/home" />}
								className="h-10 rounded-xl px-3.5 font-semibold text-sm shadow-md shadow-primary/20 transition-transform hover:bg-primary"
							>
								Go back home
								<ArrowRightIcon
									aria-hidden="true"
									className="size-3.5"
									strokeWidth={2}
								/>
							</Button>
						) : (
							<>
								<Button
									render={<Link to="/login" />}
									variant="ghost"
									className="h-12 rounded-xl px-3.5 font-semibold text-foreground text-sm hover:bg-muted"
								>
									Log in
								</Button>
								<Button
									render={<Link to="/register" />}
									className="h-12 rounded-xl px-3.5 font-semibold text-sm shadow-md shadow-primary/20 transition-transform hover:bg-primary sm:px-4"
								>
									Create account
									<ArrowUpRightIcon
										aria-hidden="true"
										className="size-3.5"
										strokeWidth={2}
									/>
								</Button>
							</>
						)}
					</div>
				</div>
			</header>
			<PublicMobileNavigation />
		</>
	);
}
