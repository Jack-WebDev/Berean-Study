import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { Skeleton } from "@berean-study/ui/components/skeleton";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ChevronsUpDownIcon,
	LogOutIcon,
	SettingsIcon,
	UserIcon,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { getInitials } from "@/lib/format";

type UserMenuProps = {
	sidebar?: boolean;
};

export default function UserMenu({ sidebar = false }: UserMenuProps) {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<Skeleton
				className={sidebar ? "h-14 w-full rounded-xl" : "size-10 rounded-full"}
			/>
		);
	}

	if (!session) {
		return (
			<Button render={<Link to="/login" />} size="sm" variant="outline">
				Sign In
			</Button>
		);
	}

	const initials = getInitials(session.user.name);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label="Open account menu"
						className={
							sidebar
								? "h-auto w-full justify-start gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-sidebar-accent"
								: "size-10 rounded-full border-0 p-0 shadow-none hover:bg-transparent"
						}
						variant={sidebar ? "ghost" : "ghost"}
					/>
				}
			>
				<UserAvatar initials={initials} />

				{sidebar && (
					<>
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-sm">
								{session.user.name}
							</p>
							<p className="truncate text-muted-foreground text-xs">
								{session.user.email}
							</p>
						</div>

						<ChevronsUpDownIcon
							aria-hidden="true"
							className="size-4 shrink-0 text-muted-foreground"
						/>
					</>
				)}
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-72 rounded-xl p-1.5"
				sideOffset={8}
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="p-3 font-normal">
						<div className="flex items-center gap-3">
							<UserAvatar initials={initials} size="lg" />

							<div className="min-w-0">
								<p className="truncate font-semibold text-sm">
									{session.user.name}
								</p>
								<p className="truncate text-muted-foreground text-xs">
									{session.user.email}
								</p>
							</div>
						</div>
					</DropdownMenuLabel>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						className="gap-3 rounded-lg px-3 py-2.5"
						render={<Link to="/account/profile" />}
					>
						<UserIcon
							aria-hidden="true"
							className="size-4 text-muted-foreground"
						/>
						Account
					</DropdownMenuItem>

					<DropdownMenuItem className="gap-3 rounded-lg px-3 py-2.5">
						<SettingsIcon
							aria-hidden="true"
							className="size-4 text-muted-foreground"
						/>
						Settings
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className="gap-3 rounded-lg px-3 py-2.5"
					variant="destructive"
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									navigate({ to: "/" });
								},
							},
						});
					}}
				>
					<LogOutIcon aria-hidden="true" className="size-4" />
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function UserAvatar({
	initials,
	size = "default",
}: {
	initials: string;
	size?: "default" | "lg";
}) {
	return (
		<span
			className={[
				"grid shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground",
				size === "lg" ? "size-11 text-sm" : "size-9 text-xs",
			].join(" ")}
		>
			{initials}
		</span>
	);
}
