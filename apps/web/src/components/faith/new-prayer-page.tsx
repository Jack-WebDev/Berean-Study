import {
	emptyRichTextDocument,
	getWordCount,
	type RichTextDocument,
	RichTextEditorWorkspace,
	RichTextRenderer,
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPassageOptions } from "@/functions/passages";
import { createPrayer } from "@/functions/prayers";

type PrayerEditorMode = "preview" | "write";
export type PassageOption = Awaited<
	ReturnType<typeof getPassageOptions>
>[number];

export function NewPrayerPage() {
	const navigate = useNavigate({ from: "/library/prayers/new" });
	const [title, setTitle] = useState("");
	const [content, setContent] = useState<RichTextDocument>(
		emptyRichTextDocument,
	);
	const [category, setCategory] = useState("");
	const [passageId, setPassageId] = useState("");
	const [passages, setPassages] = useState<PassageOption[] | null>(null);
	const [hasPassageLoadError, setHasPassageLoadError] = useState(false);
	const [editorMode, setEditorMode] = useState<PrayerEditorMode>("write");
	const [isSaving, setIsSaving] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

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
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			setSubmitError("Enter a title for your prayer.");
			return;
		}
		setIsSaving(true);
		setSubmitError(null);
		try {
			await createPrayer({
				data: {
					category: category || null,
					content: JSON.stringify(content),
					passageId: passageId ? Number(passageId) : null,
					title: trimmedTitle,
				},
			});
			toast.success("Prayer saved.");
			navigate({ to: "/library/prayers" });
		} catch {
			setSubmitError("We couldn't save your prayer. Please try again.");
		} finally {
			setIsSaving(false);
		}
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
									hasPassageLoadError
										? "Passages are unavailable. Please try again."
										: undefined
								}
								onChange={setPassageId}
								passageId={passageId}
								passages={passages}
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
												category={category}
												onCategoryChange={setCategory}
												onTitleChange={setTitle}
												title={title}
											/>
											<div className="note-content-heading">
												<label
													className="note-field-label"
													htmlFor="prayer-content"
												>
													Prayer <span aria-hidden="true">*</span>
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
											<span>{getWordCount(content)} words</span>
										</div>
									}
									focusedModeStatus={isSaving ? "Saving…" : "Unsaved changes"}
									focusedModeTitle={title || "Untitled prayer"}
									id="prayer-content"
									onChange={setContent}
									organization={<PrayerOrganization />}
									placeholder="Write your prayer…"
									presentation="composer"
									preset="member"
									value={content}
								/>
							) : (
								<div className="note-preview-card">
									<PrayerEditorHeader
										category={category}
										onCategoryChange={setCategory}
										onTitleChange={setTitle}
										title={title}
									/>
									<div className="note-content-heading">
										<label
											className="note-field-label"
											htmlFor="prayer-content-preview"
										>
											Prayer <span aria-hidden="true">*</span>
										</label>
										<EditorModeToggle
											editorMode={editorMode}
											onChange={setEditorMode}
										/>
									</div>
									<RichTextRenderer
										ariaLabel="Prayer content preview"
										document={content}
										preset="member"
									/>
								</div>
							)}
						</main>
						<div className="prayer-save-actions">
							<Button
								disabled={isSaving}
								onClick={() => navigate({ to: "/library/prayers" })}
								type="button"
								variant="ghost"
							>
								Cancel
							</Button>
							<div className="note-save-buttons">
								<Button disabled={isSaving} type="submit">
									{isSaving ? null : (
										<SaveIcon aria-hidden="true" data-icon="inline-start" />
									)}
									{isSaving ? "Saving…" : "Save prayer"}
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

export function PrayerPassageCard({
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
						Select the Scripture passage that this prayer will remain connected
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
				</div>
			) : (
				<Link className="note-browse-scripture" to="/bible">
					Browse Scripture <span aria-hidden="true">→</span>
				</Link>
			)}
		</section>
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

function PrayerEditorHeader({
	category,
	onCategoryChange,
	onTitleChange,
	title,
}: {
	category: string;
	onCategoryChange: (value: string) => void;
	onTitleChange: (value: string) => void;
	title: string;
}) {
	return (
		<FieldGroup className="gap-3">
			<Field>
				<PrayerTitleField onChange={onTitleChange} value={title} />
			</Field>
			<PrayerCategories category={category} onChange={onCategoryChange} />
		</FieldGroup>
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

export function PrayerCategories({
	category,
	onChange,
}: {
	category: string;
	onChange: (value: string) => void;
}) {
	const [customCategory, setCustomCategory] = useState("");
	const categories = [
		"Guidance",
		"Family",
		"Healing",
		"Work",
		"Thanksgiving",
		...(category &&
		!["Guidance", "Family", "Healing", "Work", "Thanksgiving"].includes(
			category,
		)
			? [category]
			: []),
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
