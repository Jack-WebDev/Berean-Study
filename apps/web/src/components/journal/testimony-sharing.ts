import type { RichTextDocument } from "@berean-study/rich-text-editor";
import { getExcerpt } from "@berean-study/rich-text-editor/document";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { publishCommunityPost } from "@/functions/community";
import { communityKeys } from "@/queries/keys";
import { invalidatePrayerJournal } from "@/queries/prayer-journal";

/**
 * Posts a testimony to Community, using its plain-text excerpt as the preview.
 *
 * Known gap: there is no way to take a post down yet, so a shared testimony
 * can't be made private again from the journal.
 */
export function useShareTestimony() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (testimony: {
			content: RichTextDocument;
			id: number;
			title: string;
		}) => {
			const excerpt = getExcerpt(testimony.content, 480, {
				skipHeadings: true,
			});
			const result = await publishCommunityPost({
				data: {
					snapshot: excerpt ? { excerpt, title: testimony.title } : undefined,
					sourceId: testimony.id,
					type: "testimony",
				},
			});
			if (!result) throw new Error("Unable to publish Community post.");
			return result;
		},
		onSuccess: async (result) => {
			toast.success(
				result.alreadyPublished
					? "This testimony is already shared with your community."
					: "Testimony shared with your community.",
			);
			await Promise.all([
				invalidatePrayerJournal(queryClient),
				queryClient.invalidateQueries({ queryKey: communityKeys.all }),
			]);
		},
		onError: () =>
			toast.error("We couldn’t share this testimony. Please try again."),
	});
}
