import {
	getWordCount,
	type RichTextDocument,
	RichTextEditorWorkspace,
	RichTextRenderer,
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import { FieldError } from "@berean-study/ui/components/field";
import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Spinner } from "@berean-study/ui/components/spinner";
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	CopyIcon,
	ExternalLinkIcon,
	FileTextIcon,
	LinkIcon,
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

type PassageOption = Awaited<ReturnType<typeof getPassageOptions>>[number];
type NoteEditorMode = "preview" | "write";
const noteFormSchema = z.object({
	title: z.string().trim().min(1, "Enter a title for your note.").max(200),
	content: z
		.custom<RichTextDocument>(
			(value) =>
				Boolean(value) &&
				typeof value === "object" &&
				(value as { type?: unknown }).type === "doc",
			"Write a note before saving.",
		)
		.refine(hasNoteContent, "Write a note before saving."),
	passageId: z.string(),
	tags: z.array(z.string().trim().min(1).max(50)).max(20),
});

export function NoteForm({
	initialValues,
	onCancel,
	onAutosave,
	onSaveDraft,
	onSubmit,
	submitLabel,
}: {
	initialValues: NoteFormValues;
	onCancel: () => void;
	onAutosave?: (values: NoteFormValues) => Promise<void>;
	onSaveDraft: (values: NoteFormValues) => Promise<void>;
	onSubmit: (values: NoteFormValues) => Promise<void>;
	submitLabel: string;
}) {
	const [passages, setPassages] = useState<PassageOption[] | null>(null);
	const [hasLoadError, setHasLoadError] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
	const [editorMode, setEditorMode] = useState<NoteEditorMode>("write");
	const [autosaveStatus, setAutosaveStatus] = useState<
		"idle" | "saving" | "saved" | "failed"
	>("saved");
	const [bibleReferencePickerOpen, setBibleReferencePickerOpen] =
		useState(false);
	const bibleReferenceResolver = useRef<
		((reference: { label: string; passageId: number } | null) => void) | null
	>(null);
	const onSubmitRef = useRef(onSubmit);
	const onAutosaveRef = useRef(onAutosave);
	const onSaveDraftRef = useRef(onSaveDraft);
	const saveQueue = useRef(Promise.resolve());
	useEffect(() => {
		onSubmitRef.current = onSubmit;
	}, [onSubmit]);
	useEffect(() => {
		onAutosaveRef.current = onAutosave;
	}, [onAutosave]);
	useEffect(() => {
		onSaveDraftRef.current = onSaveDraft;
	}, [onSaveDraft]);
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
	const queueDraftSave = useCallback(
		(values: NoteFormValues) => enqueueSave(onSaveDraftRef.current, values),
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
	useEffect(() => () => bibleReferenceResolver.current?.(null), []);
	const requestBibleReference = useCallback(
		() =>
			new Promise<{ label: string; passageId: number } | null>((resolve) => {
				bibleReferenceResolver.current?.(null);
				bibleReferenceResolver.current = resolve;
				setBibleReferencePickerOpen(true);
			}),
		[],
	);
	const closeBibleReferencePicker = useCallback((open: boolean) => {
		setBibleReferencePickerOpen(open);
		if (!open) {
			bibleReferenceResolver.current?.(null);
			bibleReferenceResolver.current = null;
		}
	}, []);
	const selectBibleReference = useCallback((passage: PassageOption) => {
		bibleReferenceResolver.current?.({
			label: passage.label,
			passageId: passage.id,
		});
		bibleReferenceResolver.current = null;
		setBibleReferencePickerOpen(false);
	}, []);

	return (
		<>
			<form
				className="note-composer mt-3"
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
					</aside>
					<main className="note-editor-card">
						<form.Field name="content">
							{(field) => {
								const error = field.state.meta.errors[0]?.message;
								return (
									<div data-invalid={error ? true : undefined}>
										{editorMode === "write" ? (
											<form.Subscribe selector={(state) => state.values.title}>
												{(title) => (
													<form.Subscribe
														selector={(state) => state.isSubmitting}
													>
														{(isSubmitting) => (
															<RichTextEditorWorkspace
																ariaLabel="Note content"
																contentClassName="[&_.ProseMirror]:min-h-96"
																editable
																editorHeader={
																	<>
																		<form.Field name="title">
																			{(titleField) => (
																				<NoteTitleField field={titleField} />
																			)}
																		</form.Field>
																		<div className="note-content-heading">
																			<label
																				className="note-field-label"
																				htmlFor={field.name}
																			>
																				Content{" "}
																				<span aria-hidden="true">*</span>
																			</label>
																			<EditorModeToggle
																				editorMode={editorMode}
																				onChange={setEditorMode}
																			/>
																		</div>
																	</>
																}
																footer={
																	<div className="note-editor-footer">
																		<span>/ Type / for commands...</span>
																		<form.Subscribe
																			selector={(state) =>
																				getWordCount(state.values.content)
																			}
																		>
																			{(wordCount) => (
																				<span>{wordCount} words</span>
																			)}
																		</form.Subscribe>
																	</div>
																}
																focusedModeStatus={
																	isSubmitting
																		? "Saving…"
																		: focusedSaveStatus(autosaveStatus)
																}
																focusedModeTitle={title || "Untitled note"}
																id={field.name}
																inspectorFooter={
																	<div className="note-inspector-footer">
																		<form.Subscribe
																			selector={(state) => state.values.tags}
																		>
																			{(tags) => (
																				<DraftTags
																					tags={tags}
																					onChange={(nextTags) =>
																						form.setFieldValue("tags", nextTags)
																					}
																				/>
																			)}
																		</form.Subscribe>
																		<NoteInspectorDetails
																			content={field.state.value}
																		/>
																	</div>
																}
																onChange={field.handleChange}
																onRequestBibleReference={requestBibleReference}
																details={
																	<NoteDetails status={autosaveStatus} />
																}
																organization={<NoteOrganization />}
																placeholder="Start writing your note here…"
																presentation="composer"
																preset="member"
																tags={
																	<form.Subscribe
																		selector={(state) => state.values.tags}
																	>
																		{(tags) => (
																			<DraftTags
																				tags={tags}
																				onChange={(nextTags) =>
																					form.setFieldValue("tags", nextTags)
																				}
																			/>
																		)}
																	</form.Subscribe>
																}
																value={field.state.value}
															/>
														)}
													</form.Subscribe>
												)}
											</form.Subscribe>
										) : (
											<div className="note-preview-card">
												<form.Field name="title">
													{(titleField) => (
														<NoteTitleField field={titleField} />
													)}
												</form.Field>
												<div className="note-content-heading">
													<label
														className="note-field-label"
														htmlFor={field.name}
													>
														Content <span aria-hidden="true">*</span>
													</label>
													<EditorModeToggle
														editorMode={editorMode}
														onChange={setEditorMode}
													/>
												</div>
												<RichTextRenderer
													ariaLabel="Note content preview"
													document={field.state.value}
													preset="member"
												/>
											</div>
										)}
										{error ? <FieldError>{error}</FieldError> : null}
									</div>
								);
							}}
						</form.Field>
					</main>
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
								{onAutosave ? (
									<NoteAutosaveStatus
										initialValues={initialValues}
										isManualSaveInProgress={isSubmitting}
										onSave={queueAutosave}
										onStatusChange={setAutosaveStatus}
										values={values}
									/>
								) : null}
								<div className="note-save-buttons">
									<Button
										disabled={isSubmitting}
										onClick={() =>
											isDirty ? setDiscardDialogOpen(true) : onCancel()
										}
										type="button"
										variant="ghost"
									>
										Cancel
									</Button>
									<Button
										disabled={!canSubmit || isSubmitting}
										onClick={() => void queueDraftSave(values)}
										type="button"
										variant="outline"
									>
										<FileTextIcon aria-hidden="true" data-icon="inline-start" />
										Save as draft
									</Button>
									<Button
										className="note-primary-save"
										disabled={!canSubmit || isSubmitting}
										type="submit"
									>
										{isSubmitting ? (
											<Spinner aria-hidden="true" data-icon="inline-start" />
										) : (
											<SaveIcon aria-hidden="true" data-icon="inline-start" />
										)}
										{submitLabel}
									</Button>
								</div>
								{submitError ? <FieldError>{submitError}</FieldError> : null}
							</div>
						)}
					</form.Subscribe>
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
			<PassagePickerDialog
				error={
					hasLoadError ? "Passages are unavailable. Please try again." : null
				}
				onOpenChange={closeBibleReferencePicker}
				onSelect={selectBibleReference}
				open={bibleReferencePickerOpen}
				passages={passages}
			/>
		</>
	);
}

function focusedSaveStatus(status: "idle" | "saving" | "saved" | "failed") {
	if (status === "saving") return "Saving…";
	if (status === "failed") return "Save failed";
	if (status === "idle") return "Unsaved changes";
	return "Saved";
}

function NoteTitleField({
	field,
}: {
	field: {
		handleBlur: () => void;
		handleChange: (value: string) => void;
		name: string;
		state: {
			meta: { errors: Array<unknown> };
			value: string;
		};
	};
}) {
	const firstError = field.state.meta.errors[0];
	const error =
		firstError && typeof firstError === "object" && "message" in firstError
			? String(firstError.message ?? "")
			: undefined;
	return (
		<div data-invalid={error ? true : undefined}>
			<label className="note-field-label" htmlFor={field.name}>
				Note Title <span aria-hidden="true">*</span>
			</label>
			<Input
				className="note-title-input"
				id={field.name}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				placeholder="Enter note title..."
				value={field.state.value}
			/>
			{error ? <FieldError>{error}</FieldError> : null}
		</div>
	);
}

function EditorModeToggle({
	editorMode,
	onChange,
}: {
	editorMode: NoteEditorMode;
	onChange: (mode: NoteEditorMode) => void;
}) {
	return (
		<fieldset className="note-mode-toggle">
			<legend className="sr-only">Note editor mode</legend>
			<button
				aria-pressed={editorMode === "write"}
				className={editorMode === "write" ? "is-active" : undefined}
				onClick={() => onChange("write")}
				type="button"
			>
				Write
			</button>
			<button
				aria-pressed={editorMode === "preview"}
				className={editorMode === "preview" ? "is-active" : undefined}
				onClick={() => onChange("preview")}
				type="button"
			>
				Preview
			</button>
		</fieldset>
	);
}

function NoteOrganization() {
	return (
		<dl className="grid gap-1 text-muted-foreground">
			<div className="flex justify-between gap-3">
				<dt>Location</dt>
				<dd className="text-foreground">Notes</dd>
			</div>
		</dl>
	);
}

function NoteDetails({
	status,
}: {
	status: "idle" | "saving" | "saved" | "failed";
}) {
	return (
		<dl className="grid gap-1 text-muted-foreground">
			<div className="flex justify-between gap-3">
				<dt>Status</dt>
				<dd className="text-foreground">Draft</dd>
			</div>
			<div className="flex justify-between gap-3">
				<dt>Autosave</dt>
				<dd className="text-foreground">{focusedSaveStatus(status)}</dd>
			</div>
		</dl>
	);
}

function NoteInspectorDetails({ content }: { content: RichTextDocument }) {
	return (
		<section className="note-side-card note-inspector-details">
			<h2>
				<FileTextIcon aria-hidden="true" /> Note Details
			</h2>
			<dl>
				<div>
					<dt>Created</dt>
					<dd>Just now</dd>
				</div>
				<div>
					<dt>Last edited</dt>
					<dd>Just now</dd>
				</div>
				<div>
					<dt>Word count</dt>
					<dd>{getWordCount(content)} words</dd>
				</div>
			</dl>
		</section>
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
	const copyReference = () => {
		if (selected && navigator.clipboard) {
			void navigator.clipboard.writeText(selected.label);
		}
	};
	return (
		<section className="note-passage-card">
			<h2>
				<BookOpenIcon aria-hidden="true" /> Linked Passage
			</h2>
			{selected ? (
				<>
					<Link
						className="note-passage-preview"
						search={{ passage: selected.id }}
						to="/bible"
					>
						<span>{selected.label}</span>
						<ExternalLinkIcon aria-hidden="true" />
						<small>Open the linked Scripture passage</small>
					</Link>
					<p className="note-passage-change-label">
						<LinkIcon aria-hidden="true" /> Change passage
					</p>
				</>
			) : (
				<>
					<h3 className="note-passage-reference">Choose a passage</h3>
					<p className="note-passage-copy">
						Select the Scripture passage that your note will remain connected
						to.
					</p>
				</>
			)}
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
			{selected ? (
				<div className="note-passage-actions">
					<Link search={{ passage: selected.id }} to="/bible">
						<BookOpenIcon aria-hidden="true" /> Open in reader
					</Link>
					<button onClick={copyReference} type="button">
						<CopyIcon aria-hidden="true" /> Copy reference
					</button>
					<Link search={{ passage: selected.id }} to="/bible">
						<ExternalLinkIcon aria-hidden="true" /> View context
					</Link>
				</div>
			) : (
				<Link className="note-browse-scripture" to="/bible">
					Browse Scripture <span aria-hidden="true">→</span>
				</Link>
			)}
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
			<p>Add tags to organize your notes.</p>
			<Input
				onChange={(event) => setValue(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						addTag();
					}
				}}
				placeholder="Add a tag..."
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

function PassagePickerDialog({
	error,
	onOpenChange,
	onSelect,
	open,
	passages,
}: {
	error: string | null;
	onOpenChange: (open: boolean) => void;
	onSelect: (passage: PassageOption) => void;
	open: boolean;
	passages: PassageOption[] | null;
}) {
	const [passageId, setPassageId] = useState("");
	const selectedPassage = passages?.find(
		(passage) => passage.id.toString() === passageId,
	);

	useEffect(() => {
		if (open) setPassageId("");
	}, [open]);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Insert Bible passage</DialogTitle>
					<DialogDescription>
						Choose the Scripture passage to reference in this note.
					</DialogDescription>
				</DialogHeader>
				<NativeSelect
					aria-label="Bible passage"
					disabled={passages === null || Boolean(error)}
					onChange={(event) => setPassageId(event.target.value)}
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
				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={!selectedPassage}
						onClick={() => selectedPassage && onSelect(selectedPassage)}
						type="button"
					>
						Insert passage
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
