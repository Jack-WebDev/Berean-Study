import { Progress } from "@berean-study/ui/components/progress";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import type { CollectionSummary } from "./collection-library";
import { pluralize } from "./collection-library";

/** The study project the member was last in, and the passage to read next. */
export function ContinueStudyingCard({
	collection,
	next,
	translation,
}: {
	collection: CollectionSummary;
	next: { passageId: number; reference: string; text: string | null };
	translation: string | null;
}) {
	const progress = collection.progress ?? 0;

	return (
		<section
			aria-labelledby="continue-studying-heading"
			className="flex flex-wrap items-center gap-x-8 gap-y-6 rounded-[20px] bg-primary px-6 py-7 text-primary-foreground sm:px-8"
		>
			<div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-2.5">
				<p
					className="font-bold text-accent text-xs uppercase tracking-widest dark:text-primary-foreground"
					id="continue-studying-heading"
				>
					Continue studying
				</p>
				<h2 className="font-serif text-[1.75rem] leading-tight sm:text-3xl">
					{collection.name}
				</h2>
				<p className="text-primary-foreground/85">
					Next up:{" "}
					<strong className="font-semibold text-primary-foreground">
						{next.reference}
					</strong>{" "}
					· {collection.readCount} of{" "}
					{pluralize(collection.passageCount, "passage")} read ·{" "}
					{pluralize(collection.noteCount, "note")}
				</p>
				<div className="mt-1 flex items-center gap-3">
					<Progress
						aria-label="Study progress"
						className="max-w-80 flex-1 *:data-[slot=progress-track]:h-1.5 **:data-[slot=progress-indicator]:rounded-full *:data-[slot=progress-track]:rounded-full **:data-[slot=progress-indicator]:bg-accent *:data-[slot=progress-track]:bg-primary-foreground/20 dark:**:data-[slot=progress-indicator]:bg-primary-foreground"
						value={progress}
					/>
					<span
						aria-hidden="true"
						className="text-primary-foreground/85 text-sm"
					>
						{progress}%
					</span>
				</div>
			</div>
			{next.text ? (
				<blockquote className="min-w-0 flex-[1_1_18rem] border-primary-foreground/25 border-l pl-6 font-serif text-lg italic leading-relaxed">
					<p className="line-clamp-4">“{next.text}”</p>
					<cite className="mt-2 block font-sans text-primary-foreground/80 text-xs uppercase not-italic tracking-wider">
						{next.reference}
						{translation ? ` · ${translation}` : ""}
					</cite>
				</blockquote>
			) : null}
			<Link
				className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-foreground px-5 font-bold text-primary text-sm outline-none hover:bg-primary-foreground/90 focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
				hash={`passage-${next.passageId}`}
				params={{ collectionId: String(collection.id) }}
				to="/library/collections/$collectionId"
			>
				Resume
				<span className="sr-only"> {collection.name}</span>
				<ArrowRightIcon aria-hidden="true" className="size-4" />
			</Link>
		</section>
	);
}
