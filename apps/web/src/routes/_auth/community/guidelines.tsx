import { createFileRoute } from "@tanstack/react-router";

import { CommunityGuidelinesPage } from "@/components/community/community-guidelines-page";

export const Route = createFileRoute("/_auth/community/guidelines")({
	component: CommunityGuidelinesPage,
});
