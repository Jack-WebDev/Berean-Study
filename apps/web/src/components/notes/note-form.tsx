import {
	type EditorSession,
	getDocumentVerseBlocks,
	getEstimatedReadingTime,
	getLinkedVerseCount,
	getWordCount,
	hasRichTextContent,
	type PassageMentionSource,
	type RichTextDocument,
	RichTextEditor,
	type VerseBlockAttributes,
	VerseBlockProvider,
	type VerseBlockSource,
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
import { FieldError } from "@berean-study/ui/components/field";
import { useSidebar } from "@berean-study/ui/components/sidebar";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { deleteNote, restoreNoteVersion } from "@/functions/notes";
import { noteKeys } from "@/queries/keys";
import { invalidateNoteQueries } from "@/queries/notes";

import { duplicateNote } from "./note-actions";
import { NoteDetailsTab } from "./note-details-tab";
import { NoteEmptyState } from "./note-empty-state";
import { downloadTextFile, noteToPlainText, toFileName } from "./note-export";
import { NoteOutlineTab } from "./note-outline-tab";
import { NotePageHeader } from "./note-page-header";
import { LinkPassageDialog, VersePickerDialog } from "./note-passage-pickers";
import { type FocusedVerse, NotePassageTab } from "./note-passage-tab";
import {
	NoteProperties,
	notePropertyIds,
	PassageProperty,
	PurposeProperty,
	TagsProperty,
} from "./note-properties";
import {
	type NoteFormValues,
	NoteSaveStatus,
	type SavedNote,
	type StoredNote,
	useNoteAutosave,
	useNoteSaveLifecycle,
} from "./note-save-lifecycle";
import {
	filterPassageOptions,
	useLoadVerses,
	useNoteTagSuggestions,
	usePassageOptions,
	usePreferredTranslation,
} from "./note-study-data";
import { NoteStudyPanel, useStudyTab } from "./note-study-panel";
import { NoteTitleInput } from "./note-title-input";
import type { NoteEditorFocus } from "./types";

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
		.refine(hasRichTextContent, "Write a note before saving."),
	passageIds: z.array(z.number().int().positive()).max(20),
	purpose: z
		.enum(["observation", "reflection", "application", "prayer"])
		.nullable(),
	tags: z.array(z.string().trim().min(1).max(50)).max(20),
});

type PendingVerseRequest = (verse: VerseBlockAttributes | null) => void;

/**
 * The note composer: title, properties and editor beside a study panel.
 * Pages decide where to go after saving, leaving, deleting or duplicating.
 */
export function NoteForm({
	initialFocus,
	initialNote,
	initialValues,
	isNew,
	onDeleted,
	onDuplicated,
	onLeave,
	onSaved,
	submitLabel,
}: {
	/** The field to focus first, when a library prompt opened the editor. */
	initialFocus?: NoteEditorFocus;
	initialNote?: StoredNote;
	initialValues: NoteFormValues;
	isNew: boolean;
	onDeleted: () => void;
	onDuplicated: (noteId: number) => void;
	onLeave: () => void;
	onSaved: (note: SavedNote, values: NoteFormValues) => Promise<void> | void;
	submitLabel: string;
}) {
	const passageOptions = usePassageOptions();
	const passages = passageOptions.data ?? null;
	const preferredTranslation = usePreferredTranslation();
	const translation = preferredTranslation.data?.abbreviation ?? null;
	const tagSuggestions = useNoteTagSuggestions();
	const { markStored, save, storedNote, whenIdle } =
		useNoteSaveLifecycle(initialNote);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isLeaving, setIsLeaving] = useState(false);
	const [session, setSession] = useState<EditorSession | null>(null);
	const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(
		null,
	);
	const [tab, setTab] = useStudyTab();
	const [activePassageId, setActivePassageId] = useState<number | null>(
		initialValues.passageIds[0] ?? null,
	);
	const [panelTranslationId, setPanelTranslationId] = useState<number | null>(
		null,
	);
	const [focusedVerse, setFocusedVerse] = useState<FocusedVerse | null>(null);
	const [isFocusMode, setIsFocusMode] = useFocusMode();
	const [linkDialogOpen, setLinkDialogOpen] = useState(false);
	const [verseDialogOpen, setVerseDialogOpen] = useState(false);
	const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const pendingVerseRequest = useRef<PendingVerseRequest | null>(null);
	const markSavedRef = useRef<(values: NoteFormValues) => void>(() => {});

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }) => {
			setSubmitError(null);
			try {
				const note = await save(value, { status: "saved" });
				markSavedRef.current(value);
				await onSaved(note, value);
			} catch {
				setSubmitError("Unable to save your note. Please try again.");
			}
		},
		validators: { onSubmit: noteFormSchema },
	});
	const values = useStore(form.store, (state) => state.values);
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
	const queryClient = useQueryClient();

	// Autosave pauses while a version is restored, so a save of the old text
	// can't land after it.
	const restoreMutation = useMutation({
		mutationFn: async (versionId: number) => {
			const noteId = await whenIdle();
			if (noteId === undefined) throw new Error("Note not saved yet.");
			const restored = await restoreNoteVersion({
				data: { id: noteId, versionId },
			});
			if (!restored) throw new Error("Version not found.");
			return restored;
		},
		onSuccess: (restored) => {
			const restoredValues = {
				...form.state.values,
				content: restored.content,
				title: restored.title,
			};
			form.setFieldValue("content", restored.content);
			form.setFieldValue("title", restored.title);
			markSavedRef.current(restoredValues);
			markStored(restored);
			toast.success("Earlier version restored.");
			return invalidateNoteQueries(queryClient);
		},
		onError: () =>
			toast.error("Unable to restore that version. Please try again."),
	});

	const autosave = useNoteAutosave({
		initialValues,
		isManualSaveInProgress:
			isSubmitting || isLeaving || restoreMutation.isPending,
		noteStatus: storedNote?.status ?? null,
		onSave: save,
		values,
	});
	markSavedRef.current = autosave.markSaved;

	const linkedPassages = useMemo(
		() =>
			values.passageIds.map(
				(id) =>
					passages?.find((passage) => passage.id === id) ?? {
						id,
						label: "Linked passage",
					},
			),
		[passages, values.passageIds],
	);
	const shownPassageId =
		activePassageId !== null && values.passageIds.includes(activePassageId)
			? activePassageId
			: (values.passageIds[0] ?? null);
	const quotedVerses = useMemo(
		() => getDocumentVerseBlocks(values.content),
		[values.content],
	);
	const isEmpty = !hasRichTextContent(values.content);

	const linkPassage = useCallback(
		(passageId: number) => {
			const current = form.getFieldValue("passageIds");
			if (!current.includes(passageId))
				form.setFieldValue("passageIds", [...current, passageId]);
			setActivePassageId(passageId);
		},
		[form],
	);
	const unlinkPassage = (passageId: number) =>
		form.setFieldValue(
			"passageIds",
			form.getFieldValue("passageIds").filter((id) => id !== passageId),
		);

	const quoteVerse = (verse: VerseBlockAttributes) => {
		if (session?.insertVerseBlock(verse)) linkPassage(verse.passageId);
	};

	const requestVerse = useCallback(
		() =>
			new Promise<VerseBlockAttributes | null>((resolve) => {
				pendingVerseRequest.current?.(null);
				pendingVerseRequest.current = resolve;
				setVerseDialogOpen(true);
			}),
		[],
	);
	const settleVerseRequest = (verse: VerseBlockAttributes | null) => {
		pendingVerseRequest.current?.(verse);
		pendingVerseRequest.current = null;
		setVerseDialogOpen(false);
		if (verse) linkPassage(verse.passageId);
	};
	useEffect(() => () => pendingVerseRequest.current?.(null), []);

	const loadVerses = useLoadVerses();
	const verseSource = useMemo<VerseBlockSource>(
		() => ({
			loadVerses,
			onOpen: (verse) => {
				setIsFocusMode(false);
				linkPassage(verse.passageId);
				setFocusedVerse({
					chapter: verse.chapter,
					passageId: verse.passageId,
					verseEnd: verse.verseEnd,
					verseStart: verse.verseStart,
				});
				setTab("passage");
			},
		}),
		[linkPassage, loadVerses, setIsFocusMode, setTab],
	);

	const deleteNoteMutation = useMutation({
		mutationFn: (noteId: number) => deleteNote({ data: { id: noteId } }),
		onSuccess: (_result, noteId) => {
			queryClient.removeQueries({ queryKey: noteKeys.detail(noteId) });
			return invalidateNoteQueries(queryClient);
		},
	});
	const passageMentions = useMemo<PassageMentionSource>(
		() => ({
			onLink: (reference) => linkPassage(reference.passageId),
			search: (query) =>
				filterPassageOptions(passages ?? [], query, 6).map((passage) => ({
					label: passage.label,
					passageId: passage.id,
				})),
		}),
		[linkPassage, passages],
	);

	const duplicateNoteMutation = useMutation({
		mutationFn: () => duplicateNote(values),
		onSuccess: (copy) => {
			void invalidateNoteQueries(queryClient);
			toast.success("Note duplicated.");
			onDuplicated(copy.id);
		},
		onError: () =>
			toast.error("Unable to duplicate this note. Please try again."),
	});

	const leave = async ({ deleteDraft }: { deleteDraft: boolean }) => {
		setIsLeaving(true);
		try {
			const noteId = deleteDraft ? await whenIdle() : undefined;
			if (noteId !== undefined) await deleteNoteMutation.mutateAsync(noteId);
			onLeave();
		} catch {
			setIsLeaving(false);
			toast.error("Unable to discard this note. Please try again.");
		}
	};
	const discard = () => {
		const hasUnsavedChanges =
			autosave.state === "pending" || autosave.state === "failed";
		const hasAnything =
			!isEmpty ||
			Boolean(values.title.trim()) ||
			values.passageIds.length > 0 ||
			values.tags.length > 0;
		if (isNew ? hasAnything : hasUnsavedChanges) setConfirmDiscardOpen(true);
		else void leave({ deleteDraft: false });
	};

	const duplicate = () => duplicateNoteMutation.mutate();
	const remove = async () => {
		setIsLeaving(true);
		try {
			const noteId = await whenIdle();
			if (noteId !== undefined) await deleteNoteMutation.mutateAsync(noteId);
			toast.success("Note deleted.");
			onDeleted();
		} catch {
			setIsLeaving(false);
			toast.error("Unable to delete this note. Please try again.");
		}
	};

	// A library prompt ("Add a title", "Set purpose"…) lands on its field.
	useEffect(() => {
		if (initialFocus === "passage") setLinkDialogOpen(true);
		else if (initialFocus === "title")
			window.document.getElementById("note-title")?.focus();
		else if (initialFocus === "purpose")
			window.document
				.querySelector<HTMLElement>(`#${notePropertyIds.purpose} button`)
				?.focus();
		else if (initialFocus === "tags")
			window.document.getElementById(notePropertyIds.tags)?.focus();
	}, [initialFocus]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isModifier = event.metaKey || event.ctrlKey;
			if (isModifier && event.shiftKey && event.key.toLowerCase() === "f") {
				event.preventDefault();
				setIsFocusMode((current) => !current);
			} else if (event.key === "Escape" && !hasOpenOverlay()) {
				// The editor marks Escape as handled, so defaultPrevented can't
				// tell us whether a dialog or menu used it; check for one instead.
				setIsFocusMode(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [setIsFocusMode]);

	return (
		<VerseBlockProvider value={verseSource}>
			{/* Inline-size containment stops long content (a long title in the
			    breadcrumb, the one-line toolbar) from widening the page on
			    narrow screens; it truncates or scrolls inside instead. */}
			<form
				className="contain-[inline-size] mx-auto w-full max-w-[1680px] px-4 pb-12 sm:px-8"
				noValidate
				onKeyDown={(event) => {
					if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
						event.preventDefault();
						void form.handleSubmit();
					}
				}}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<NotePageHeader
					breadcrumb={
						values.title.trim() || (isNew ? "New note" : "Untitled note")
					}
					isFocusMode={isFocusMode}
					isSubmitting={isSubmitting || isLeaving}
					noteId={storedNote?.id}
					onDiscard={discard}
					onToggleFocusMode={() => setIsFocusMode((current) => !current)}
					saveStatus={
						<NoteSaveStatus
							canAutosave={autosave.canAutosave}
							lastSavedAt={autosave.lastSavedAt}
							noteStatus={storedNote?.status ?? null}
							onRetry={autosave.retry}
							state={autosave.state}
						/>
					}
					submitLabel={submitLabel}
				/>
				{submitError ? (
					<FieldError className="mt-2 text-right">{submitError}</FieldError>
				) : null}

				<div className="mt-7 flex flex-wrap items-start gap-8">
					<section
						aria-label="Note editor"
						className="flex min-w-0 flex-[2.5_1_35rem] flex-col"
					>
						<form.Field name="title">
							{(field) => (
								<NoteTitleInput
									error={field.state.meta.errors[0]?.message}
									onBlur={field.handleBlur}
									onChange={field.handleChange}
									onEnter={() => session?.focusDocument()}
									value={field.state.value}
								/>
							)}
						</form.Field>

						{isFocusMode ? null : (
							<NoteProperties>
								<PassageProperty
									linkedPassages={linkedPassages}
									onLink={() => setLinkDialogOpen(true)}
									onRemove={unlinkPassage}
									translation={translation}
								/>
								<PurposeProperty
									onChange={(purpose) => form.setFieldValue("purpose", purpose)}
									purpose={values.purpose}
								/>
								<TagsProperty
									onChange={(tags) => form.setFieldValue("tags", tags)}
									suggestions={
										tagSuggestions.data?.map((tag) => tag.name) ?? []
									}
									tags={values.tags}
								/>
							</NoteProperties>
						)}

						<form.Field name="content">
							{(field) => {
								const error = field.state.meta.errors[0]?.message;
								return (
									<div className="mt-7" data-invalid={error ? true : undefined}>
										<RichTextEditor
											ariaLabel="Note body"
											className="rounded-[14px] shadow-none"
											contentClassName={noteBodyClassName(isEmpty && isNew)}
											emptyState={
												isNew ? (
													<NoteEmptyState
														onChooseTemplate={(template) =>
															session?.insertSections(template.sections)
														}
													/>
												) : undefined
											}
											footer={<NoteEditorFooter document={values.content} />}
											id={field.name}
											onActiveSectionChange={setActiveSectionIndex}
											onChange={field.handleChange}
											onRequestVerse={requestVerse}
											onSessionReady={setSession}
											passageMentions={passageMentions}
											placeholder={
												isNew
													? "Start writing, or pick a structure to guide your study."
													: "Start writing your note…"
											}
											preset="member"
											value={field.state.value}
										/>
										{error ? (
											<FieldError className="mt-2">{error}</FieldError>
										) : null}
									</div>
								);
							}}
						</form.Field>
					</section>

					{isFocusMode ? null : (
						<aside
							aria-label="Study panel"
							className="min-w-0 flex-[1_1_23.75rem]"
						>
							<NoteStudyPanel
								details={
									<NoteDetailsTab
										document={values.content}
										isRestoring={restoreMutation.isPending}
										mainPassage={linkedPassages[0] ?? null}
										onDelete={() => setConfirmDeleteOpen(true)}
										onDuplicate={duplicate}
										onExport={() =>
											downloadTextFile(
												toFileName(values.title),
												noteToPlainText(values.title, values.content),
											)
										}
										onRestoreVersion={(versionId) =>
											restoreMutation.mutate(versionId)
										}
										storedNote={storedNote}
									/>
								}
								onTabChange={setTab}
								outline={
									<NoteOutlineTab
										activeSectionIndex={activeSectionIndex}
										document={values.content}
										session={session}
									/>
								}
								passage={
									<NotePassageTab
										activePassageId={shownPassageId}
										focusedVerse={focusedVerse}
										linkedPassages={linkedPassages}
										onActivePassageChange={setActivePassageId}
										onLinkPassage={linkPassage}
										onQuote={quoteVerse}
										onTranslationChange={setPanelTranslationId}
										passages={passages}
										quotedVerses={quotedVerses}
										translation={translation}
										translationId={panelTranslationId}
									/>
								}
								tab={tab}
							/>
						</aside>
					)}
				</div>
			</form>

			<LinkPassageDialog
				excludeIds={values.passageIds}
				onOpenChange={setLinkDialogOpen}
				onSelect={(passage) => linkPassage(passage.id)}
				open={linkDialogOpen}
				passages={passages}
			/>
			<VersePickerDialog
				initialPassageId={shownPassageId}
				onOpenChange={(open) => {
					if (!open) settleVerseRequest(null);
				}}
				onSelect={settleVerseRequest}
				open={verseDialogOpen}
				passages={passages}
			/>
			<AlertDialog
				onOpenChange={setConfirmDiscardOpen}
				open={confirmDiscardOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{isNew ? "Discard this note?" : "Discard unsaved changes?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{isNew
								? "This note and anything already autosaved will be deleted."
								: "Changes since the last save will be lost. Earlier autosaves are kept."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Keep writing</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => void leave({ deleteDraft: isNew })}
							variant="destructive"
						>
							Discard
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog onOpenChange={setConfirmDeleteOpen} open={confirmDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this note?</AlertDialogTitle>
						<AlertDialogDescription>
							The note will be removed from your library and any collections.
							This can’t be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => void remove()}
							variant="destructive"
						>
							Delete note
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</VerseBlockProvider>
	);
}

function hasOpenOverlay() {
	return Boolean(
		window.document.querySelector(
			'[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
		),
	);
}

function NoteEditorFooter({ document }: { document: RichTextDocument }) {
	const linkedVerses = getLinkedVerseCount(document);
	return (
		<div className="flex flex-wrap justify-between gap-2 px-4 py-3 text-[13px] text-muted-foreground">
			<span>
				{getWordCount(document)} words · {getEstimatedReadingTime(document)} min
				read
			</span>
			<span>
				{linkedVerses
					? `${linkedVerses} linked ${linkedVerses === 1 ? "verse" : "verses"}`
					: "Markdown shortcuts supported"}
			</span>
		</div>
	);
}

/** Reading-sized note body; shorter while the empty state sits beneath it. */
function noteBodyClassName(isShowingEmptyState: boolean) {
	return [
		"text-[19px]! text-body-foreground leading-[1.65]!",
		"[&_.ProseMirror]:max-w-190! [&_.ProseMirror]:px-5! [&_.ProseMirror]:pt-8! sm:[&_.ProseMirror]:px-10!",
		isShowingEmptyState
			? "[&_.ProseMirror]:min-h-0! [&_.ProseMirror]:pb-2!"
			: "[&_.ProseMirror]:min-h-95! [&_.ProseMirror]:pb-10!",
	].join(" ");
}

/**
 * Focus mode hides the app sidebar (restoring it afterwards only if it was
 * open); the composer hides the study panel and properties itself.
 */
function useFocusMode() {
	const { open, setOpen } = useSidebar();
	const [isFocusMode, setIsFocusMode] = useState(false);
	const sidebarOpen = useRef(open);
	sidebarOpen.current = open;
	const setSidebarOpen = useRef(setOpen);
	setSidebarOpen.current = setOpen;

	useEffect(() => {
		if (!isFocusMode) return;
		const wasOpen = sidebarOpen.current;
		setSidebarOpen.current(false);
		return () => {
			if (wasOpen) setSidebarOpen.current(true);
		};
	}, [isFocusMode]);

	return [isFocusMode, setIsFocusMode] as const;
}
