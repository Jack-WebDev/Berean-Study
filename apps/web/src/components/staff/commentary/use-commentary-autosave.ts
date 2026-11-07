import type { CommentaryBody } from "@berean-study/db/commentary-body";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveCommentaryDraft } from "@/functions/commentary";
import { contentKeys } from "@/queries/keys";

const AUTOSAVE_DELAY_MS = 1500;

type Scope = {
	kind: Parameters<typeof saveCommentaryDraft>[0]["data"]["kind"];
	scopeKey: string;
};

/**
 * Saves the draft shortly after typing stops. Saves share a scope, so TanStack runs
 * them one at a time and an older save can't land after a newer one. The first save
 * only happens once something has changed, so opening a commentary creates nothing.
 */
export function useCommentaryAutosave({
	body,
	enabled,
	scope,
	startingBody,
}: {
	body: CommentaryBody;
	enabled: boolean;
	scope: Scope;
	startingBody: CommentaryBody;
}) {
	const queryClient = useQueryClient();
	const [savedAt, setSavedAt] = useState<Date | null>(null);
	const lastSaved = useRef(JSON.stringify(startingBody));
	const serialized = JSON.stringify(body);

	const mutation = useMutation({
		mutationFn: (next: CommentaryBody) =>
			saveCommentaryDraft({ data: { ...scope, body: next } }),
		onSuccess: (_result, next) => {
			lastSaved.current = JSON.stringify(next);
			setSavedAt(new Date());
			return queryClient.invalidateQueries({ queryKey: contentKeys.all });
		},
		scope: { id: `commentary-${scope.kind}-${scope.scopeKey}` },
	});
	const { mutate, mutateAsync } = mutation;

	const isDirty = serialized !== lastSaved.current;
	useEffect(() => {
		if (!enabled || !isDirty) return;
		const timer = setTimeout(
			() => mutate(JSON.parse(serialized)),
			AUTOSAVE_DELAY_MS,
		);
		return () => clearTimeout(timer);
	}, [enabled, isDirty, mutate, serialized]);

	const saveNow = useCallback(
		() => mutateAsync(JSON.parse(serialized) as CommentaryBody),
		[mutateAsync, serialized],
	);
	return {
		error: mutation.error,
		isDirty,
		isSaving: mutation.isPending,
		savedAt,
		saveNow,
	};
}
