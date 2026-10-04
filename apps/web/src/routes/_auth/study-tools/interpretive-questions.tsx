import { createFileRoute } from "@tanstack/react-router";

import { InterpretiveQuestionsPage } from "@/components/study-tools/interpretive-questions-page";

export const Route = createFileRoute(
	"/_auth/study-tools/interpretive-questions",
)({
	component: InterpretiveQuestionsPage,
});
