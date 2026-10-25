import { queryOptions } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

import { accountKeys } from "./keys";

export const accountSessionsQueryOptions = () =>
	queryOptions({
		queryKey: accountKeys.sessions(),
		queryFn: async () => {
			// Better Auth reports failures in the result instead of throwing.
			const { data, error } = await authClient.listSessions();
			if (error)
				throw new Error(error.message || "Unable to load active sessions.");
			return data ?? [];
		},
	});
