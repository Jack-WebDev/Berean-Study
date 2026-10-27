import { createFileRoute } from "@tanstack/react-router";

import { PrayerEditorPage } from "@/components/journal/prayer-editor-page";

export const Route = createFileRoute("/_focus/library/prayers/new")({
	component: () => <PrayerEditorPage />,
});
