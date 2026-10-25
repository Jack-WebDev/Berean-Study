import { queryOptions } from "@tanstack/react-query";

import {
	getCommunityFeed,
	listCommunityPublishingResources,
	listSavedCommunityPosts,
} from "@/functions/community";

import { type CommunityFeedParams, communityKeys } from "./keys";

export type { CommunityFeedParams } from "./keys";

export const communityFeedQueryOptions = (params: CommunityFeedParams) =>
	queryOptions({
		queryKey: communityKeys.feed(params),
		queryFn: () => getCommunityFeed({ data: params }),
	});

export const savedCommunityPostsQueryOptions = (limit: number) =>
	queryOptions({
		queryKey: communityKeys.saved(limit),
		queryFn: () => listSavedCommunityPosts({ data: { limit } }),
	});

export const communityPublishingResourcesQueryOptions = () =>
	queryOptions({
		queryKey: communityKeys.publishingResources(),
		queryFn: () => listCommunityPublishingResources(),
	});
