import { Button } from "@berean-study/ui/components/button";
import type { LucideIcon } from "lucide-react";

export function SecurityPanelHeader({
	icon: Icon,
	title,
	description,
	action,
	onAction,
	variant = "outline",
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	action: string;
	onAction: () => void;
	variant?: "outline" | "destructive";
}) {
	return (
		<header className="flex items-center gap-3 sm:gap-4">
			<div className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary">
				<Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
			</div>
			<div className="min-w-0 flex-1">
				<h2 className="font-serif text-lg leading-tight tracking-[-0.015em] sm:text-xl">
					{title}
				</h2>
				<p className="mt-0.5 text-muted-foreground text-xs leading-5">
					{description}
				</p>
			</div>
			<Button className="rounded-lg" onClick={onAction} variant={variant}>
				{action}
			</Button>
		</header>
	);
}
