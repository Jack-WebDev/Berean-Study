import type { LucideIcon } from "lucide-react";

export function PreferenceSectionHeader({
	icon: Icon,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<header className="flex items-center gap-4">
			<div className="grid size-12 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary">
				<Icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
			</div>
			<div>
				<h2 className="font-serif text-xl tracking-[-0.015em]">{title}</h2>
				<p className="mt-0.5 text-muted-foreground text-sm">{description}</p>
			</div>
		</header>
	);
}
