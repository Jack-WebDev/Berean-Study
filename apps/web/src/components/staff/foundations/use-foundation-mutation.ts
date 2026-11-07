import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { invalidateFoundations } from "@/queries/foundations";

/** Any change here shows its message on failure and refreshes what depends on it. */
export function useFoundationMutation<TVariables, TResult>(
	mutationFn: (variables: TVariables) => Promise<TResult>,
	onSuccess?: (result: TResult, variables: TVariables) => void,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onError: (error) => toast.error(error.message),
		onSettled: () => invalidateFoundations(queryClient),
		onSuccess,
	});
}
