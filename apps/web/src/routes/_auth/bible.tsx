import { createFileRoute } from "@tanstack/react-router";
import { BookOpenIcon } from "lucide-react";
import { z } from "zod";

import { DestinationPage } from "@/components/application/destination-page";
import { ScriptureNotesActions } from "@/components/notes/scripture-notes-actions";

export const Route = createFileRoute("/_auth/bible")({
	component: BiblePage,
	validateSearch: z.object({
		passage: z
			.union([z.coerce.number().int().positive(), z.string().trim().min(1)])
			.optional(),
	}),
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
