import { createFileRoute } from "@tanstack/react-router";

import { DifficultQuestionsPage } from "@/components/study-tools/difficult-questions-page";

export const Route = createFileRoute("/_auth/study-tools/difficult-questions")({
	component: DifficultQuestionsPage,
});
