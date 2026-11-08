import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CommunitySharePage } from "@/components/community/community-share-page";
import { VerseSharePage } from "@/components/community/verse-share-page";

export const Route = createFileRoute("/_auth/community/share")({
	component: CommunityShareRoute,
	validateSearch: z.object({
		/** Preselects an item to share, e.g. from a note's Details tab. */
		source: z.coerce.number().int().positive().optional(),
		type: z
			.enum(["collection", "note", "testimony", "prayer", "verse"])
			.optional(),
		/* Verses chosen in the Bible reader, such as Romans 8:28–29 in the KJV. */
		book: z
			.string()
			.regex(/^[a-z0-9-]+$/)
			.optional()
			.catch(undefined),
		chapter: z.coerce
			.number()
			.int()
			.positive()
			.max(200)
			.optional()
			.catch(undefined),
		translation: z.string().trim().min(1).max(20).optional().catch(undefined),
		/** Verse numbers separated by commas, such as "28,29". */
		verses: z
			.string()
			.regex(/^\d{1,3}(,\d{1,3})*$/)
			.optional()
			.catch(undefined),
	}),
});

function CommunityShareRoute() {
	const { book, chapter, source, translation, type, verses } =
		Route.useSearch();
	if (type === "verse" && book && chapter && translation && verses) {
		return (
			<VerseSharePage
				bookSlug={book}
				chapter={chapter}
				translationAbbreviation={translation}
				verses={verses.split(",").map(Number)}
			/>
		);
	}
	return (
		<CommunitySharePage
			initialSourceId={source}
			initialType={type === "verse" ? undefined : type}
		/>
	);
}
