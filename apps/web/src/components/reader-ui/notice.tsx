import { cn } from "@berean-study/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/**
 * A tinted box for neutral information (HANDOFF §4.12), such as "Picked up where
 * you left off". Pass `role="status"` when it appears in response to something,
 * so screen readers announce it.
 */
export function Notice({
	action,
	children,
	className,
	title,
	...props
}: Omit<ComponentProps<"div">, "title"> & {
	/** One button, placed under the text. */
	action?: ReactNode;
	title?: ReactNode;
}) {
	return (
		<div
			className={cn(
				"rounded-2xl bg-reader-notice px-4 py-3 text-[16px] text-reader-notice-foreground leading-relaxed",
				className,
			)}
			{...props}
		>
			{title ? <p className="font-bold">{title}</p> : null}
			{children ? <div>{children}</div> : null}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}
