import { queryOptions } from "@tanstack/react-query";

import {
	getPersonProfile,
	listAssignableRoles,
	listPendingChanges,
	listPeople,
} from "@/functions/people";

import { type PeopleListFilters, peopleKeys } from "./keys";

export const peopleListQueryOptions = (filters: PeopleListFilters) =>
	queryOptions({
		queryKey: peopleKeys.list(filters),
		queryFn: () => listPeople({ data: filters }),
	});

export const personProfileQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: peopleKeys.profile(userId),
		queryFn: () => getPersonProfile({ data: { userId } }),
	});

export const assignableRolesQueryOptions = () =>
	queryOptions({
		queryKey: peopleKeys.assignableRoles(),
		queryFn: () => listAssignableRoles(),
	});

export const pendingChangesQueryOptions = () =>
	queryOptions({
		queryKey: peopleKeys.pendingChanges(),
		queryFn: () => listPendingChanges(),
	});
