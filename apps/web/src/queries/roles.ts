import { queryOptions } from "@tanstack/react-query";

import { getRoleMatrix } from "@/functions/roles";

import { roleKeys } from "./keys";

export const roleMatrixQueryOptions = () =>
	queryOptions({
		queryKey: roleKeys.matrix(),
		queryFn: () => getRoleMatrix(),
	});
