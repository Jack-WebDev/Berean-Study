import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@berean-study/ui/lib/utils";
import { ChevronLeftIcon } from "lucide-react";

/**
 * "‹ Books": the one obvious way back (HANDOFF §4.3). It always names where it
 * goes. Pass the router link as `render`, for example
 * `<BackLink render={<Link to="/bible" />}>Books</BackLink>`.
 */
export function BackLink({
	children,
	className,
	render,
	...props
}: useRender.ComponentProps<"a">) {
	return useRender({
		defaultTagName: "a",
		props: mergeProps<"a">(
			{
				children: (
					<>
						<ChevronLeftIcon
							aria-hidden="true"
							className="-ml-1 size-5 shrink-0"
						/>
						<span>{children}</span>
					</>
				),
				className: cn(
					"reader-focus inline-flex min-h-12 min-w-12 items-center gap-1 pr-2 font-semibold text-[17px] text-foreground hover:underline",
					className,
				),
			},
			props,
		),
		render,
	});
}
