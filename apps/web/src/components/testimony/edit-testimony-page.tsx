import {
	emptyRichTextDocument,
	hasRichTextContent,
	type RichTextDocument,
	RichTextEditorWorkspace,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import { Input } from "@berean-study/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { SaveIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { updateTestimony } from "@/functions/testimonies";
import { communityKeys, libraryKeys, testimonyKeys } from "@/queries/keys";
import { testimonyQueryOptions } from "@/queries/testimonies";

export function EditTestimonyPage({ testimonyId }: { testimonyId: number }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const testimonyQuery = useQuery(testimonyQueryOptions(testimonyId));
	// Unsaved edits layered over the stored testimony.
	const [draftTitle, setTitle] = useState<string | null>(null);
	const [draftContent, setContent] = useState<RichTextDocument | null>(null);
	const title = draftTitle ?? testimonyQuery.data?.title ?? "";
	const content =
		draftContent ?? testimonyQuery.data?.content ?? emptyRichTextDocument;
	const saveMutation = useMutation({
		mutationFn: async () => {
			const testimony = await updateTestimony({
				data: {
					id: testimonyId,
					title: title.trim(),
					content,
				},
			});
			if (!testimony) throw new Error();
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: testimonyKeys.all }),
				queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
				queryClient.invalidateQueries({
					queryKey: communityKeys.publishingResources(),
				}),
			]);
			toast.success("Testimony updated.");
			navigate({ to: "/library/testimonials" });
		},
		onError: () =>
			toast.error("We couldn't update your testimony. Please try again."),
	});
	const saving = saveMutation.isPending;
	const save = () => {
		if (!title.trim() || !hasRichTextContent(content)) return;
		saveMutation.mutate();
	};
	if (testimonyQuery.isPending)
		return <p className="p-6 text-muted-foreground">Loading testimony…</p>;
	return (
		<div className="min-h-full px-5 py-6 sm:px-8">
			<main className="mx-auto max-w-360">
				<Link
					className="text-primary text-sm hover:underline"
					to="/library/testimonials"
				>
					Back to testimonies
				</Link>
				<h1 className="mt-4 font-serif text-3xl">Edit Testimony</h1>
				<form
					className="mt-6 space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						void save();
					}}
				>
					<Input
						onChange={(event) => setTitle(event.target.value)}
						value={title}
					/>
					<RichTextEditorWorkspace
						ariaLabel="Testimony content"
						editable
						onChange={setContent}
						preset="member"
						value={content}
					/>
					<div className="flex justify-end gap-2">
						<Button
							render={<Link to="/library/testimonials" />}
							variant="ghost"
						>
							Cancel
						</Button>
						<Button disabled={saving} type="submit">
							<SaveIcon />
							{saving ? "Saving…" : "Save changes"}
						</Button>
					</div>
				</form>
			</main>
		</div>
	);
}
