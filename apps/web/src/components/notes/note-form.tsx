import {
	type RichTextDocument,
	RichTextEditor,
} from "@berean-study/rich-text-editor";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@berean-study/ui/components/alert-dialog";
import { Button } from "@berean-study/ui/components/button";
import { FieldError } from "@berean-study/ui/components/field";
import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Spinner } from "@berean-study/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import {
	BookOpenIcon,
	CircleHelpIcon,
	FileTextIcon,
	LightbulbIcon,
	PlusIcon,
	SaveIcon,
	TagIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { getPassageOptions } from "@/functions/passages";
import {
	NoteAutosaveStatus,
	type NoteFormValues,
} from "./note-autosave-status";
import { hasNoteContent } from "./note-content";
import { NoteStudyContext } from "./note-study-context";

type PassageOption = Awaited<ReturnType<typeof getPassageOptions>>[number];
const noteFormSchema = z.object({
	content: z
		.custom<RichTextDocument>(
			(value) =>
				Boolean(value) &&
				typeof value === "object" &&
				(value as { type?: unknown }).type === "doc",
			"Write a note before saving.",
		)
		.refine(hasNoteContent, "Write a note before saving."),
	passageId: z.string().regex(/^\d+$/, "Choose a Scripture passage."),
	tags: z.array(z.string().trim().min(1).max(50)).max(20),
});

export function NoteForm({
	initialValues,
	onCancel,
	onAutosave,
	onSubmit,
	submitLabel,
}: {
	initialValues: NoteFormValues;
	onCancel: () => void;
	onAutosave?: (values: NoteFormValues) => Promise<void>;
	onSubmit: (values: NoteFormValues) => Promise<void>;
	submitLabel: string;
}) {
	const [passages, setPassages] = useState<PassageOption[] | null>(null);
	const [hasLoadError, setHasLoadError] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
	const onSubmitRef = useRef(onSubmit);
	const onAutosaveRef = useRef(onAutosave);
	const saveQueue = useRef(Promise.resolve());
	useEffect(() => {
		onSubmitRef.current = onSubmit;
	}, [onSubmit]);
	useEffect(() => {
		onAutosaveRef.current = onAutosave;
	}, [onAutosave]);
	const enqueueSave = useCallback(
		(
			save: (values: NoteFormValues) => Promise<void>,
			values: NoteFormValues,
		) => {
			const nextSave = saveQueue.current
				.catch(() => undefined)
				.then(() => save(values));
			saveQueue.current = nextSave;
			return nextSave;
		},
		[],
	);
	const queueManualSave = useCallback(
		(values: NoteFormValues) => enqueueSave(onSubmitRef.current, values),
		[enqueueSave],
	);
	const queueAutosave = useCallback(
		(values: NoteFormValues) => {
			const autosave = onAutosaveRef.current;
			return autosave ? enqueueSave(autosave, values) : Promise.resolve();
		},
		[enqueueSave],
	);
	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			try {
				await queueManualSave(value);
			} catch {
				setSubmitError("Unable to save your note. Please try again.");
			}
		},
		validators: { onSubmit: noteFormSchema },
	});
	useEffect(() => {
		let active = true;
		void getPassageOptions()
			.then((options) => {
				if (active) setPassages(options);
			})
			.catch(() => {
				if (active) setHasLoadError(true);
			});
		return () => {
			active = false;
		};
	}, []);

	return (
		<>
			<form
				className="note-composer mt-6"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				onKeyDown={(event) => {
					if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
						event.preventDefault();
						form.handleSubmit();
					}
				}}
			>
				<div className="note-composer-layout">
					<aside className="note-context-column" aria-label="Passage context">
						<form.Subscribe selector={(state) => state.values.passageId}>
							{(passageId) => (
								<PassageCard
									error={
										hasLoadError
											? "Passages are unavailable. Please try again."
											: undefined
									}
									passages={passages}
									passageId={passageId}
									onChange={(value) => form.setFieldValue("passageId", value)}
								/>
							)}
						</form.Subscribe>
						<form.Subscribe selector={(state) => state.values.passageId}>
							{(passageId) => (
								<NoteStudyContext compact passageId={passageId} />
							)}
						</form.Subscribe>
					</aside>
					<main className="note-editor-card">
						<label className="note-field-label" htmlFor="note-title">
							Note Title <span aria-hidden="true">*</span>
						</label>
						<Input
							id="note-title"
							className="note-title-input"
							placeholder="Enter note title..."
						/>
						<form.Field name="content">
							{(field) => {
								const error = field.state.meta.errors[0]?.message;
								return (
									<div className="mt-5" data-invalid={error ? true : undefined}>
										<div className="mb-2 flex items-center justify-between gap-3">
											<label className="note-field-label" htmlFor={field.name}>
												Content <span aria-hidden="true">*</span>
											</label>
											<div className="note-mode-toggle">
												<button className="is-active" type="button">
													Write
												</button>
												<button type="button">Preview</button>
											</div>
										</div>
										<RichTextEditor
											editable
											onChange={field.handleChange}
											placeholder="Start writing your note here…"
											preset="member"
											value={field.state.value}
										/>
										{error ? <FieldError>{error}</FieldError> : null}
									</div>
								);
							}}
						</form.Field>
						<blockquote className="note-passage-quote">
							“There is therefore now no condemnation for those who are in
							Christ Jesus.”<span>ROMANS 8:1</span>
						</blockquote>
					</main>
					<aside className="note-actions-column" aria-label="Note options">
						<form.Subscribe selector={(state) => state.values.tags}>
							{(tags) => (
								<DraftTags
									tags={tags}
									onChange={(nextTags) => form.setFieldValue("tags", nextTags)}
								/>
							)}
						</form.Subscribe>
						<section className="note-side-card">
							<h2>
								<LightbulbIcon aria-hidden="true" /> Study Prompts
							</h2>
							<div className="note-prompts">
								{[
									"What does this text explicitly say?",
									"How does this connect canonically?",
									"What does this mean for my life today?",
								].map((prompt) => (
									<button key={prompt} type="button">
										<CircleHelpIcon aria-hidden="true" />
										{prompt}
									</button>
								))}
							</div>
							<button className="note-more-prompts" type="button">
								More study prompts <span aria-hidden="true">→</span>
							</button>
						</section>
						<section className="note-side-card note-details">
							<h2>
								<FileTextIcon aria-hidden="true" /> Note Details
							</h2>
							<dl>
								<div>
									<dt>Created in</dt>
									<dd>Notes</dd>
								</div>
								<div>
									<dt>Status</dt>
									<dd>
										<i />
										Draft
									</dd>
								</div>
								<div>
									<dt>Word count</dt>
									<dd>0 words</dd>
								</div>
								<div>
									<dt>Auto-saved</dt>
									<dd>
										<i />
										Just now
									</dd>
								</div>
							</dl>
						</section>
						<form.Subscribe
							selector={(state) => ({
								canSubmit: state.canSubmit,
								isDirty: state.isDirty,
								isSubmitting: state.isSubmitting,
								values: state.values,
							})}
						>
							{({ canSubmit, isDirty, isSubmitting, values }) => (
								<div className="note-save-actions">
									<Button
										className="note-primary-save"
										disabled={!canSubmit || isSubmitting || passages === null}
										type="submit"
									>
										{isSubmitting ? (
											<Spinner aria-hidden="true" data-icon="inline-start" />
										) : (
											<SaveIcon aria-hidden="true" data-icon="inline-start" />
										)}
										{submitLabel}
									</Button>
									<Button
										disabled={isSubmitting}
										onClick={() =>
											isDirty ? setDiscardDialogOpen(true) : onCancel()
										}
										type="button"
										variant="outline"
									>
										<FileTextIcon aria-hidden="true" data-icon="inline-start" />
										Save as draft
									</Button>
									<Button
										disabled={isSubmitting}
										onClick={() =>
											isDirty ? setDiscardDialogOpen(true) : onCancel()
										}
										type="button"
										variant="outline"
									>
										Cancel
									</Button>
									{onAutosave ? (
										<NoteAutosaveStatus
											initialValues={initialValues}
											isManualSaveInProgress={isSubmitting}
											onSave={queueAutosave}
											values={values}
										/>
									) : null}
									{submitError ? <FieldError>{submitError}</FieldError> : null}
								</div>
							)}
						</form.Subscribe>
					</aside>
				</div>
			</form>
			<AlertDialog onOpenChange={setDiscardDialogOpen} open={discardDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
						<AlertDialogDescription>
							Your changes have not been saved and will be lost.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep editing</AlertDialogCancel>
						<AlertDialogAction onClick={onCancel} variant="destructive">
							Discard changes
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function PassageCard({
	error,
	onChange,
	passageId,
	passages,
}: {
	error?: string;
	onChange: (value: string) => void;
	passageId: string;
	passages: PassageOption[] | null;
}) {
	const selected = passages?.find(
		(passage) => passage.id.toString() === passageId,
	);
	return (
		<section className="note-passage-card">
			<h2>
				<BookOpenIcon aria-hidden="true" /> Linked Passage
			</h2>
			<div className="note-passage-reference">
				{selected?.label ?? "Choose a passage"}
			</div>
			<p className="note-passage-copy">
				Select the Scripture passage that your note will remain connected to.
			</p>
			<NativeSelect
				aria-label="Linked passage"
				disabled={passages === null || Boolean(error)}
				onChange={(event) => onChange(event.target.value)}
				value={passageId}
			>
				<NativeSelectOption value="">
					{passages === null ? "Loading passages…" : "Choose a passage"}
				</NativeSelectOption>
				{passages?.map((passage) => (
					<NativeSelectOption key={passage.id} value={passage.id}>
						{passage.label}
					</NativeSelectOption>
				))}
			</NativeSelect>
			{error ? <FieldError>{error}</FieldError> : null}
			<button className="note-browse-scripture" type="button">
				Browse Scripture <span aria-hidden="true">→</span>
			</button>
		</section>
	);
}

function DraftTags({
	onChange,
	tags,
}: {
	onChange: (tags: string[]) => void;
	tags: string[];
}) {
	const [value, setValue] = useState("");
	const addTag = () => {
		const next = value.trim();
		if (
			next &&
			!tags.some(
				(tag) =>
					tag.localeCompare(next, undefined, { sensitivity: "accent" }) === 0,
			)
		)
			onChange([...tags, next]);
		setValue("");
	};
	return (
		<section className="note-side-card">
			<h2>
				<TagIcon aria-hidden="true" /> Tags
			</h2>
			<Input
				onChange={(event) => setValue(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						addTag();
					}
				}}
				placeholder="Add tags (press Enter)..."
				value={value}
			/>
			<div className="note-tag-list">
				{tags.map((tag) => (
					<button
						key={tag}
						onClick={() => onChange(tags.filter((item) => item !== tag))}
						type="button"
					>
						{tag}
						<span aria-hidden="true">×</span>
					</button>
				))}
			</div>
			<button className="note-add-tag" onClick={addTag} type="button">
				<PlusIcon aria-hidden="true" /> Add tag
			</button>
		</section>
	);
}
