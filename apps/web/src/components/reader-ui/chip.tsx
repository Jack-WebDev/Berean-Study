import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@berean-study/ui/lib/utils";
import type { ComponentProps } from "react";

/**
 * A round, labelled button (HANDOFF §4.8), for recent chapters, translations and
 * themes. Pass a router link as `render` to make it a link. A chip that turns on
 * and off should set `aria-pressed`.
 */
export function Chip({
	className,
	render,
	...props
}: useRender.ComponentProps<"button">) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				className: cn(
					"reader-focus inline-flex h-12 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-border-strong bg-card px-4 font-semibold text-[16px] text-foreground hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground [&_svg]:size-4",
					className,
				),
				type: render ? undefined : "button",
			},
			props,
		),
		render,
	});
}

/** A row of chips that wraps onto more lines rather than scrolling sideways. */
export function ChipRow({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("flex flex-wrap gap-2", className)} {...props} />;
}
