import {
	formatVerseReference,
	type VerseBlockAttributes,
} from "@berean-study/rich-text-editor";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { verseRangeTextQueryOptions } from "@/queries/passages";

/**
 * A quoted verse's words, loaded from the Bible text, with its reference
 * linking to Browse Scripture. Place it inside a `<figure>`.
 */
export function QuotedVerse({
	size = "large",
	verse,
}: {
	size?: "large" | "small";
	verse: VerseBlockAttributes;
}) {
	const text = useQuery(
		verseRangeTextQueryOptions({
			bookId: verse.bookId,
			chapter: verse.chapter,
			translation: verse.translation,
			verseEnd: verse.verseEnd,
			verseStart: verse.verseStart,
		}),
	);
	const words = text.data?.map((item) => item.text).join(" ") || verse.text;
	return (
		<>
			<blockquote
				className={cn(
					"font-serif text-foreground/90 italic",
					size === "large"
						? "text-lg leading-[1.45]"
						: "text-[15px] leading-normal",
				)}
			>
				{words ?? (text.isPending ? "Loading verse…" : "")}
			</blockquote>
			<figcaption
				className={cn(
					"font-semibold text-scripture-foreground",
					size === "large" ? "text-[13px]" : "text-xs",
				)}
			>
				<Link
					className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					search={{ passage: verse.passageId }}
					to="/bible"
				>
					{formatVerseReference(verse)}
				</Link>
			</figcaption>
		</>
	);
}
