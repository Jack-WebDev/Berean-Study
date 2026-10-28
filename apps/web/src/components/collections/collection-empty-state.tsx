import type { ReactNode } from "react";

import { coverPresets } from "./collection-colors";

/** First-run state for a member with no collections yet. */
export function CollectionEmptyState({
	createAction,
}: {
	createAction: ReactNode;
}) {
	return (
		<section
			aria-labelledby="collections-empty-heading"
			className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-card px-6 py-14 text-center sm:px-8"
		>
			<svg
				aria-hidden="true"
				fill="none"
				height="88"
				viewBox="0 0 120 88"
				width="120"
			>
				<rect
					fill={coverPresets[0].value}
					height="64"
					rx="10"
					width="64"
					x="22"
					y="14"
				/>
				<rect
					fill={coverPresets[3].value}
					height="64"
					rx="10"
					width="64"
					x="34"
					y="8"
				/>
				<rect
					className="fill-card stroke-primary"
					height="64"
					rx="10"
					strokeWidth="1.5"
					width="64"
					x="46"
					y="18"
				/>
				<path
					className="stroke-accent"
					d="M58 38h40M58 48h40M58 58h26"
					strokeLinecap="round"
					strokeWidth="2"
				/>
			</svg>
			<h2
				className="font-serif text-[2rem] leading-tight tracking-[-0.01em]"
				id="collections-empty-heading"
			>
				Gather what you&apos;re studying
			</h2>
			<p className="max-w-130 text-[15px] text-muted-foreground">
				A collection keeps related passages and notes together — a topic
				you&apos;re exploring, a book you&apos;re working through, or a lesson
				you&apos;re preparing to teach.
			</p>
			<div className="mt-2">{createAction}</div>
		</section>
	);
}
