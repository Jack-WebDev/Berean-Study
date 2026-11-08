import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@berean-study/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/**
 * One of the reader's labelled tools, such as Text size (HANDOFF §4.2). The word
 * is always visible under its glyph, because an icon alone isn't enough. On
 * computers the glyph sits beside the word, in one row. Pass a router link as
 * `render` for a tool that opens another page, such as Compare.
 */
export function ToolbarTile({
	className,
	glyph,
	label,
	render,
	...props
}: Omit<useRender.ComponentProps<"button">, "children"> & {
	glyph: ReactNode;
	label: string;
}) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				children: (
					<>
						<span
							aria-hidden="true"
							className="flex h-5 items-center gap-0.5 font-semibold text-[15px] leading-none"
						>
							{glyph}
						</span>
						<span className="font-semibold text-[13px] leading-none lg:text-[15px]">
							{label}
						</span>
					</>
				),
				className: cn(
					"reader-focus flex h-[58px] min-w-12 flex-col items-center justify-center gap-1 rounded-[var(--ios-control-radius)] border border-border bg-card px-1 text-foreground hover:bg-muted aria-expanded:bg-secondary lg:h-12 lg:flex-row lg:gap-2 [&_svg]:size-5",
					className,
				),
				type: render ? undefined : "button",
			},
			props,
		),
		render,
	});
}

/** The row of tools under the chapter title: four equal columns with 8 px gaps. */
export function ToolbarRow({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("grid grid-cols-4 gap-2", className)} {...props} />;
}
