import {
	emptyRichTextDocument,
	type RichTextDocument,
	RichTextEditorWorkspace,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@berean-study/ui/components/field";
import { Input } from "@berean-study/ui/components/input";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, SaveIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getPassageOptions } from "@/functions/passages";
import { getPrayer, updatePrayer } from "@/functions/prayers";
import { PrayerCategories, PrayerPassageCard } from "./new-prayer-page";

export function EditPrayerPage({ prayerId }: { prayerId: number }) {
	const navigate = useNavigate({ from: "/library/prayers/$prayerId/edit" });
	const [loaded, setLoaded] = useState(false);
	const [notFound, setNotFound] = useState(false);
	const [title, setTitle] = useState("");
	const [category, setCategory] = useState("");
	const [content, setContent] = useState<RichTextDocument>(
		emptyRichTextDocument,
	);
	const [passageId, setPassageId] = useState<number | null>(null);
	const [passages, setPassages] = useState<Awaited<
		ReturnType<typeof getPassageOptions>
	> | null>(null);
	const [hasPassageLoadError, setHasPassageLoadError] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const loadPrayer = useCallback(async () => {
		try {
			const prayer = await getPrayer({ data: { id: prayerId } });
			if (!prayer) {
				setNotFound(true);
				return;
			}
			setTitle(prayer.title);
			setCategory(prayer.category ?? "");
			setPassageId(prayer.passageId);
			setContent(parseContent(prayer.content));
		} catch {
			setNotFound(true);
		} finally {
			setLoaded(true);
		}
	}, [prayerId]);
	useEffect(() => {
		void loadPrayer();
	}, [loadPrayer]);
	useEffect(() => {
		let active = true;
		void getPassageOptions()
			.then((options) => {
				if (active) setPassages(options);
			})
			.catch(() => {
				if (active) setHasPassageLoadError(true);
			});
		return () => {
			active = false;
		};
	}, []);
	const savePrayer = async () => {
		if (!title.trim()) {
			toast.error("Enter a title for your prayer.");
			return;
		}
		setIsSaving(true);
		try {
			const prayer = await updatePrayer({
				data: {
					category: category.trim() || null,
					content: JSON.stringify(content),
					id: prayerId,
					passageId,
					title: title.trim(),
				},
			});
			if (!prayer) throw new Error("Prayer not found.");
			toast.success("Prayer updated.");
			navigate({ to: "/library/prayers/$prayerId", params: { prayerId } });
		} catch {
			toast.error("We couldn't update your prayer. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};
	if (!loaded)
		return <p className="p-6 text-muted-foreground">Loading prayer…</p>;
	if (notFound)
		return <p className="p-6 text-muted-foreground">Prayer not found.</p>;
	return (
		<div className="min-h-full bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
			<main className="mx-auto w-full max-w-360">
				<Link
					className="inline-flex items-center gap-2 font-medium text-primary text-xs hover:underline"
					params={{ prayerId }}
					to="/library/prayers/$prayerId"
				>
					<ArrowLeftIcon aria-hidden="true" className="size-3.5" /> Prayer
				</Link>
				<h1 className="mt-3 font-serif text-3xl sm:text-4xl">Edit Prayer</h1>
				<form
					className="mt-5"
					onSubmit={(event) => {
						event.preventDefault();
						void savePrayer();
					}}
				>
					<div className="prayer-composer-layout">
						<aside className="note-context-column" aria-label="Passage context">
							<PrayerPassageCard
								error={
									hasPassageLoadError
										? "Passages are unavailable. Please try again."
										: undefined
								}
								onChange={(value) => setPassageId(value ? Number(value) : null)}
								passageId={passageId?.toString() ?? ""}
								passages={passages}
							/>
						</aside>
						<main className="note-editor-card">
							<RichTextEditorWorkspace
								ariaLabel="Prayer content"
								contentClassName="[&_.ProseMirror]:min-h-96"
								editable
								editorHeader={
									<FieldGroup className="gap-3">
										<Field>
											<FieldLabel htmlFor="prayer-title">
												Prayer Title
											</FieldLabel>
											<Input
												id="prayer-title"
												onChange={(event) => setTitle(event.target.value)}
												value={title}
											/>
										</Field>
										<PrayerCategories
											category={category}
											onChange={setCategory}
										/>
									</FieldGroup>
								}
								focusedModeTitle={title || "Untitled prayer"}
								onChange={setContent}
								placeholder="Write your prayer…"
								presentation="composer"
								preset="member"
								value={content}
							/>
						</main>
						<div className="prayer-save-actions">
							<Button
								render={
									<Link params={{ prayerId }} to="/library/prayers/$prayerId" />
								}
								variant="ghost"
							>
								Cancel
							</Button>
							<Button disabled={isSaving} type="submit">
								{isSaving ? null : <SaveIcon data-icon="inline-start" />}{" "}
								{isSaving ? "Saving…" : "Save changes"}
							</Button>
						</div>
					</div>
				</form>
			</main>
		</div>
	);
}

function parseContent(content: string): RichTextDocument {
	try {
		const document = JSON.parse(content) as RichTextDocument;
		if (document.type === "doc") return document;
	} catch {}
	return emptyRichTextDocument;
}
