import {
	emptyRichTextDocument,
	getDocumentText,
	hasRichTextContent,
	type RichTextDocument,
	RichTextEditorWorkspace,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import { FieldError } from "@berean-study/ui/components/field";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, BookOpenIcon, SaveIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getPassageOptions } from "@/functions/passages";
import {
	createPrayerReflection,
	getPrayer,
	getPrayerReflection,
	updatePrayerReflection,
} from "@/functions/prayers";

type Prayer = NonNullable<Awaited<ReturnType<typeof getPrayer>>>;

export function ReflectionEditorPage({
	prayerId,
	reflectionId,
}: {
	prayerId: number;
	reflectionId?: number;
}) {
	const navigate = useNavigate();
	const [prayer, setPrayer] = useState<Prayer | null | undefined>(undefined);
	const [content, setContent] = useState<RichTextDocument>(
		emptyRichTextDocument,
	);
	const [passageLabel, setPassageLabel] = useState<string | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const isEditing = reflectionId !== undefined;

	const load = useCallback(async () => {
		setLoadFailed(false);
		try {
			const [loadedPrayer, passages, reflection] = await Promise.all([
				getPrayer({ data: { id: prayerId } }),
				getPassageOptions(),
				isEditing
					? getPrayerReflection({ data: { prayerId, reflectionId } })
					: Promise.resolve(null),
			]);
			if (!loadedPrayer || (isEditing && !reflection)) {
				setPrayer(null);
				return;
			}
			setPrayer(loadedPrayer);
			setPassageLabel(
				passages.find((passage) => passage.id === loadedPrayer.passageId)
					?.label ?? null,
			);
			if (reflection) setContent(parseContent(reflection.content));
		} catch {
			setLoadFailed(true);
		}
	}, [isEditing, prayerId, reflectionId]);

	useEffect(() => {
		void load();
	}, [load]);

	const saveReflection = async () => {
		if (!hasRichTextContent(content)) {
			setSubmitError("Write a reflection before saving.");
			return;
		}
		setIsSaving(true);
		setSubmitError(null);
		try {
			const saved = isEditing
				? await updatePrayerReflection({
						data: {
							content: JSON.stringify(content),
							prayerId,
							reflectionId,
						},
					})
				: await createPrayerReflection({
						data: { content: JSON.stringify(content), prayerId },
					});
			if (!saved) throw new Error("Prayer not found.");
			toast.success(isEditing ? "Reflection updated." : "Reflection saved.");
			navigate({
				to: "/library/prayers",
			});
		} catch {
			setSubmitError("We couldn't save your reflection. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	if (loadFailed) {
		return (
			<div className="p-6">
				<p className="text-muted-foreground">Prayer unavailable.</p>
				<Button
					className="mt-4"
					render={<Link to="/library/prayers" />}
					variant="outline"
				>
					Back to prayers
				</Button>
			</div>
		);
	}
	if (prayer === undefined) {
		return <p className="p-6 text-muted-foreground">Loading prayer…</p>;
	}
	if (prayer === null) {
		return (
			<div className="p-6">
				<p className="text-muted-foreground">Prayer not found.</p>
				<Button
					className="mt-4"
					render={<Link to="/library/prayers" />}
					variant="outline"
				>
					Back to prayers
				</Button>
			</div>
		);
	}

	return (
		<div className="min-h-full bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-340">
				<header>
					<Link
						className="inline-flex items-center gap-2 font-medium text-primary text-xs hover:underline"
						to="/library/prayers"
					>
						<ArrowLeftIcon aria-hidden="true" className="size-3.5" />
						Prayers{" "}
						<span className="text-muted-foreground">
							/ {prayer?.title} /{" "}
							{isEditing ? "Edit reflection" : "Add reflection"}
						</span>
					</Link>
					<h1 className="mt-3 font-serif text-3xl leading-10 tracking-[-0.03em] sm:text-4xl">
						{isEditing ? "Edit Reflection" : "New Reflection"}
					</h1>
					<p className="mt-1 font-serif text-muted-foreground text-sm leading-5 sm:text-base">
						Look back on this prayer and record what you&apos;re learning,
						seeing, or experiencing.
					</p>
				</header>
				<form
					className="mt-5"
					onSubmit={(event) => {
						event.preventDefault();
						void saveReflection();
					}}
				>
					<div className="prayer-composer-layout">
						<aside className="note-context-column" aria-label="Linked prayer">
							<LinkedPrayerCard prayer={prayer} passageLabel={passageLabel} />
						</aside>
						<main className="note-editor-card">
							<RichTextEditorWorkspace
								ariaLabel="Reflection content"
								contentClassName="[&_.ProseMirror]:min-h-96"
								editable
								editorHeader={
									<div className="note-content-heading mt-0!">
										<label
											className="note-field-label"
											htmlFor="reflection-content"
										>
											Reflection <span aria-hidden="true">*</span>
										</label>
									</div>
								}
								focusedModeStatus={isSaving ? "Saving…" : "Unsaved changes"}
								focusedModeTitle={prayer?.title}
								id="reflection-content"
								onChange={setContent}
								organization={<ReflectionOrganization />}
								placeholder="Write your reflection…"
								presentation="composer"
								preset="member"
								value={content}
							/>
						</main>
						<div className="prayer-save-actions">
							<Button
								disabled={isSaving}
								render={<Link to="/library/prayers" />}
								variant="ghost"
							>
								Cancel
							</Button>
							<Button disabled={isSaving} type="submit">
								{isSaving ? null : <SaveIcon data-icon="inline-start" />}
								{isSaving ? "Saving…" : "Save reflection"}
							</Button>
						</div>
						{submitError ? <FieldError>{submitError}</FieldError> : null}
					</div>
				</form>
			</div>
		</div>
	);
}

function LinkedPrayerCard({
	passageLabel,
	prayer,
}: {
	passageLabel: string | null;
	prayer: Prayer;
}) {
	const preview = getDocumentText(parseContent(prayer.content)).trim();
	return (
		<section className="note-passage-card">
			<h2>
				<BookOpenIcon aria-hidden="true" /> Linked Prayer
			</h2>
			<h3 className="note-passage-reference">{prayer.title}</h3>
			<p className="note-passage-copy">{formatDate(prayer.createdAt)}</p>
			{preview ? (
				<p className="mt-3 line-clamp-4 text-muted-foreground text-sm">
					{preview}
				</p>
			) : null}
			{passageLabel ? (
				<p className="mt-3 text-muted-foreground text-sm">
					Scripture: {passageLabel}
				</p>
			) : null}
			{prayer.category ? (
				<p className="mt-2 text-muted-foreground text-sm">
					Category: {prayer.category}
				</p>
			) : null}
			<div className="note-passage-actions mt-4">
				<Link to="/library/prayers">Open prayer</Link>
				<Link to="/library/prayers">View reflections</Link>
			</div>
		</section>
	);
}

function ReflectionOrganization() {
	return (
		<dl className="grid gap-1 text-muted-foreground">
			<div className="flex justify-between gap-3">
				<dt>Location</dt>
				<dd className="text-foreground">Prayer reflection</dd>
			</div>
		</dl>
	);
}

function parseContent(content: string): RichTextDocument {
	try {
		const document = JSON.parse(content) as RichTextDocument;
		if (document.type === "doc") return document;
	} catch {}
	return emptyRichTextDocument;
}

function formatDate(value: Date | string) {
	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(value));
}
