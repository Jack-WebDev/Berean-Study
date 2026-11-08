import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@berean-study/ui/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/** A white card with a thin edge (HANDOFF §4.9). */
export function ReaderCard({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"rounded-2xl border border-border bg-card text-card-foreground",
				className,
			)}
			{...props}
		/>
	);
}

/** A card holding rows that each lead somewhere, separated by thin lines. */
export function ListGroup({ className, ...props }: ComponentProps<"ul">) {
	return (
		<ul
			className={cn(
				"divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * One row in a ListGroup, at least 60 px tall, ending in a chevron. Pass the
 * router link as `render`.
 */
export function ListRow({
	className,
	description,
	meta,
	render,
	title,
	...props
}: Omit<useRender.ComponentProps<"a">, "children" | "title"> & {
	description?: ReactNode;
	/** A short quiet line, such as "21 chapters". */
	meta?: ReactNode;
	title: ReactNode;
}) {
	const row = useRender({
		defaultTagName: "a",
		props: mergeProps<"a">(
			{
				children: (
					<>
						<span className="min-w-0 flex-1">
							<span className="block font-serif text-[19px] text-foreground leading-snug">
								{title}
							</span>
							{description ? (
								<span className="mt-0.5 block text-[15px] text-muted-foreground">
									{description}
								</span>
							) : null}
						</span>
						{meta ? (
							<span className="shrink-0 text-[15px] text-muted-foreground">
								{meta}
							</span>
						) : null}
						<ChevronRightIcon
							aria-hidden="true"
							className="size-5 shrink-0 text-muted-foreground"
						/>
					</>
				),
				className: cn(
					"reader-focus flex min-h-[60px] items-center gap-3 px-4 py-2 hover:bg-muted",
					className,
				),
			},
			props,
		),
		render,
	});
	return <li>{row}</li>;
}
