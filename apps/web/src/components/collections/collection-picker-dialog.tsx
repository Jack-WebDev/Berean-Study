import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@berean-study/ui/components/alert";
import { Button } from "@berean-study/ui/components/button";
import { Checkbox } from "@berean-study/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import { Input } from "@berean-study/ui/components/input";
import {
	type QueryKey,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FolderPlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { collectionKeys, libraryKeys } from "@/queries/keys";

type CollectionOption = { id: number; isSelected: number | null; name: string };

type CollectionPickerProps<TQueryKey extends QueryKey> = {
	collectionsQuery: UseQueryOptions<
		CollectionOption[],
		Error,
		CollectionOption[],
		TQueryKey
	>;
	emptyMessage: string;
	/** Item caches other than collections and the library that membership affects. */
	invalidates?: QueryKey[];
	onOpenChange: (open: boolean) => void;
	saveCollections: (collectionIds: number[]) => Promise<unknown>;
	successMessage: (collectionNames: string[]) => string;
};

export function CollectionPickerDialog<TQueryKey extends QueryKey>({
	open,
	...props
}: CollectionPickerProps<TQueryKey> & { open: boolean }) {
	return (
		<Dialog onOpenChange={props.onOpenChange} open={open}>
			{/* Mounting the picker per open starts each visit with a clean selection. */}
			{open ? <CollectionPicker {...props} /> : null}
		</Dialog>
	);
}

function CollectionPicker<TQueryKey extends QueryKey>({
	collectionsQuery,
	emptyMessage,
	invalidates = [],
	onOpenChange,
	saveCollections,
	successMessage,
}: CollectionPickerProps<TQueryKey>) {
	const queryClient = useQueryClient();
	const collectionsResult = useQuery(collectionsQuery);
	const collections = collectionsResult.data ?? null;
	const [query, setQuery] = useState("");
	// Unsaved changes to the stored membership.
	const [editedIds, setEditedIds] = useState<number[] | null>(null);
	const selectedIds =
		editedIds ??
		(collections ?? [])
			.filter((collection) => collection.isSelected !== null)
			.map((collection) => collection.id);
	const saveMutation = useMutation({
		mutationFn: saveCollections,
		onSuccess: async (_result, savedIds) => {
			await Promise.all(
				[collectionKeys.all, libraryKeys.all, ...invalidates].map((queryKey) =>
					queryClient.invalidateQueries({ queryKey }),
				),
			);
			const selectedNames = (collections ?? [])
				.filter((collection) => savedIds.includes(collection.id))
				.map((collection) => collection.name);
			toast.success(successMessage(selectedNames));
			onOpenChange(false);
		},
	});
	const isSaving = saveMutation.isPending;
	const error = saveMutation.isError
		? "We couldn't update this item's collections. Please try again."
		: collectionsResult.isError
			? "We couldn't load your collections. Please try again."
			: null;

	const filteredCollections = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase();
		if (!normalizedQuery) return collections ?? [];
		return (collections ?? []).filter((collection) =>
			collection.name.toLocaleLowerCase().includes(normalizedQuery),
		);
	}, [collections, query]);

	const toggleCollection = (collectionId: number, checked: boolean) => {
		setEditedIds(
			checked
				? [...selectedIds, collectionId]
				: selectedIds.filter((id) => id !== collectionId),
		);
	};

	const save = () => saveMutation.mutate(selectedIds);

	return (
		<DialogContent showCloseButton={!isSaving}>
			<DialogHeader>
				<DialogTitle>Add to Collection</DialogTitle>
				<DialogDescription>
					Choose every study collection where this item belongs.
				</DialogDescription>
			</DialogHeader>
			<label className="sr-only" htmlFor="collection-picker-search">
				Search collections
			</label>
			<Input
				disabled={isSaving || collections === null}
				id="collection-picker-search"
				onChange={(event) => setQuery(event.target.value)}
				placeholder="Search collections..."
				value={query}
			/>
			<div className="max-h-56 overflow-y-auto rounded-md border border-border/70">
				{collections === null && !error ? (
					<p className="p-3 text-muted-foreground text-sm">
						Loading collections…
					</p>
				) : null}
				{collections !== null && filteredCollections.length === 0 ? (
					<p className="p-3 text-muted-foreground text-sm">
						{collections.length === 0
							? emptyMessage
							: "No collections match your search."}
					</p>
				) : null}
				{filteredCollections.map((collection) => {
					const isSelected = selectedIds.includes(collection.id);
					return (
						<div
							className="flex items-center gap-3 border-border/70 border-b px-3 py-2.5 text-sm last:border-b-0 hover:bg-muted/50"
							key={collection.id}
						>
							<Checkbox
								checked={isSelected}
								disabled={isSaving}
								id={`collection-picker-${collection.id}`}
								onCheckedChange={(checked) =>
									toggleCollection(collection.id, checked === true)
								}
							/>
							<label
								className="cursor-pointer"
								htmlFor={`collection-picker-${collection.id}`}
							>
								{collection.name}
							</label>
						</div>
					);
				})}
			</div>
			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Unable to update collections</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			<DialogFooter>
				<Button
					disabled={isSaving}
					render={<Link to="/library/collections" />}
					variant="ghost"
				>
					<FolderPlusIcon aria-hidden="true" data-icon="inline-start" />
					New Collection
				</Button>
				<Button disabled={isSaving || collections === null} onClick={save}>
					{isSaving ? "Saving…" : "Save"}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
