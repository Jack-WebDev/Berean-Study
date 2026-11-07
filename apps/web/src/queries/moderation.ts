import { queryOptions } from "@tanstack/react-query";

import {
	getReportedPost,
	listOpenReports,
	listRemovedPosts,
} from "@/functions/moderation";

import { moderationKeys } from "./keys";

export const openReportsQueryOptions = () =>
	queryOptions({
		queryKey: moderationKeys.openReports(),
		queryFn: () => listOpenReports(),
	});

export const reportedPostQueryOptions = (postId: number) =>
	queryOptions({
		queryKey: moderationKeys.report(postId),
		queryFn: () => getReportedPost({ data: { postId } }),
	});

export const removedPostsQueryOptions = (page: number) =>
	queryOptions({
		queryKey: moderationKeys.removed(page),
		queryFn: () => listRemovedPosts({ data: { page } }),
	});
