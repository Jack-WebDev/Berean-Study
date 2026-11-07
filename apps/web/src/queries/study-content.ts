import { queryOptions } from "@tanstack/react-query";

import {
	getConnectionRecord,
	getPassageConnections,
	getPassageLanguage,
	getStudyRecord,
	getThemeEditor,
	listFoundationalConfirmations,
	listNameableSources,
	listStudyRecords,
	listThemes,
} from "@/functions/study-content";

import {
	type ConnectionRecordInput,
	contentKeys,
	type StudyRecordFilters,
	type StudyRecordInput,
} from "./keys";

export const studyRecordQueryOptions = (input: StudyRecordInput) =>
	queryOptions({
		queryKey: contentKeys.studyRecord(input),
		queryFn: () => getStudyRecord({ data: input }),
	});

export const studyRecordsQueryOptions = (filters: StudyRecordFilters) =>
	queryOptions({
		queryKey: contentKeys.studyRecords(filters),
		queryFn: () => listStudyRecords({ data: filters }),
	});

export const connectionRecordQueryOptions = (input: ConnectionRecordInput) =>
	queryOptions({
		queryKey: contentKeys.connectionRecord(input),
		queryFn: () => getConnectionRecord({ data: input }),
	});

export const passageConnectionsQueryOptions = (passage: string) =>
	queryOptions({
		queryKey: contentKeys.passageConnections(passage),
		queryFn: () => getPassageConnections({ data: { passage } }),
	});

export const passageLanguageQueryOptions = (passage: string) =>
	queryOptions({
		queryKey: contentKeys.passageLanguage(passage),
		queryFn: () => getPassageLanguage({ data: { passage } }),
	});

export const themesQueryOptions = (search?: string) =>
	queryOptions({
		queryKey: contentKeys.themes(search),
		queryFn: () => listThemes({ data: { search } }),
	});

export const themeEditorQueryOptions = (themeId: number | null) =>
	queryOptions({
		queryKey: contentKeys.themeEditor(themeId),
		queryFn: () => getThemeEditor({ data: { themeId } }),
	});

export const nameableSourcesQueryOptions = (search?: string) =>
	queryOptions({
		queryKey: contentKeys.nameableSources(search),
		queryFn: () => listNameableSources({ data: { search } }),
	});

export const foundationalConfirmationsQueryOptions = () =>
	queryOptions({
		queryKey: contentKeys.foundationalConfirmations(),
		queryFn: () => listFoundationalConfirmations(),
	});
