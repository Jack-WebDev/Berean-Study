import { queryOptions } from "@tanstack/react-query";

import { listAuditEntries } from "@/functions/audit";

import { type AuditListFilters, auditKeys } from "./keys";

export const auditEntriesQueryOptions = (filters: AuditListFilters) =>
	queryOptions({
		queryKey: auditKeys.list(filters),
		queryFn: () => listAuditEntries({ data: filters }),
	});
