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
import { useState } from "react";
import { toast } from "sonner";
import { createTestimony } from "@/functions/testimonies";

export function NewTestimonyPage() {
	const navigate = useNavigate();
	const [title, setTitle] = useState("");
	const [content, setContent] = useState<RichTextDocument>(
		emptyRichTextDocument,
	);
	const [saving, setSaving] = useState(false);
	const save = async () => {
		if (!title.trim() || !hasRichTextContent(content)) {
			toast.error("Add a title and testimony before saving.");
			return;
		}
		setSaving(true);
		try {
			await createTestimony({
				data: { title: title.trim(), content: JSON.stringify(content) },
			});
			toast.success("Testimony saved.");
			navigate({ to: "/library/testimonials" });
		} catch {
			toast.error("We couldn't save your testimony. Please try again.");
		} finally {
			setSaving(false);
		}
	};
	return (
		<div className="min-h-full px-5 py-6 sm:px-8">
			<main className="mx-auto max-w-4xl">
				<Link
					className="text-primary text-sm hover:underline"
					to="/library/testimonials"
				>
					Back to testimonies
				</Link>
				<h1 className="mt-4 font-serif text-3xl">New Testimony</h1>
				<p className="mt-1 text-muted-foreground">
					Record a story you want to remember.
				</p>
				<form
					className="mt-6 space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						void save();
					}}
				>
					<Input
						onChange={(event) => setTitle(event.target.value)}
						placeholder="Testimony title"
						value={title}
					/>
					<RichTextEditorWorkspace
						ariaLabel="Testimony content"
						editable
						onChange={setContent}
						placeholder="Write your testimony…"
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
							{saving ? "Saving…" : "Save testimony"}
						</Button>
					</div>
				</form>
			</main>
		</div>
	);
}
