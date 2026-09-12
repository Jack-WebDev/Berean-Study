import { Button } from "@berean-study/ui/components/button";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SecurityPanel({
	icon,
	title,
	description,
	action,
	onAction,
	children,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	action: string;
	onAction: () => void;
	children: ReactNode;
}) {
	return (
		<section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
			<SecurityPanelHeader
				action={action}
				description={description}
				icon={icon}
				onAction={onAction}
				title={title}
			/>
			<div className="mt-4">{children}</div>
		</section>
	);
}

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

export function SecurityNotice({
	icon: Icon,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<div className="flex gap-3 rounded-lg bg-secondary/70 px-3 py-3">
			<Icon
				aria-hidden="true"
				className="mt-0.5 size-4 shrink-0 text-primary"
				strokeWidth={1.8}
			/>
			<div>
				<p className="font-medium text-xs">{title}</p>
				<p className="mt-0.5 text-muted-foreground text-xs leading-5">
					{description}
				</p>
			</div>
		</div>
	);
}
