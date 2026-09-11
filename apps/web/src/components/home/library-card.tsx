import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type LibraryCardProps = {
	href: string;
	icon: ReactNode;
	label: string;
	count: string;
	description: string;
};

export function LibraryCard({
	href,
	icon,
	label,
	count,
	description,
}: LibraryCardProps) {
	return (
		<a
			href={href}
			className="group flex min-h-32 items-center gap-5 rounded-2xl border border-border bg-card p-6 transition hover:border-primary/50 hover:shadow-sm"
		>
			<div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-primary">
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-sm">{label}</p>
				<p className="mt-1 font-serif text-3xl text-foreground">{count}</p>
				<p className="mt-2 text-muted-foreground text-sm leading-5">
					{description}
				</p>
			</div>
			<ChevronRight className="size-5 text-muted-foreground/70 transition-transform group-hover:translate-x-1" />
		</a>
	);
}
