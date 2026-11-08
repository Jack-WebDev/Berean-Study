import { cn } from "@berean-study/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { type ReactNode, useId } from "react";

/**
 * One kind of study note in the study panel, such as "Word meanings", that folds
 * open (HANDOFF §4.11). Only groups with content are shown, so the count is never
 * zero.
 */
export function StudyGroup({
	children,
	className,
	count,
	hint,
	name,
	onOpenChange,
	open,
}: {
	children: ReactNode;
	className?: string;
	count: number;
	hint: string;
	name: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const panelId = useId();
	const nameId = useId();
	const detailsId = useId();
	const itemsLabel = `${count} ${count === 1 ? "item" : "items"}`;
	return (
		<section
			className={cn("rounded-2xl border border-border bg-card", className)}
		>
			<h3>
				<button
					aria-controls={panelId}
					aria-describedby={detailsId}
					aria-expanded={open}
					aria-labelledby={nameId}
					className="reader-focus flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
					onClick={() => onOpenChange(!open)}
					type="button"
				>
					<span className="min-w-0 flex-1">
						<span
							className="block font-bold text-[18px] text-foreground"
							id={nameId}
						>
							{name}
						</span>
						<span className="mt-0.5 block text-[15px] text-muted-foreground">
							{hint}
						</span>
					</span>
					<span
						aria-hidden="true"
						className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-secondary px-2 font-bold text-[14px] text-secondary-foreground"
					>
						{count}
					</span>
					{/* Read after the name: "Word meanings. The Greek… words. 2 items." */}
					<span className="sr-only" id={detailsId}>
						{hint}. {itemsLabel}.
					</span>
					<ChevronDownIcon
						aria-hidden="true"
						className={cn(
							"size-5 shrink-0 text-muted-foreground",
							open && "rotate-180",
						)}
					/>
				</button>
			</h3>
			<div
				className="border-border border-t px-4 py-4"
				hidden={!open}
				id={panelId}
			>
				{children}
			</div>
		</section>
	);
}
