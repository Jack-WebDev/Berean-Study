import { type QueryClient, queryOptions } from "@tanstack/react-query";

import {
	getContentState,
	getRevisionPage,
	listApprovedContent,
	listAssignablePeople,
	listAssignments,
	listEditorialQueue,
	listLiveContent,
	listMyWork,
	listOpenIssues,
	listReviewQueue,
} from "@/functions/content";

import {
	auditKeys,
	type ContentScopeInput,
	contentKeys,
	evidenceKeys,
	type RevisionPageInput,
	staffQueueKeys,
} from "./keys";

export const contentStateQueryOptions = (input: ContentScopeInput) =>
	queryOptions({
		queryKey: contentKeys.state(input),
		queryFn: () => getContentState({ data: input }),
	});

export const revisionPageQueryOptions = (input: RevisionPageInput) =>
	queryOptions({
		queryKey: contentKeys.revision(input),
		queryFn: () => getRevisionPage({ data: input }),
	});

export const editorialQueueQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.editorialQueue(),
		queryFn: () => listEditorialQueue(),
	});

export const reviewQueueQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.reviewQueue(),
		queryFn: () => listReviewQueue(),
	});

export const assignmentsQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.assignments(),
		queryFn: () => listAssignments(),
	});

export const myWorkQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.myWork(),
		queryFn: () => listMyWork(),
	});

export const approvedContentQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.approved(),
		queryFn: () => listApprovedContent(),
	});

export const liveContentQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.live(),
		queryFn: () => listLiveContent(),
	});

export const openIssuesQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.openIssues(),
		queryFn: () => listOpenIssues(),
	});

export const assignablePeopleQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.assignablePeople(),
		queryFn: () => listAssignablePeople(),
	});

/** Moving a revision along changes the queues, sidebar counts and audit log too. */
export function invalidateContent(queryClient: QueryClient) {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: contentKeys.all }),
		queryClient.invalidateQueries({ queryKey: evidenceKeys.all }),
		queryClient.invalidateQueries({ queryKey: staffQueueKeys.all }),
		queryClient.invalidateQueries({ queryKey: auditKeys.all }),
	]);
}
