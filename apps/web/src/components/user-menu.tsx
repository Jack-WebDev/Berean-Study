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
import { ChevronRightIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu({ sidebar = false }: { sidebar?: boolean }) {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className={sidebar ? "h-11 w-full" : "h-9 w-24"} />;
	}

	if (!session) {
		return (
			<Link to="/login">
				<Button variant="outline">Sign In</Button>
			</Link>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						className={
							sidebar
								? "h-11 w-full justify-start rounded-lg px-1.5 text-sm hover:bg-sidebar-accent"
								: undefined
						}
						variant={sidebar ? "ghost" : "outline"}
					/>
				}
			>
				{sidebar && (
					<span className="grid size-8 place-items-center rounded-full bg-primary font-semibold text-primary-foreground text-xs">
						{session.user.name
							.split(" ")
							.map((part) => part[0])
							.join("")
							.slice(0, 2)
							.toUpperCase()}
					</span>
				)}
				<span
					className={sidebar ? "min-w-0 flex-1 truncate text-left" : undefined}
				>
					{session.user.name}
				</span>
				{sidebar && <ChevronRightIcon aria-hidden="true" className="size-4" />}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>My Account</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>{session.user.email}</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate({
											to: "/",
										});
									},
								},
							});
						}}
					>
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
