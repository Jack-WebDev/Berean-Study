import { cn } from "@berean-study/ui/lib/utils";
import type { ReactNode } from "react";

export type StatusTone =
	| "success"
	| "attention"
	| "info"
	| "danger"
	| "authority"
	| "neutral"
	| "accent";

const toneClassNames: Record<StatusTone, string> = {
	success: "bg-status-success text-status-success-foreground",
	attention: "bg-status-attention text-status-attention-foreground",
	info: "bg-status-info text-status-info-foreground",
	danger: "bg-status-danger text-status-danger-foreground",
	authority: "bg-status-authority text-status-authority-foreground",
	neutral: "bg-status-neutral text-status-neutral-foreground",
	accent: "bg-sidebar-accent text-sidebar-accent-foreground",
};

export function StatusChip({
	children,
	className,
	tone,
}: {
	children: ReactNode;
	className?: string;
	tone: StatusTone;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 font-semibold text-[0.6875rem]",
				toneClassNames[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}
