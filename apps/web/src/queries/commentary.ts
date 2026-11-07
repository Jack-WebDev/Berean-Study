import { queryOptions } from "@tanstack/react-query";

import {
	getCommentaryEditor,
	listCitableExcerpts,
	listCommentaries,
	listResearchForBook,
} from "@/functions/commentary";

import {
	type CitableExcerptFilters,
	type CommentaryEditorInput,
	type CommentaryListFilters,
	contentKeys,
} from "./keys";

export const commentaryEditorQueryOptions = (input: CommentaryEditorInput) =>
	queryOptions({
		queryKey: contentKeys.commentary(input),
		queryFn: () => getCommentaryEditor({ data: input }),
	});

export const commentaryListQueryOptions = (filters: CommentaryListFilters) =>
	queryOptions({
		queryKey: contentKeys.commentaryList(filters),
		queryFn: () => listCommentaries({ data: filters }),
	});

export const citableExcerptsQueryOptions = (filters: CitableExcerptFilters) =>
	queryOptions({
		queryKey: contentKeys.citableExcerpts(filters),
		queryFn: () => listCitableExcerpts({ data: filters }),
	});

export const bookResearchQueryOptions = (bookSlug: string) =>
	queryOptions({
		queryKey: contentKeys.bookResearch(bookSlug),
		queryFn: () => listResearchForBook({ data: { bookSlug } }),
	});
