import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@berean-study/ui/components/avatar";
import { Separator } from "@berean-study/ui/components/separator";
import { CameraIcon } from "lucide-react";

import { formatDate, getInitials } from "@/lib/format";

import type { ProfileUser } from "./types";

export function ProfileIdentity({ user }: { user: ProfileUser }) {
	const initials = getInitials(user.name);

	return (
		<section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
			<div className="flex items-center gap-5 px-6 py-6 sm:px-8">
				<Avatar className="size-22 shrink-0 border border-border/60">
					{user.image ? <AvatarImage alt="" src={user.image} /> : null}
					<AvatarFallback className="bg-secondary font-semibold text-foreground text-xl">
						{initials}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<h2 className="truncate font-serif text-2xl tracking-[-0.02em]">
						{user.name}
					</h2>
					<p className="mt-1 truncate text-muted-foreground text-sm">
						{user.email}
					</p>
					{user.createdAt ? (
						<p className="mt-1 text-muted-foreground text-xs">
							Member since {formatDate(user.createdAt)}
						</p>
					) : null}
				</div>
				<span className="hidden h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-4 font-medium text-sm sm:inline-flex">
					<CameraIcon aria-hidden="true" className="size-4" />
					Edit photo
				</span>
			</div>
			<div className="px-6 pb-6 sm:px-8">
				<Separator className="mb-5" />
				<blockquote>
					<p className="font-serif text-foreground/80 text-sm italic leading-6">
						“Your word is a lamp to my feet and a light to my path.”
					</p>
					<footer className="mt-1.5 text-muted-foreground text-xs">
						Psalm 119:105
					</footer>
				</blockquote>
			</div>
		</section>
	);
}
