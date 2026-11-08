import { createFileRoute, redirect } from "@tanstack/react-router";
import { BookOpenIcon } from "lucide-react";
import { z } from "zod";

import { DestinationPage } from "@/components/application/destination-page";
import { ScriptureNotesActions } from "@/components/notes/scripture-notes-actions";
import { getPassageStart } from "@/functions/reader";

export const Route = createFileRoute("/_auth/bible/")({
	component: BiblePage,
	validateSearch: z.object({
		passage: z
			.union([z.coerce.number().int().positive(), z.string().trim().min(1)])
			.optional(),
	}),
	loaderDeps: ({ search }) => ({ passage: search.passage }),
	// Notes, prayers and the journal link to /bible?passage=12. Open those verses
	// in the reading page instead.
	loader: async ({ deps }) => {
		if (typeof deps.passage !== "number") return;
		const start = await getPassageStart({
			data: { passageId: deps.passage },
		}).catch(() => null);
		if (!start) return;
		throw redirect({
			params: { book: start.bookSlug, chapter: start.chapter },
			replace: true,
			search: { verse: start.verse },
			to: "/bible/$book/$chapter",
		});
	},
});

function BiblePage() {
	const { passage } = Route.useSearch();
	const passageId = typeof passage === "number" ? passage : undefined;

	return (
		<DestinationPage
			description="Choose a testament to begin reading Scripture."
			icon={BookOpenIcon}
			readingPreferences
			title="Bible"
		>
			{passageId ? <ScriptureNotesActions passageId={passageId} /> : null}
		</DestinationPage>
	);
}
