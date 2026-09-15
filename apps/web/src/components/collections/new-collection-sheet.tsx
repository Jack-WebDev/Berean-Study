"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@berean-study/ui/components/alert";
import { Button } from "@berean-study/ui/components/button";
import { Checkbox } from "@berean-study/ui/components/checkbox";
import {
	Field,
	FieldDescription,
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
import {
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@berean-study/ui/components/sheet";
import { Textarea } from "@berean-study/ui/components/textarea";
import {
	BookOpenIcon,
	CheckIcon,
	FileTextIcon,
	HighlighterIcon,
	LightbulbIcon,
	LockKeyholeIcon,
	PlusIcon,
	XIcon,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { createCollection, updateCollection } from "@/functions/collections";
import {
	type CollectionSummary,
	collectionCovers,
	toCollectionSummary,
} from "./collection-data";
import { CollectionPreview } from "./collection-preview";

const collectionNameMaxLength = 100;

const collectionContentOptions = [
	{ icon: BookOpenIcon, label: "Passages", value: "passages" },
	{ icon: FileTextIcon, label: "Notes", value: "notes" },
	{ icon: HighlighterIcon, label: "Highlights", value: "highlights" },
	{ icon: LightbulbIcon, label: "Study Themes", value: "study-themes" },
] as const;

type CollectionContentType = (typeof collectionContentOptions)[number]["value"];

type CollectionFormInput = {
	allowedContent: CollectionContentType[];
	coverId: (typeof collectionCovers)[number]["id"];
	description: string;
	name: string;
	tags: string[];
};

type EditableCollection = {
	allowedContent: string[];
	coverId: string;
	createdAt: Date;
	description: string;
	id: number;
	name: string;
	tags: string[];
	updatedAt: Date;
};

const defaultAllowedContent: Record<CollectionContentType, boolean> = {
	highlights: true,
	notes: true,
	passages: true,
	"study-themes": true,
};

function allowedContentFrom(values: readonly string[]) {
	return Object.fromEntries(
		collectionContentOptions.map((option) => [
			option.value,
			values.includes(option.value),
		]),
	) as Record<CollectionContentType, boolean>;
}

function coverIdFrom(value: string | undefined) {
	return (
		collectionCovers.find((cover) => cover.id === value)?.id ??
		collectionCovers[0].id
	);
}

function validateCollectionName(name: string) {
	if (!name.trim()) return "Enter a collection name.";
	if (name.trim().length > collectionNameMaxLength) {
		return `Use no more than ${collectionNameMaxLength} characters.`;
	}
	return null;
}

function normalizeCollectionTag(tag: string) {
	return tag.trim().replace(/\s+/g, " ");
}

export function NewCollectionSheet({
	onCreated,
}: {
	onCreated: (collection: CollectionSummary) => void;
}) {
	return (
		<CollectionFormSheet
			onSaved={(collection) => onCreated(toCollectionSummary(collection))}
			onSubmit={(input) => createCollection({ data: input })}
		/>
	);
}

export function EditCollectionSheet({
	collection,
	onUpdated,
}: {
	collection: EditableCollection;
	onUpdated: (collection: EditableCollection) => void;
}) {
	return (
		<CollectionFormSheet
			collection={collection}
			onSaved={onUpdated}
			onSubmit={(input) =>
				updateCollection({ data: { ...input, id: collection.id } })
			}
		/>
	);
}

function CollectionFormSheet({
	collection,
	onSaved,
	onSubmit,
}: {
	collection?: EditableCollection;
	onSaved: (collection: EditableCollection) => void;
	onSubmit: (input: CollectionFormInput) => Promise<EditableCollection>;
}) {
	const isEditing = Boolean(collection);
	const [description, setDescription] = useState(collection?.description ?? "");
	const [name, setName] = useState(collection?.name ?? "");
	const [nameError, setNameError] = useState<string | null>(null);
	const [hasTouchedName, setHasTouchedName] = useState(false);
	const [coverId, setCoverId] = useState<
		(typeof collectionCovers)[number]["id"]
	>(coverIdFrom(collection?.coverId));
	const [allowedContent, setAllowedContent] = useState(() =>
		collection
			? allowedContentFrom(collection.allowedContent)
			: defaultAllowedContent,
	);
	const [tagInput, setTagInput] = useState("");
	const [tags, setTags] = useState<string[]>(collection?.tags ?? []);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submissionError, setSubmissionError] = useState<string | null>(null);

	const handleNameBlur = () => {
		setHasTouchedName(true);
		setNameError(validateCollectionName(name));
	};

	const addTag = () => {
		const nextTag = normalizeCollectionTag(tagInput);
		if (nextTag) {
			setTags((currentTags) =>
				currentTags.some(
					(tag) =>
						tag.localeCompare(nextTag, undefined, { sensitivity: "accent" }) ===
						0,
				)
					? currentTags
					: [...currentTags, nextTag],
			);
		}
		setTagInput("");
	};

	const selectedCover =
		collectionCovers.find((cover) => cover.id === coverId) ??
		collectionCovers[0];
	const previewContents = collectionContentOptions.filter(
		(option) => allowedContent[option.value],
	);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setHasTouchedName(true);
		const nextNameError = validateCollectionName(name);
		setNameError(nextNameError);
		if (nextNameError || isSubmitting) return;

		setSubmissionError(null);
		setIsSubmitting(true);
		try {
			const savedCollection = await onSubmit({
				allowedContent: previewContents.map((option) => option.value),
				coverId,
				description,
				name,
				tags,
			});
			onSaved(savedCollection);
			toast.success(isEditing ? "Collection updated." : "Collection created.");
		} catch (error) {
			setSubmissionError(
				error instanceof Error &&
					error.message === "A collection with this name already exists."
					? error.message
					: isEditing
						? "We couldn't update this collection. Your changes haven't been saved."
						: "We couldn't create this collection. Your changes haven't been lost.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<SheetContent
			className="w-full bg-background data-[side=right]:sm:max-w-2xl"
			side="right"
		>
			<SheetHeader className="px-6 pt-8 pr-14 sm:px-8 sm:pt-10">
				<SheetTitle className="font-serif text-3xl tracking-[-0.03em]">
					{isEditing ? "Edit Collection" : "New Collection"}
				</SheetTitle>
				<SheetDescription className="mt-2 max-w-md text-sm leading-6">
					{isEditing
						? "Update this study space while keeping its passages, notes, and other material intact."
						: "Create a saved study space for passages, notes, and themes you want to revisit."}
				</SheetDescription>
			</SheetHeader>

			<form
				id="collection-form"
				className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-8"
				onSubmit={handleSubmit}
			>
				<FieldGroup>
					<Field data-invalid={Boolean(nameError) || undefined}>
						<FieldLabel htmlFor="collection-name">Collection Name</FieldLabel>
						<Input
							aria-invalid={Boolean(nameError) || undefined}
							id="collection-name"
							maxLength={collectionNameMaxLength}
							onBlur={handleNameBlur}
							onChange={(event) => {
								const nextName = event.target.value;
								setName(nextName);
								if (hasTouchedName) {
									setNameError(validateCollectionName(nextName));
								}
							}}
							placeholder="Sermon Series: James"
							value={name}
						/>
						<FieldError>{nameError}</FieldError>
					</Field>

					<Field>
						<FieldLabel htmlFor="collection-description">
							Description
						</FieldLabel>
						<Textarea
							id="collection-description"
							maxLength={280}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Passages, notes, and key themes from a sermon series through the book of James."
							value={description}
						/>
						<FieldDescription>
							A brief description helps you remember the purpose of this
							collection.
						</FieldDescription>
					</Field>

					<FieldSet>
						<FieldLegend>Cover Image</FieldLegend>
						<RadioGroup
							aria-label="Cover image"
							className="grid grid-cols-2 gap-3 sm:grid-cols-4"
							onValueChange={(value) =>
								setCoverId(value as (typeof collectionCovers)[number]["id"])
							}
							value={coverId}
						>
							{collectionCovers.map((cover) => {
								const isSelected = cover.id === coverId;

								return (
									<label
										className={`group relative block cursor-pointer overflow-hidden rounded-md border-2 transition-[border-color,box-shadow] focus-within:ring-2 focus-within:ring-ring/50 ${
											isSelected
												? "border-primary"
												: "border-transparent hover:border-border"
										}`}
										key={cover.id}
										htmlFor={`collection-cover-${cover.id}`}
									>
										<RadioGroupItem
											aria-label={cover.alt}
											className="sr-only"
											id={`collection-cover-${cover.id}`}
											value={cover.id}
										/>
										<img
											alt=""
											className="aspect-[10/7] w-full object-cover"
											src={cover.image}
										/>
										<span
											aria-hidden="true"
											className={`absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full border bg-background/95 text-primary shadow-sm transition-opacity ${
												isSelected ? "opacity-100" : "opacity-0"
											}`}
										>
											<CheckIcon className="size-3" strokeWidth={3} />
										</span>
									</label>
								);
							})}
						</RadioGroup>
					</FieldSet>

					<FieldSet>
						<FieldLegend>Contents</FieldLegend>
						<FieldDescription>
							Choose what you can add to this collection.
						</FieldDescription>
						<div className="flex flex-wrap gap-2">
							{collectionContentOptions.map((option) => {
								const Icon = option.icon;
								const isAllowed = allowedContent[option.value];

								return (
									<label
										className={`flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm transition-colors ${
											isAllowed
												? "border-primary/30 bg-primary/5 text-foreground"
												: "border-border bg-background text-muted-foreground hover:bg-muted/50"
										}`}
										key={option.value}
										htmlFor={`collection-content-${option.value}`}
									>
										<Checkbox
											checked={isAllowed}
											id={`collection-content-${option.value}`}
											onCheckedChange={(checked) => {
												setAllowedContent((current) => ({
													...current,
													[option.value]: checked === true,
												}));
											}}
										/>
										<Icon aria-hidden="true" className="size-3.5" />
										{option.label}
									</label>
								);
							})}
						</div>
					</FieldSet>

					<Field>
						<FieldLabel htmlFor="collection-tag">Tags (Optional)</FieldLabel>
						{tags.length > 0 ? (
							<ul className="flex flex-wrap gap-2" aria-label="Collection tags">
								{tags.map((tag) => (
									<li
										className="flex h-7 items-center gap-1 rounded-full bg-secondary py-1 pr-1 pl-2.5 text-secondary-foreground text-xs"
										key={tag}
									>
										{tag}
										<button
											aria-label={`Remove ${tag} tag`}
											className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
											onClick={() =>
												setTags((currentTags) =>
													currentTags.filter(
														(currentTag) => currentTag !== tag,
													),
												)
											}
											type="button"
										>
											<XIcon aria-hidden="true" className="size-3" />
										</button>
									</li>
								))}
							</ul>
						) : null}
						<InputGroup>
							<InputGroupInput
								id="collection-tag"
								maxLength={50}
								onChange={(event) => setTagInput(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter" && !event.nativeEvent.isComposing) {
										event.preventDefault();
										addTag();
									}
								}}
								placeholder="Add a tag..."
								value={tagInput}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton
									aria-label="Add tag"
									disabled={!tagInput.trim()}
									onClick={addTag}
									size="icon-xs"
								>
									<PlusIcon aria-hidden="true" />
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						<FieldDescription>
							Tags help you find this collection later.
						</FieldDescription>
					</Field>

					<FieldSet>
						<FieldLegend className="flex items-center gap-1.5">
							Collection Type
						</FieldLegend>
						<FieldDescription>
							Collections are private until sharing and study-group access are
							available.
						</FieldDescription>
						<div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
							<LockKeyholeIcon
								aria-hidden="true"
								className="mt-0.5 size-4 text-primary"
							/>
							<div>
								<p className="font-medium text-sm">Private</p>
								<p className="mt-1 text-muted-foreground text-xs leading-5">
									Only you can access this collection.
								</p>
							</div>
						</div>
					</FieldSet>

					<CollectionPreview
						contents={previewContents}
						cover={selectedCover}
						description={description}
						name={name}
					/>

					{submissionError ? (
						<Alert variant="destructive">
							<AlertTitle>
								Unable to {isEditing ? "update" : "create"} collection
							</AlertTitle>
							<AlertDescription>{submissionError}</AlertDescription>
						</Alert>
					) : null}
				</FieldGroup>
			</form>
			<SheetFooter className="border-t px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
				<SheetClose render={<Button type="button" variant="outline" />}>
					Cancel
				</SheetClose>
				<Button disabled={isSubmitting} form="collection-form" type="submit">
					{isSubmitting
						? isEditing
							? "Saving…"
							: "Creating…"
						: isEditing
							? "Save Changes"
							: "Create Collection"}
				</Button>
			</SheetFooter>
		</SheetContent>
	);
}
