import { cn } from "@berean-study/ui/lib/utils";

/**
 * Grey blocks while something loads, with words saying what's happening, such as
 * "Opening Romans 8…" (HANDOFF §4.14). The blocks stay still: no shimmer.
 */
export function ReaderSkeleton({
	className,
	label,
	lines = 6,
}: {
	className?: string;
	label: string;
	lines?: number;
}) {
	return (
		<div className={cn("flex flex-col gap-4", className)} role="status">
			<p className="text-[17px] text-muted-foreground">{label}</p>
			<div aria-hidden="true" className="flex flex-col gap-3">
				{Array.from({ length: lines }, (_, index) => (
					<div
						className={cn(
							"h-6 rounded-md bg-muted",
							index % 3 === 2 ? "w-3/5" : "w-full",
						)}
						key={index}
					/>
				))}
			</div>
		</div>
	);
}
