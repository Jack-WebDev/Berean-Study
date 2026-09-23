import { createFileRoute } from "@tanstack/react-router";

import { CommunitySharePage } from "@/components/community/community-share-page";

export const Route = createFileRoute("/_auth/community/share")({
	component: CommunitySharePage,
});
