import { cn } from "@berean-study/ui/lib/utils";
import type { ReactNode } from "react";

export function StaffCard({
	actions,
	children,
	className,
	title,
}: {
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
	title?: string;
}) {
	return (
		<section
			className={cn(
				"rounded-2xl border border-border bg-card p-5 sm:p-6",
				className,
			)}
		>
			{title ? (
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2">
					<h2 className="font-serif text-xl tracking-[-0.01em]">{title}</h2>
					{actions}
				</div>
			) : null}
			{children}
		</section>
	);
}
