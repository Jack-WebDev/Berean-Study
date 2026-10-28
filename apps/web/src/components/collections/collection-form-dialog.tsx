"use client";

import { Alert, AlertDescription } from "@berean-study/ui/components/alert";
import { Button } from "@berean-study/ui/components/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@berean-study/ui/components/field";
import { Input } from "@berean-study/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@berean-study/ui/components/input-group";
import {
	RadioGroup,
	RadioGroupItem,
} from "@berean-study/ui/components/radio-group";
import { Textarea } from "@berean-study/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	BookOpenIcon,
	CheckIcon,
	GlobeIcon,
	ListIcon,
	LockKeyholeIcon,
	type LucideIcon,
	PaletteIcon,
	PlusIcon,
	PresentationIcon,
	UsersRoundIcon,
	XIcon,
} from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { toast } from "sonner";

import { createCollection, updateCollection } from "@/functions/collections";
import { collectionKeys, communityKeys, libraryKeys } from "@/queries/keys";

import {
	coverPresets,
	coverStyle,
	defaultCoverColor,
} from "./collection-colors";
import {
	type CollectionType,
	type CollectionVisibility,
	collectionTypes,
	visibilityOptions,
} from "./collection-library";

const nameMaxLength = 100;
const duplicateNameError = "A collection with this name already exists.";

export type EditableCollection = {
	color: string;
	description: string;
	id: number;
	name: string;
	tags: readonly string[];
	type: CollectionType;
	visibility: CollectionVisibility;
};

function validateName(name: string) {
	if (!name.trim()) return "Enter a collection name.";
	if (name.trim().length > nameMaxLength) {
		return `Use no more than ${nameMaxLength} characters.`;
	}
	return null;
}

/**
 * The create and edit form, shown inside a `Dialog` the caller owns so focus
 * returns to whichever button opened it. Mount it only while open, so each
 * visit starts from the collection's saved values.
 */
export function CollectionFormDialog({
	collection,
	initialType = "project",
	onSaved,
}: {
	/** The collection to edit; omit to create a new one. */
	collection?: EditableCollection;
	/** Preselected type for a new collection, e.g. from a template. */
	initialType?: CollectionType;
	onSaved: (saved: { id: number; name: string }) => void;
}) {
	const isEditing = Boolean(collection);
	const formId = useId();
	const queryClient = useQueryClient();
	const [name, setName] = useState(collection?.name ?? "");
	// Errors wait for the first save attempt, then update as the member types.
	const [showErrors, setShowErrors] = useState(false);
	const nameError = showErrors ? validateName(name) : null;
	const [description, setDescription] = useState(collection?.description ?? "");
	const [type, setType] = useState<CollectionType>(
		collection?.type ?? initialType,
	);
	const [color, setColor] = useState(collection?.color ?? defaultCoverColor);
	const [visibility, setVisibility] = useState<CollectionVisibility>(
		collection?.visibility ?? "private",
	);
	const [tags, setTags] = useState<string[]>([...(collection?.tags ?? [])]);
	const [tagInput, setTagInput] = useState("");

	const saveMutation = useMutation({
		mutationFn: (
			input: Omit<EditableCollection, "id" | "tags"> & {
				tags: string[];
			},
		) =>
			collection
				? updateCollection({ data: { ...input, id: collection.id } })
				: createCollection({ data: input }),
		onSuccess: async (saved) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
				queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
				queryClient.invalidateQueries({
					queryKey: communityKeys.publishingResources(),
				}),
			]);
			toast.success(isEditing ? "Collection updated." : "Collection created.");
			onSaved(saved);
		},
	});
	const submissionError = saveMutation.error
		? saveMutation.error.message === duplicateNameError
			? duplicateNameError
			: isEditing
				? "We couldn't save your changes. Please try again."
				: "We couldn't create this collection. Please try again."
		: null;

	const addTag = () => {
		const tag = tagInput.trim().replace(/\s+/g, " ").replace(/^#/, "");
		if (
			tag &&
			!tags.some(
				(existing) =>
					existing.localeCompare(tag, undefined, { sensitivity: "accent" }) ===
					0,
			)
		) {
			setTags([...tags, tag]);
		}
		setTagInput("");
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setShowErrors(true);
		if (validateName(name) || saveMutation.isPending) return;
		saveMutation.mutate({ color, description, name, tags, type, visibility });
	};

	const isPresetColor = coverPresets.some((preset) => preset.value === color);

	return (
		<DialogContent
			className="flex max-h-[min(calc(100dvh-2rem),54rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 text-sm sm:max-w-160"
			showCloseButton={false}
		>
			<div className="flex items-start justify-between gap-4 border-border-subtle border-b px-5 pt-5 pb-4 sm:px-8 sm:pt-7 sm:pb-5">
				<DialogHeader className="gap-1">
					<DialogTitle className="font-normal font-serif text-[1.75rem] leading-tight tracking-[-0.02em] sm:text-3xl">
						{isEditing ? "Edit collection" : "New collection"}
					</DialogTitle>
					<DialogDescription className="text-muted-foreground text-sm">
						You can change any of this later.
					</DialogDescription>
				</DialogHeader>
				<DialogClose
					render={
						<Button
							aria-label="Close"
							className="-mt-1.5 -mr-2.5 size-11 rounded-lg text-muted-foreground hover:text-foreground"
							type="button"
							variant="ghost"
						/>
					}
				>
					<XIcon aria-hidden="true" className="size-5" />
				</DialogClose>
			</div>

			{/* Only the form scrolls; the title and the buttons stay in view. */}
			<form
				className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8"
				id={formId}
				noValidate
				onSubmit={handleSubmit}
			>
				<FieldGroup className="gap-7">
					<Field data-invalid={Boolean(nameError) || undefined}>
						<FieldLabel className={labelClassName} htmlFor={`${formId}-name`}>
							Name
						</FieldLabel>
						<Input
							aria-invalid={Boolean(nameError) || undefined}
							autoFocus
							className={inputClassName}
							id={`${formId}-name`}
							maxLength={nameMaxLength}
							onChange={(event) => setName(event.target.value)}
							placeholder="e.g. Psalms of Lament"
							required
							value={name}
						/>
						<FieldError className="text-[13px]">{nameError}</FieldError>
					</Field>

					<Field>
						<FieldLabel
							className={labelClassName}
							htmlFor={`${formId}-description`}
						>
							Description
							<span className="font-normal text-muted-foreground">
								Optional
							</span>
						</FieldLabel>
						<Textarea
							className="min-h-20 rounded-[10px] bg-card px-3.5 py-2.5 text-sm md:text-sm"
							id={`${formId}-description`}
							maxLength={280}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="What are you studying, and why?"
							rows={2}
							value={description}
						/>
					</Field>

					<FieldSet>
						<FieldLegend className={legendClassName}>
							What kind of collection?
						</FieldLegend>
						<RadioGroup
							aria-label="What kind of collection?"
							className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
							onValueChange={(value) => setType(value as CollectionType)}
							value={type}
						>
							{collectionTypes.map((option) => (
								<ChoiceCard
									description={option.description}
									icon={typeIcons[option.value]}
									id={`${formId}-type-${option.value}`}
									key={option.value}
									label={option.label}
									value={option.value}
								/>
							))}
						</RadioGroup>
					</FieldSet>

					<FieldSet>
						<FieldLegend className={legendClassName}>Cover colour</FieldLegend>
						<div className="flex flex-col gap-4">
							<div className="flex flex-wrap items-center gap-2.5">
								<RadioGroup
									aria-label="Cover colour"
									className="flex w-auto flex-wrap gap-2.5"
									onValueChange={(value) => setColor(value as string)}
									value={isPresetColor ? color : null}
								>
									{coverPresets.map((preset) => (
										<label
											className={`${swatchClassName} collection-cover has-data-checked:ring-2 has-data-checked:ring-primary has-data-checked:ring-offset-2 has-data-checked:ring-offset-popover`}
											htmlFor={`${formId}-cover-${preset.value}`}
											key={preset.value}
											style={coverStyle(preset.value)}
											title={preset.label}
										>
											<RadioGroupItem
												aria-label={preset.label}
												className="peer sr-only"
												id={`${formId}-cover-${preset.value}`}
												value={preset.value}
											/>
											<CheckIcon
												aria-hidden="true"
												className="absolute inset-0 m-auto hidden size-4 peer-data-checked:block"
												strokeWidth={2.75}
											/>
										</label>
									))}
								</RadioGroup>
								<label
									className={`${swatchClassName} ${
										isPresetColor
											? "border-[1.5px] border-input border-dashed text-muted-foreground hover:border-muted-foreground"
											: "ring-2 ring-primary ring-offset-2 ring-offset-popover"
									}`}
									style={isPresetColor ? undefined : coverStyle(color)}
									title="Choose any colour"
								>
									<input
										aria-label="Custom colour"
										className="peer absolute inset-0 size-full cursor-pointer rounded-full opacity-0"
										onChange={(event) => setColor(event.target.value)}
										type="color"
										value={color}
									/>
									{isPresetColor ? (
										<PaletteIcon
											aria-hidden="true"
											className="absolute inset-0 m-auto size-4.5"
										/>
									) : (
										<CheckIcon
											aria-hidden="true"
											className="absolute inset-0 m-auto size-4"
											strokeWidth={2.75}
										/>
									)}
								</label>
							</div>
							<div className="grid items-center gap-x-4 gap-y-2 sm:grid-cols-[11.5rem_1fr]">
								<CoverPreview color={color} />
								<p className="text-muted-foreground text-xs">
									{isPresetColor
										? "Pick a colour, or the palette for any colour you like."
										: "Custom colour. Text on the cover adjusts to stay readable."}
								</p>
							</div>
						</div>
					</FieldSet>

					<Field>
						<FieldLabel className={labelClassName} htmlFor={`${formId}-tag`}>
							Tags
							<span className="font-normal text-muted-foreground">
								Optional
							</span>
						</FieldLabel>
						<InputGroup className="h-11 rounded-[10px] bg-card">
							<InputGroupInput
								className="text-sm md:text-sm"
								id={`${formId}-tag`}
								maxLength={50}
								onChange={(event) => setTagInput(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter" && !event.nativeEvent.isComposing) {
										event.preventDefault();
										addTag();
									}
								}}
								placeholder="Type a tag and press Enter"
								value={tagInput}
							/>
							{tagInput.trim() ? (
								<InputGroupAddon align="inline-end">
									<InputGroupButton
										className="h-8 rounded-md px-2.5 font-semibold text-primary text-xs"
										onClick={addTag}
									>
										<PlusIcon aria-hidden="true" />
										Add tag
									</InputGroupButton>
								</InputGroupAddon>
							) : null}
						</InputGroup>
						{tags.length > 0 ? (
							<ul aria-label="Collection tags" className="flex flex-wrap gap-2">
								{tags.map((tag) => (
									<li
										className="flex h-8 items-center gap-0.5 rounded-full bg-secondary pr-0.5 pl-3 font-medium text-secondary-foreground text-xs"
										key={tag}
									>
										#{tag}
										<button
											aria-label={`Remove ${tag} tag`}
											className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
											onClick={() =>
												setTags(tags.filter((current) => current !== tag))
											}
											type="button"
										>
											<XIcon aria-hidden="true" className="size-3.5" />
										</button>
									</li>
								))}
							</ul>
						) : null}
					</Field>

					<FieldSet>
						<FieldLegend className={legendClassName}>
							Who can see it?
						</FieldLegend>
						<RadioGroup
							aria-label="Who can see it?"
							className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
							onValueChange={(value) =>
								setVisibility(value as CollectionVisibility)
							}
							value={visibility}
						>
							{visibilityOptions.map((option) => (
								<ChoiceCard
									badge={option.value === "private" ? undefined : "Coming soon"}
									description={option.description}
									// TODO(collections): sharing needs invites and a Community
									// listing; until then only Private can be chosen.
									disabled={option.value !== "private"}
									icon={visibilityIcons[option.value]}
									id={`${formId}-visibility-${option.value}`}
									key={option.value}
									label={option.label}
									value={option.value}
								/>
							))}
						</RadioGroup>
					</FieldSet>

					{submissionError ? (
						<Alert variant="destructive">
							<AlertDescription>{submissionError}</AlertDescription>
						</Alert>
					) : null}
				</FieldGroup>
			</form>

			<DialogFooter className="gap-2.5 border-border-subtle border-t bg-card px-5 py-4 sm:px-8">
				<DialogClose
					render={
						<Button
							className="h-11 rounded-[10px] px-4 text-sm"
							type="button"
							variant="outline"
						/>
					}
				>
					Cancel
				</DialogClose>
				<Button
					className="h-11 rounded-[10px] px-5 font-bold text-sm"
					disabled={saveMutation.isPending}
					form={formId}
					type="submit"
				>
					{saveMutation.isPending
						? isEditing
							? "Saving…"
							: "Creating…"
						: isEditing
							? "Save changes"
							: "Create and add passages"}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}

const labelClassName = "gap-1.5 font-semibold text-foreground text-sm";
const legendClassName = "mb-3 font-semibold text-foreground text-sm";
const inputClassName =
	"h-11 rounded-[10px] bg-card px-3.5 text-[15px] md:text-[15px]";
const swatchClassName =
	"relative size-11 shrink-0 cursor-pointer rounded-full has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-offset-4";

const typeIcons: Record<CollectionType, LucideIcon> = {
	list: ListIcon,
	project: BookOpenIcon,
	teaching: PresentationIcon,
};

const visibilityIcons: Record<CollectionVisibility, LucideIcon> = {
	private: LockKeyholeIcon,
	public: GlobeIcon,
	shared: UsersRoundIcon,
};

/** One option in a radio group, drawn as a card that shows when it's chosen. */
function ChoiceCard({
	badge,
	description,
	disabled = false,
	icon: Icon,
	id,
	label,
	value,
}: {
	badge?: string;
	description: string;
	disabled?: boolean;
	icon: LucideIcon;
	id: string;
	label: string;
	value: string;
}) {
	return (
		<label
			className="relative flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-input bg-card p-3.5 transition-colors hover:border-muted-foreground/50 has-data-disabled:cursor-not-allowed has-data-checked:border-primary has-data-disabled:border-dashed has-data-checked:bg-primary/5 has-data-checked:shadow-[inset_0_0_0_1px_var(--primary)] has-focus-visible:ring-2 has-focus-visible:ring-ring/50 has-data-disabled:hover:border-input sm:flex-col sm:items-start sm:gap-2.5"
			htmlFor={id}
		>
			<RadioGroupItem
				className="peer sr-only"
				disabled={disabled}
				id={id}
				value={value}
			/>
			<span
				aria-hidden="true"
				className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground peer-data-checked:bg-primary peer-data-checked:text-primary-foreground peer-data-disabled:opacity-60"
			>
				<Icon className="size-4.5" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-6 peer-data-disabled:opacity-70 sm:pr-0">
				<span className="font-semibold text-foreground">{label}</span>{" "}
				<span className="text-muted-foreground text-xs leading-snug">
					{description}
				</span>
			</span>{" "}
			{badge ? (
				<span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-semibold text-[11px] text-secondary-foreground sm:absolute sm:top-3 sm:right-3">
					{badge}
				</span>
			) : (
				<CheckIcon
					aria-hidden="true"
					className="absolute top-1/2 right-3.5 hidden size-4 -translate-y-1/2 text-primary peer-data-checked:block sm:top-3.5 sm:translate-y-0"
					strokeWidth={2.75}
				/>
			)}
		</label>
	);
}

/** A small card cover in the chosen colour, as the library will show it. */
function CoverPreview({ color }: { color: string }) {
	return (
		<div
			aria-hidden="true"
			className="collection-cover flex h-26 flex-col justify-between rounded-xl px-3.5 py-3 shadow-[inset_0_0_0_1px_color-mix(in_oklab,currentColor,transparent_88%)]"
			style={coverStyle(color)}
		>
			<span className="font-bold text-[10px] uppercase tracking-widest">
				Psalm 13:1 · Preview
			</span>
			<span className="line-clamp-2 font-serif text-[15px] italic leading-snug">
				“How long wilt thou forget me, O LORD?”
			</span>
		</div>
	);
}
