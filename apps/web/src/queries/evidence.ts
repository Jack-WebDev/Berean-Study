import { queryOptions } from "@tanstack/react-query";

import {
	findSimilarSources,
	getEvidenceWorkbench,
	listEvidenceClaims,
	listEvidenceSources,
	listResearchNotes,
} from "@/functions/evidence";

import {
	type EvidenceClaimFilters,
	type EvidenceSourceFilters,
	type EvidenceWorkbenchInput,
	evidenceKeys,
	type ResearchNoteFilters,
	type SimilarSourcesInput,
} from "./keys";

export const evidenceSourcesQueryOptions = (filters: EvidenceSourceFilters) =>
	queryOptions({
		queryKey: evidenceKeys.sources(filters),
		queryFn: () => listEvidenceSources({ data: filters }),
	});

export const evidenceClaimsQueryOptions = (filters: EvidenceClaimFilters) =>
	queryOptions({
		queryKey: evidenceKeys.claims(filters),
		queryFn: () => listEvidenceClaims({ data: filters }),
	});

export const evidenceWorkbenchQueryOptions = (input: EvidenceWorkbenchInput) =>
	queryOptions({
		queryKey: evidenceKeys.workbench(input),
		queryFn: () => getEvidenceWorkbench({ data: input }),
	});

export const similarSourcesQueryOptions = (input: SimilarSourcesInput) =>
	queryOptions({
		queryKey: evidenceKeys.similar(input),
		queryFn: () => findSimilarSources({ data: input }),
	});

export const researchNotesQueryOptions = (filters: ResearchNoteFilters) =>
	queryOptions({
		queryKey: evidenceKeys.research(filters),
		queryFn: () => listResearchNotes({ data: filters }),
	});
