import {
	createFileRoute,
	Link,
	Outlet,
	useMatches,
} from "@tanstack/react-router";
import {
	BookOpenIcon,
	LockKeyholeIcon,
	Settings2Icon,
	UserRoundIcon,
} from "lucide-react";

export const Route = createFileRoute("/_auth/account")({
	component: AccountLayout,
});

const accountLinks = [
	{
		icon: UserRoundIcon,
		label: "Profile",
		to: "/account/profile" as const,
	},
	{
		icon: Settings2Icon,
		label: "Preferences",
		to: "/account/preferences" as const,
	},
	{
		icon: BookOpenIcon,
		label: "Reading",
		to: "/account/reading" as const,
	},
	{
		icon: LockKeyholeIcon,
		label: "Security",
		to: "/account/security" as const,
	},
];

type AccountPageMetadata = {
	title: string;
	description: string;
};

function AccountLayout() {
	const page = useMatches({
		select: (matches) =>
			matches.at(-1)?.staticData as AccountPageMetadata | undefined,
	});

	return (
		<div className="min-h-full bg-background">
			<div className="mx-auto w-full max-w-360 px-4 py-7 sm:px-6 sm:py-9 lg:px-10 lg:py-10">
				<header className="max-w-2xl">
					<h1 className="font-serif text-3xl text-foreground tracking-[-0.03em] sm:text-4xl">
						{page?.title ?? "Account"}
					</h1>

					<p className="mt-2 text-muted-foreground text-sm leading-6 sm:text-base">
						{page?.description ?? "Manage your account settings."}
					</p>
				</header>

				<div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[13rem_minmax(0,1fr)]">
					<AccountNavigation />

					<div className="min-w-0">
						<Outlet />
					</div>
				</div>
			</div>
		</div>
	);
}

function AccountNavigation() {
	return (
		<nav aria-label="Account sections" className="min-w-0 lg:pt-1">
			<div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
				{accountLinks.map((link) => {
					const Icon = link.icon;

					return (
						<Link
							key={link.label}
							to={link.to}
							activeOptions={{ exact: true }}
							className="group relative flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground text-sm transition-colors hover:bg-muted/40 hover:text-foreground lg:w-full"
							activeProps={{
								className:
									"group relative flex shrink-0 items-center gap-3 rounded-lg bg-secondary/55 px-3 py-2.5 font-medium text-foreground text-sm lg:w-full",
							}}
						>
							<span
								aria-hidden="true"
								className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-transparent group-[&.active]:bg-accent"
							/>

							<Icon
								aria-hidden="true"
								className="size-4 shrink-0"
								strokeWidth={1.8}
							/>

							<span>{link.label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
