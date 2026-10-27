import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ReflectionEditorPage } from "@/components/journal/reflection-editor-page";

export const Route = createFileRoute("/_focus/library/reflections/new")({
	component: NewReflectionRoute,
	validateSearch: z.object({
		/** The prayer this reflection looks back on; omitted for a free reflection. */
		prayerId: z.coerce.number().int().positive().optional(),
		/** A guiding question to start from. */
		prompt: z.string().trim().min(1).max(300).optional(),
	}),
});

function NewReflectionRoute() {
	const { prayerId, prompt } = Route.useSearch();
	// Keyed so choosing another prayer or prompt starts a fresh reflection.
	return (
		<ReflectionEditorPage
			key={`${prayerId ?? ""}|${prompt ?? ""}`}
			prayerId={prayerId}
			prompt={prompt}
		/>
	);
}
