import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@berean-study/ui/components/alert";
import {
	Field,
	FieldGroup,
	FieldLabel,
} from "@berean-study/ui/components/field";
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
import { FolderPlusIcon } from "lucide-react";
import { useState } from "react";

import type { NoteCollection } from "./types";

export function NoteCollectionControl({
	collectionId,
	collections,
	onAssign,
	onCreate,
}: {
	collectionId: number | null;
	collections: NoteCollection[];
	onAssign: (collectionId: number | null) => Promise<void>;
	onCreate: (name: string) => Promise<NoteCollection>;
}) {
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);

	const assignCollection = (nextCollectionId: number | null) => {
		setError(null);
		setIsUpdating(true);
		void onAssign(nextCollectionId)
			.catch(() =>
				setError("Unable to update this collection. Please try again."),
			)
			.finally(() => setIsUpdating(false));
	};

	return (
		<section
			aria-labelledby="note-collection-heading"
			className="flex flex-col gap-3"
		>
			<div>
				<h2 className="font-medium text-sm" id="note-collection-heading">
					Collection
				</h2>
				<p className="mt-1 text-muted-foreground text-xs">
					Group this note with a focused study.
				</p>
			</div>
			<FieldGroup>
				<Field>
					<FieldLabel className="sr-only" htmlFor="note-collection">
						Collection
					</FieldLabel>
					<NativeSelect
						disabled={isUpdating}
						id="note-collection"
						onChange={(event) =>
							assignCollection(
								event.target.value ? Number(event.target.value) : null,
							)
						}
						value={collectionId?.toString() ?? ""}
					>
						<NativeSelectOption value="">No collection</NativeSelectOption>
						{collections.map((collection) => (
							<NativeSelectOption key={collection.id} value={collection.id}>
								{collection.name}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</Field>
			</FieldGroup>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					const nextName = name.trim();
					if (!nextName) return;

					setError(null);
					setIsCreating(true);
					void onCreate(nextName)
						.then((collection) => {
							setName("");
							return onAssign(collection.id);
						})
						.catch(() =>
							setError("Unable to create this collection. Please try again."),
						)
						.finally(() => setIsCreating(false));
				}}
			>
				<FieldGroup>
					<Field>
						<FieldLabel className="sr-only" htmlFor="new-note-collection">
							New collection
						</FieldLabel>
						<InputGroup>
							<InputGroupInput
								disabled={isCreating}
								id="new-note-collection"
								maxLength={100}
								onChange={(event) => setName(event.target.value)}
								placeholder="New collection"
								value={name}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton
									disabled={isCreating || !name.trim()}
									type="submit"
									variant="outline"
								>
									<FolderPlusIcon aria-hidden="true" data-icon="inline-start" />
									Create
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
					</Field>
				</FieldGroup>
			</form>
			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Unable to update collection</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
		</section>
	);
}
