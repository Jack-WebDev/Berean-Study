import type { CommentaryBody } from "@berean-study/db/commentary-body";
import { useQueryClient } from "@tanstack/react-query";

import { saveCommentaryDraft } from "@/functions/commentary";
import { useAutosave } from "@/lib/use-autosave";
import { contentKeys } from "@/queries/keys";

type Scope = {
	kind: Parameters<typeof saveCommentaryDraft>[0]["data"]["kind"];
	scopeKey: string;
};

/**
 * Saves the draft shortly after typing stops. The first save only happens once
 * something has changed, so opening a commentary creates nothing.
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
	return useAutosave({
		canSave: enabled,
		delayMs: 1500,
		initialValues: startingBody,
		save: async (next: CommentaryBody) => {
			const saved = await saveCommentaryDraft({
				data: { ...scope, body: next },
			});
			await queryClient.invalidateQueries({ queryKey: contentKeys.all });
			return saved;
		},
		values: body,
	});
}
