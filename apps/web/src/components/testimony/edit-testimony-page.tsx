import {
	emptyRichTextDocument,
	hasRichTextContent,
	type RichTextDocument,
	RichTextEditorWorkspace,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import { Input } from "@berean-study/ui/components/input";
import { Link, useNavigate } from "@tanstack/react-router";
import { SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { parseReflectionContent } from "@/components/prayer/reflection-content";
import { getTestimony, updateTestimony } from "@/functions/testimonies";

export function EditTestimonyPage({ testimonyId }: { testimonyId: number }) {
	const navigate = useNavigate();
	const [title, setTitle] = useState("");
	const [content, setContent] = useState<RichTextDocument>(
		emptyRichTextDocument,
	);
	const [loaded, setLoaded] = useState(false);
	const [saving, setSaving] = useState(false);
	useEffect(() => {
		void getTestimony({ data: { id: testimonyId } })
			.then((testimony) => {
				if (testimony) {
					setTitle(testimony.title);
					setContent(parseReflectionContent(testimony.content));
				}
				setLoaded(true);
			})
			.catch(() => setLoaded(true));
	}, [testimonyId]);
	const save = async () => {
		if (!title.trim() || !hasRichTextContent(content)) return;
		setSaving(true);
		try {
			const testimony = await updateTestimony({
				data: {
					id: testimonyId,
					title: title.trim(),
					content: JSON.stringify(content),
				},
			});
			if (!testimony) throw new Error();
			toast.success("Testimony updated.");
			navigate({ to: "/library/testimonials" });
		} catch {
			toast.error("We couldn't update your testimony. Please try again.");
		} finally {
			setSaving(false);
		}
	};
	if (!loaded)
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
