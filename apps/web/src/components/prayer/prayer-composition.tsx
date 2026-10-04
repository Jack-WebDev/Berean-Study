import {
	emptyRichTextDocument,
	getWordCount,
	parsePersistedRichText,
	type RichTextDocument,
	RichTextEditorWorkspace,
	RichTextRenderer,
	serializePersistedRichText,
} from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@berean-study/ui/components/field";
import { Input } from "@berean-study/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	BookOpenIcon,
	CopyIcon,
	ExternalLinkIcon,
	LinkIcon,
	PlusIcon,
	SaveIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getPassageOptions } from "@/functions/passages";
import { createPrayer, getPrayer, updatePrayer } from "@/functions/prayers";

type PrayerEditorMode = "preview" | "write";
type PassageOption = Awaited<ReturnType<typeof getPassageOptions>>[number];

type PrayerDraft = {
	category: string;
	content: RichTextDocument;
	passageId: number | null;
	title: string;
};

type PrayerInput = {
	category: string | null;
	content: string;
	passageId: number | null;
	title: string;
};

type SaveResult = { error: string; ok: false } | { ok: true };

const emptyPrayerDraft: PrayerDraft = {
	category: "",
	content: emptyRichTextDocument,
	passageId: null,
	title: "",
};

function preparePrayerInput(draft: PrayerDraft): PrayerInput {
	return {
		category: draft.category.trim() || null,
		content: serializePersistedRichText(draft.content),
		passageId: draft.passageId,
		title: draft.title.trim(),
	};
}

function usePassageOptions() {
	const [passages, setPassages] = useState<PassageOption[] | null>(null);
	const [hasLoadError, setHasLoadError] = useState(false);

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

	return { hasLoadError, passages };
}

function usePrayerComposition({
	initialDraft,
	onSave,
	saveErrorMessage,
}: {
	initialDraft: PrayerDraft;
	onSave: (input: PrayerInput) => Promise<void>;
	saveErrorMessage: string;
}) {
	const [draft, setDraft] = useState(initialDraft);
	const [isSaving, setIsSaving] = useState(false);
	const { hasLoadError, passages } = usePassageOptions();

	const save = async (): Promise<SaveResult> => {
		const input = preparePrayerInput(draft);
		if (!input.title) {
			return { error: "Enter a title for your prayer.", ok: false };
		}

		setIsSaving(true);
		try {
			await onSave(input);
			return { ok: true };
		} catch {
			return { error: saveErrorMessage, ok: false };
		} finally {
			setIsSaving(false);
		}
	};

	return {
		draft,
		hasPassageLoadError: hasLoadError,
		isSaving,
		passages,
		save,
		setCategory: (category: string) =>
			setDraft((current) => ({ ...current, category })),
		setContent: (content: RichTextDocument) =>
			setDraft((current) => ({ ...current, content })),
		setPassageId: (passageId: number | null) =>
			setDraft((current) => ({ ...current, passageId })),
		setTitle: (title: string) => setDraft((current) => ({ ...current, title })),
	};
}

export function NewPrayerPage() {
	const navigate = useNavigate({ from: "/library/prayers/new" });
	const [editorMode, setEditorMode] = useState<PrayerEditorMode>("write");
	const [submitError, setSubmitError] = useState<string | null>(null);
	const composition = usePrayerComposition({
		initialDraft: emptyPrayerDraft,
		onSave: async (input) => {
			await createPrayer({ data: input });
			toast.success("Prayer saved.");
			navigate({ to: "/library/prayers" });
		},
		saveErrorMessage: "We couldn't save your prayer. Please try again.",
	});
	const savePrayer = async () => {
		setSubmitError(null);
		const result = await composition.save();
		setSubmitError(result.ok ? null : result.error);
	};

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
						<span className="text-muted-foreground">/ Create prayer</span>
					</Link>
					<h1 className="mt-3 font-serif text-3xl leading-10 tracking-[-0.03em] sm:text-4xl">
						New Prayer
					</h1>
					<p className="mt-1 font-serif text-muted-foreground text-sm leading-5 sm:text-base">
						Record a prayer so you can revisit it and reflect on God’s
						faithfulness over time.
					</p>
				</header>
				<form
					className="note-composer mt-3"
					onKeyDown={(event) => {
						if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
							event.preventDefault();
							void savePrayer();
						}
					}}
					onSubmit={(event) => {
						event.preventDefault();
						void savePrayer();
					}}
				>
					<div className="prayer-composer-layout">
						<aside className="note-context-column" aria-label="Passage context">
							<PrayerPassageCard
								error={
									composition.hasPassageLoadError
										? "Passages are unavailable. Please try again."
										: undefined
								}
								onChange={composition.setPassageId}
								passageId={composition.draft.passageId}
								passages={composition.passages}
							/>
						</aside>
						<main className="note-editor-card">
							{editorMode === "write" ? (
								<RichTextEditorWorkspace
									ariaLabel="Prayer content"
									contentClassName="[&_.ProseMirror]:min-h-96"
									editable
									editorHeader={
										<>
											<PrayerEditorHeader
												category={composition.draft.category}
												onCategoryChange={composition.setCategory}
												onTitleChange={composition.setTitle}
												title={composition.draft.title}
											/>
											<PrayerContentHeading
												editorMode={editorMode}
												onModeChange={setEditorMode}
											/>
										</>
									}
									footer={
										<div className="note-editor-footer">
											<span>/ Type / for commands...</span>
											<span>
												{getWordCount(composition.draft.content)} words
											</span>
										</div>
									}
									focusedModeStatus={
										composition.isSaving ? "Saving…" : "Unsaved changes"
									}
									focusedModeTitle={
										composition.draft.title || "Untitled prayer"
									}
									id="prayer-content"
									onChange={composition.setContent}
									organization={<PrayerOrganization />}
									placeholder="Write your prayer…"
									presentation="composer"
									preset="member"
									value={composition.draft.content}
								/>
							) : (
								<div className="note-preview-card">
									<PrayerEditorHeader
										category={composition.draft.category}
										onCategoryChange={composition.setCategory}
										onTitleChange={composition.setTitle}
										title={composition.draft.title}
									/>
									<PrayerContentHeading
										editorMode={editorMode}
										onModeChange={setEditorMode}
										preview
									/>
									<RichTextRenderer
										ariaLabel="Prayer content preview"
										document={composition.draft.content}
										preset="member"
									/>
								</div>
							)}
						</main>
						<div className="prayer-save-actions">
							<Button
								disabled={composition.isSaving}
								onClick={() => navigate({ to: "/library/prayers" })}
								type="button"
								variant="ghost"
							>
								Cancel
							</Button>
							<div className="note-save-buttons">
								<Button disabled={composition.isSaving} type="submit">
									{composition.isSaving ? null : (
										<SaveIcon aria-hidden="true" data-icon="inline-start" />
									)}
									{composition.isSaving ? "Saving…" : "Save prayer"}
								</Button>
							</div>
						</div>
						{submitError ? <FieldError>{submitError}</FieldError> : null}
					</div>
				</form>
			</div>
		</div>
	);
}

export function EditPrayerPage({ prayerId }: { prayerId: number }) {
	const [loadedPrayer, setLoadedPrayer] = useState<PrayerDraft | null>(null);
	const [notFound, setNotFound] = useState(false);
	const loadPrayer = useCallback(async () => {
		try {
			const prayer = await getPrayer({ data: { id: prayerId } });
			if (!prayer) {
				setNotFound(true);
				return;
			}
			setLoadedPrayer({
				category: prayer.category ?? "",
				content: parsePersistedRichText(prayer.content),
				passageId: prayer.passageId,
				title: prayer.title,
			});
		} catch {
			setNotFound(true);
		}
	}, [prayerId]);

	useEffect(() => {
		void loadPrayer();
	}, [loadPrayer]);

	if (notFound)
		return <p className="p-6 text-muted-foreground">Prayer not found.</p>;
	if (!loadedPrayer)
		return <p className="p-6 text-muted-foreground">Loading prayer…</p>;

	return <EditPrayerEditor initialDraft={loadedPrayer} prayerId={prayerId} />;
}

function EditPrayerEditor({
	initialDraft,
	prayerId,
}: {
	initialDraft: PrayerDraft;
	prayerId: number;
}) {
	const composition = usePrayerComposition({
		initialDraft,
		onSave: async (input) => {
			const prayer = await updatePrayer({ data: { ...input, id: prayerId } });
			if (!prayer) throw new Error("Prayer not found.");
			toast.success("Prayer updated.");
		},
		saveErrorMessage: "We couldn't update your prayer. Please try again.",
	});
	const savePrayer = async () => {
		const result = await composition.save();
		if (!result.ok) toast.error(result.error);
	};

	return (
		<div className="min-h-full bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
			<main className="mx-auto w-full max-w-360">
				<Link
					className="inline-flex items-center gap-2 font-medium text-primary text-xs hover:underline"
					params={{ prayerId }}
					to="/library/prayers"
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
									composition.hasPassageLoadError
										? "Passages are unavailable. Please try again."
										: undefined
								}
								onChange={composition.setPassageId}
								passageId={composition.draft.passageId}
								passages={composition.passages}
							/>
						</aside>
						<main className="note-editor-card">
							<RichTextEditorWorkspace
								ariaLabel="Prayer content"
								contentClassName="[&_.ProseMirror]:min-h-96"
								editable
								editorHeader={
									<PrayerEditorHeader
										category={composition.draft.category}
										onCategoryChange={composition.setCategory}
										onTitleChange={composition.setTitle}
										title={composition.draft.title}
										titlePresentation="edit"
									/>
								}
								focusedModeTitle={composition.draft.title || "Untitled prayer"}
								onChange={composition.setContent}
								placeholder="Write your prayer…"
								presentation="composer"
								preset="member"
								value={composition.draft.content}
							/>
						</main>
						<div className="prayer-save-actions">
							<Button render={<Link to="/library/prayers" />} variant="ghost">
								Cancel
							</Button>
							<Button disabled={composition.isSaving} type="submit">
								{composition.isSaving ? null : (
									<SaveIcon data-icon="inline-start" />
								)}
								{composition.isSaving ? "Saving…" : "Save changes"}
							</Button>
						</div>
					</div>
				</form>
			</main>
		</div>
	);
}

function PrayerPassageCard({
	error,
	onChange,
	passageId,
	passages,
}: {
	error?: string;
	onChange: (value: number | null) => void;
	passageId: number | null;
	passages: PassageOption[] | null;
}) {
	const selected = passages?.find((passage) => passage.id === passageId);
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
						Select the Scripture passage that this prayer will remain connected
						to.
					</p>
				</>
			)}
			<NativeSelect
				aria-label="Linked passage"
				disabled={passages === null || Boolean(error)}
				onChange={(event) =>
					onChange(event.target.value ? Number(event.target.value) : null)
				}
				value={passageId?.toString() ?? ""}
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
				</div>
			) : (
				<Link className="note-browse-scripture" to="/bible">
					Browse Scripture <span aria-hidden="true">→</span>
				</Link>
			)}
		</section>
	);
}

function PrayerEditorHeader({
	category,
	onCategoryChange,
	onTitleChange,
	title,
	titlePresentation = "new",
}: {
	category: string;
	onCategoryChange: (value: string) => void;
	onTitleChange: (value: string) => void;
	title: string;
	titlePresentation?: "edit" | "new";
}) {
	return (
		<FieldGroup className="gap-3">
			<Field>
				{titlePresentation === "new" ? (
					<PrayerTitleField onChange={onTitleChange} value={title} />
				) : (
					<>
						<FieldLabel htmlFor="prayer-title">Prayer Title</FieldLabel>
						<Input
							id="prayer-title"
							onChange={(event) => onTitleChange(event.target.value)}
							value={title}
						/>
					</>
				)}
			</Field>
			<PrayerCategories category={category} onChange={onCategoryChange} />
		</FieldGroup>
	);
}

function PrayerTitleField({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<div>
			<label className="note-field-label" htmlFor="prayer-title">
				Prayer Title <span aria-hidden="true">*</span>
			</label>
			<Input
				className="note-title-input"
				id="prayer-title"
				onChange={(event) => onChange(event.target.value)}
				placeholder="Enter prayer title..."
				value={value}
			/>
		</div>
	);
}

function PrayerContentHeading({
	editorMode,
	onModeChange,
	preview = false,
}: {
	editorMode: PrayerEditorMode;
	onModeChange: (mode: PrayerEditorMode) => void;
	preview?: boolean;
}) {
	return (
		<div className="note-content-heading">
			<label
				className="note-field-label"
				htmlFor={preview ? "prayer-content-preview" : "prayer-content"}
			>
				Prayer <span aria-hidden="true">*</span>
			</label>
			<EditorModeToggle editorMode={editorMode} onChange={onModeChange} />
		</div>
	);
}

function EditorModeToggle({
	editorMode,
	onChange,
}: {
	editorMode: PrayerEditorMode;
	onChange: (mode: PrayerEditorMode) => void;
}) {
	return (
		<fieldset className="note-mode-toggle">
			<legend className="sr-only">Prayer editor mode</legend>
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

function PrayerCategories({
	category,
	onChange,
}: {
	category: string;
	onChange: (value: string) => void;
}) {
	const [customCategory, setCustomCategory] = useState("");
	const standardCategories = [
		"Guidance",
		"Family",
		"Healing",
		"Work",
		"Thanksgiving",
	];
	const categories = [
		...standardCategories,
		...(category && !standardCategories.includes(category) ? [category] : []),
	];
	const addCustomCategory = () => {
		const nextCategory = customCategory.trim();
		if (!nextCategory) return;
		onChange(nextCategory);
		setCustomCategory("");
	};

	return (
		<Field>
			<FieldLabel>Category (optional)</FieldLabel>
			<ToggleGroup
				className="flex w-full flex-wrap gap-2"
				multiple={false}
				onValueChange={(values) => onChange(values[0] ?? "")}
				value={category ? [category] : []}
			>
				{categories.map((item) => (
					<ToggleGroupItem
						className="h-6 rounded-full bg-muted px-3 text-[11px] data-pressed:bg-primary/10 data-pressed:text-primary"
						key={item}
						value={item}
					>
						{item}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<FieldDescription>
				{category ? `Selected category: ${category}` : "No category selected."}
			</FieldDescription>
			<InputGroup>
				<InputGroupInput
					aria-label="Custom category"
					onChange={(event) => setCustomCategory(event.target.value)}
					onKeyDown={(event) => {
						if (event.key !== "Enter") return;
						event.preventDefault();
						addCustomCategory();
					}}
					placeholder="Add a custom category"
					value={customCategory}
				/>
				<InputGroupAddon align="inline-end">
					<InputGroupButton
						disabled={!customCategory.trim()}
						onClick={addCustomCategory}
						variant="outline"
					>
						<PlusIcon aria-hidden="true" data-icon="inline-start" />
						Add custom
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
		</Field>
	);
}

function PrayerOrganization() {
	return (
		<dl className="grid gap-1 text-muted-foreground">
			<div className="flex justify-between gap-3">
				<dt>Location</dt>
				<dd className="text-foreground">Prayers</dd>
			</div>
		</dl>
	);
}
