import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@berean-study/ui/lib/utils";

/*
 * Reader buttons (HANDOFF §4.1). "primary" is the one navy button a screen has,
 * for its main action. Tap targets are at least 48 px tall; main buttons 56 px.
 * Disabled buttons keep readable text rather than fading out, because a disabled
 * Previous button still tells the reader "First chapter".
 */

export type ReaderButtonVariant = "primary" | "secondary" | "link";
export type ReaderButtonSize = "main" | "compact";

export function readerButtonClass({
	size = "main",
	variant = "secondary",
}: {
	size?: ReaderButtonSize;
	variant?: ReaderButtonVariant;
} = {}) {
	return cn(
		"reader-focus inline-flex min-w-12 select-none items-center justify-center gap-2 text-center font-semibold [&_svg]:size-5 [&_svg]:shrink-0",
		variant === "link"
			? "min-h-12 px-1 text-[17px] text-primary underline underline-offset-4"
			: [
					"px-5",
					size === "main" ? "h-14 text-[17px]" : "h-12 text-base",
					variant === "primary"
						? "bg-primary text-primary-foreground hover:bg-primary/90"
						: "border-[1.5px] border-border-strong bg-card text-foreground hover:bg-muted",
				],
		"disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground aria-disabled:cursor-not-allowed aria-disabled:border-border aria-disabled:bg-muted aria-disabled:text-muted-foreground",
	);
}

/** A button, or anything passed as `render` (such as a router link) styled as one. */
export function ReaderButton({
	className,
	render,
	size,
	variant,
	...props
}: useRender.ComponentProps<"button"> & {
	size?: ReaderButtonSize;
	variant?: ReaderButtonVariant;
}) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				className: cn(readerButtonClass({ size, variant }), className),
				type: render ? undefined : "button",
			},
			props,
		),
		render,
	});
}
