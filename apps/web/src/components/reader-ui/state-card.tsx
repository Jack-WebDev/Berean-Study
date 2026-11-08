import { cn } from "@berean-study/ui/lib/utils";
import type { ReactNode } from "react";

/*
 * The cards shown instead of content (HANDOFF §4.13): nothing here yet, not
 * published yet, or something went wrong. Each says what happened and what to do
 * next in one sentence, with one main action and at most one other.
 */

type StateCardProps = {
	className?: string;
	description: string;
	/** The main action: the screen's one navy button. */
	primaryAction?: ReactNode;
	secondaryAction?: ReactNode;
	title: string;
};

function StateCard({
	className,
	description,
	primaryAction,
	secondaryAction,
	title,
	tone,
}: StateCardProps & { tone: "neutral" | "error" }) {
	return (
		<div
			className={cn(
				"flex flex-col items-center gap-3 rounded-2xl border bg-card px-5 py-8 text-center",
				tone === "error"
					? "border-[1.5px] border-destructive"
					: "border-border",
				className,
			)}
			role={tone === "error" ? "alert" : undefined}
		>
			<h2 className="font-serif text-[22px] text-foreground leading-snug">
				{title}
			</h2>
			<p className="max-w-[34ch] text-[17px] text-muted-foreground leading-relaxed">
				{description}
			</p>
			{primaryAction || secondaryAction ? (
				<div className="mt-2 flex w-full max-w-sm flex-col gap-2">
					{primaryAction}
					{secondaryAction}
				</div>
			) : null}
		</div>
	);
}

/** Nothing here yet, such as a verse with no study notes. */
export function EmptyState(props: StateCardProps) {
	return <StateCard {...props} tone="neutral" />;
}

/** Content that's coming but isn't published yet, such as a chapter. */
export function NotAvailable(props: StateCardProps) {
	return <StateCard {...props} tone="neutral" />;
}

/** Something went wrong. Announced to screen readers straight away. */
export function ErrorCard(props: StateCardProps) {
	return <StateCard {...props} tone="error" />;
}
