import { cn } from "@berean-study/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/**
 * One of the reader's labelled tools, such as Text size (HANDOFF §4.2). The word
 * is always visible under its glyph, because an icon alone isn't enough.
 */
export function ToolbarTile({
	className,
	glyph,
	label,
	...props
}: Omit<ComponentProps<"button">, "children"> & {
	glyph: ReactNode;
	label: string;
}) {
	return (
		<button
			className={cn(
				"reader-focus flex h-[58px] min-w-12 flex-col items-center justify-center gap-1 border border-border bg-card px-1 text-foreground hover:bg-muted aria-expanded:bg-secondary [&_svg]:size-5",
				className,
			)}
			type="button"
			{...props}
		>
			<span
				aria-hidden="true"
				className="flex h-5 items-center font-semibold text-[15px] leading-none"
			>
				{glyph}
			</span>
			<span className="font-semibold text-[13px] leading-none">{label}</span>
		</button>
	);
}

/** The row of tools under the chapter title: four equal columns with 8 px gaps. */
export function ToolbarRow({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("grid grid-cols-4 gap-2", className)} {...props} />;
}
