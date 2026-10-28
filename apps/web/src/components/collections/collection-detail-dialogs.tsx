"use client";

import { Alert, AlertDescription } from "@berean-study/ui/components/alert";
import { Button } from "@berean-study/ui/components/button";
import {
	Dialog,
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
	FieldLabel,
} from "@berean-study/ui/components/field";
import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { type FormEvent, useId, useState } from "react";
import { toast } from "sonner";

import { PassageSearch } from "@/components/notes/note-passage-pickers";
import { usePassageOptions } from "@/components/notes/note-study-data";

import { unsectionedKey } from "./collection-passage-model";
import type {
	CollectionSection,
	useCollectionActions,
} from "./use-collection-actions";

type Actions = ReturnType<typeof useCollectionActions>;

const dialogClassName = "gap-5 rounded-2xl p-5 text-sm sm:max-w-120 sm:p-7";

/** Finds a passage and adds it to the end of the chosen section. */
export function AddPassageDialog({
	actions,
	existingIds,
	onOpenChange,
	open,
	sections,
}: {
	actions: Actions;
	existingIds: readonly number[];
	onOpenChange: (open: boolean) => void;
	open: boolean;
	sections: readonly CollectionSection[];
}) {
	return (
		<Dialog
			onOpenChange={(next) => {
				// A failed attempt shouldn't greet the member next time.
				if (!next) actions.addPassage.reset();
				onOpenChange(next);
			}}
			open={open}
		>
			{open ? (
				<AddPassageForm
					actions={actions}
					existingIds={existingIds}
					onDone={() => {
						actions.addPassage.reset();
						onOpenChange(false);
					}}
					sections={sections}
				/>
			) : null}
		</Dialog>
	);
}

function AddPassageForm({
	actions,
	existingIds,
	onDone,
	sections,
}: {
	actions: Actions;
	existingIds: readonly number[];
	onDone: () => void;
	sections: readonly CollectionSection[];
}) {
	const sectionSelectId = useId();
	const passagesQuery = usePassageOptions();
	const [section, setSection] = useState(
		sections.at(-1) ? String(sections.at(-1)?.id) : unsectionedKey,
	);

	return (
		<DialogContent className={dialogClassName}>
			<DialogHeader>
				<DialogTitle className="font-normal font-serif text-2xl">
					Add a passage
				</DialogTitle>
				<DialogDescription className="text-sm">
					It goes at the end of the section you choose.
				</DialogDescription>
			</DialogHeader>
			{sections.length ? (
				<div className="flex flex-col gap-1.5">
					<label
						className="font-semibold text-[13px] text-secondary-foreground"
						htmlFor={sectionSelectId}
					>
						Section
					</label>
					<NativeSelect
						className="h-11 w-full rounded-[10px]"
						id={sectionSelectId}
						onChange={(event) => setSection(event.target.value)}
						value={section}
					>
						<NativeSelectOption value={unsectionedKey}>
							Not in a section
						</NativeSelectOption>
						{sections.map((option) => (
							<NativeSelectOption key={option.id} value={String(option.id)}>
								{option.title}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</div>
			) : null}
			{passagesQuery.isError ? (
				<Alert variant="destructive">
					<AlertDescription>
						We couldn&apos;t load passages.{" "}
						<button
							className="font-semibold underline"
							onClick={() => void passagesQuery.refetch()}
							type="button"
						>
							Try again
						</button>
					</AlertDescription>
				</Alert>
			) : (
				<PassageSearch
					autoFocus
					excludeIds={existingIds}
					onSelect={(passage) =>
						actions.addPassage.mutate(
							{
								passageId: passage.id,
								sectionId: section === unsectionedKey ? null : Number(section),
							},
							{
								onSuccess: () => {
									toast.success(`Added ${passage.label}.`);
									onDone();
								},
							},
						)
					}
					passages={passagesQuery.data ?? null}
				/>
			)}
			{actions.addPassage.isError ? (
				<Alert variant="destructive">
					<AlertDescription>
						{actions.addPassage.error.message ===
						"This passage is already in the collection."
							? actions.addPassage.error.message
							: "We couldn't add this passage. Please try again."}
					</AlertDescription>
				</Alert>
			) : null}
		</DialogContent>
	);
}

/** Names a new section, or renames an existing one. */
export function SectionNameDialog({
	actions,
	onOpenChange,
	section,
	open,
}: {
	actions: Actions;
	onOpenChange: (open: boolean) => void;
	/** The section to rename; omit to add a new one. */
	section?: CollectionSection;
	open: boolean;
}) {
	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					actions.createSection.reset();
					actions.renameSection.reset();
				}
				onOpenChange(next);
			}}
			open={open}
		>
			{open ? (
				<SectionNameForm
					actions={actions}
					key={section?.id ?? "new"}
					onDone={() => onOpenChange(false)}
					section={section}
				/>
			) : null}
		</Dialog>
	);
}

function SectionNameForm({
	actions,
	onDone,
	section,
}: {
	actions: Actions;
	onDone: () => void;
	section?: CollectionSection;
}) {
	const inputId = useId();
	const [title, setTitle] = useState(section?.title ?? "");
	const [error, setError] = useState<string | null>(null);
	const mutation = section ? actions.renameSection : actions.createSection;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!title.trim()) {
			setError("Enter a section name.");
			return;
		}
		const options = { onSuccess: onDone };
		if (section) {
			actions.renameSection.mutate(
				{ sectionId: section.id, title: title.trim() },
				options,
			);
		} else {
			actions.createSection.mutate(title.trim(), options);
		}
	};

	return (
		<DialogContent className={dialogClassName}>
			<DialogHeader>
				<DialogTitle className="font-normal font-serif text-2xl">
					{section ? "Rename section" : "Add a section"}
				</DialogTitle>
				<DialogDescription className="text-sm">
					Sections group passages, like “I. Crying out”.
				</DialogDescription>
			</DialogHeader>
			<form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit}>
				<Field data-invalid={Boolean(error) || undefined}>
					<FieldLabel htmlFor={inputId}>Section name</FieldLabel>
					<Input
						aria-invalid={Boolean(error) || undefined}
						autoFocus
						className="h-11 rounded-xl"
						id={inputId}
						maxLength={100}
						onChange={(event) => {
							setTitle(event.target.value);
							setError(null);
						}}
						value={title}
					/>
					<FieldError>{error}</FieldError>
				</Field>
				{mutation.isError ? (
					<Alert variant="destructive">
						<AlertDescription>
							We couldn&apos;t save this section. Please try again.
						</AlertDescription>
					</Alert>
				) : null}
				<DialogFooter className="gap-2.5">
					<DialogClose
						render={
							<Button
								className="h-11 rounded-xl px-4 text-sm"
								type="button"
								variant="outline"
							/>
						}
					>
						Cancel
					</DialogClose>
					<Button
						className="h-11 rounded-xl px-5 font-bold text-sm"
						disabled={mutation.isPending}
						type="submit"
					>
						{mutation.isPending
							? "Saving…"
							: section
								? "Rename"
								: "Add section"}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
