import { Badge } from "@berean-study/ui/components/badge";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import { HighlighterIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

type Highlight = {
	id: string;
	reference: string;
	text: string;
	translation: string;
};

const highlights: readonly Highlight[] = [
	{
		id: "john-3-16-loved-world",
		reference: "John 3:16",
		text: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
		translation: "ESV",
	},
	{
		id: "philippians-4-6-anxious",
		reference: "Philippians 4:6–7",
		text: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.",
		translation: "ESV",
	},
];

export function HighlightsContent() {
	const [searchQuery, setSearchQuery] = useState("");
	const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
	const visibleHighlights = highlights.filter((highlight) =>
		[highlight.reference, highlight.text, highlight.translation]
			.join(" ")
			.toLocaleLowerCase()
			.includes(normalizedQuery),
	);

	return (
		<section
			aria-label="Saved Scripture highlights"
			className="flex flex-col gap-4"
		>
			<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
				<label className="min-w-0 flex-1" htmlFor="highlight-search">
					<span className="sr-only">Search your highlights</span>
					<InputGroup className="h-9 rounded-lg border-border/70 bg-card">
						<InputGroupAddon align="inline-start">
							<SearchIcon aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							id="highlight-search"
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Search your highlights..."
							type="search"
							value={searchQuery}
						/>
					</InputGroup>
				</label>
			</div>

			<p aria-live="polite" className="text-muted-foreground text-sm">
				{visibleHighlights.length} highlight
				{visibleHighlights.length === 1 ? "" : "s"}
			</p>

			<ul className="flex flex-col gap-2">
				{visibleHighlights.map((highlight) => (
					<li key={highlight.id}>
						<article className="rounded-xl border border-border/70 bg-card px-4 py-3.5 shadow-[0_2px_8px_color-mix(in_oklab,var(--foreground),transparent_95%)] sm:px-5">
							<div className="flex items-center gap-2">
								<h2 className="font-serif text-base tracking-[-0.015em] sm:text-lg">
									{highlight.reference}
								</h2>
								<Badge variant="secondary">{highlight.translation}</Badge>
							</div>
							<p className="mt-2 text-muted-foreground text-sm leading-6">
								{highlight.text}
							</p>
						</article>
					</li>
				))}
			</ul>

			{visibleHighlights.length === 0 ? (
				<div className="rounded-xl border border-border/70 bg-card px-5 py-12 text-center">
					<HighlighterIcon
						aria-hidden="true"
						className="mx-auto size-5 text-muted-foreground"
					/>
					<h2 className="mt-3 font-serif text-lg">No highlights found</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Try a different reference or phrase.
					</p>
				</div>
			) : null}
		</section>
	);
}
