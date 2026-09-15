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
import { Link } from "@tanstack/react-router";
import { FolderPlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type CollectionOption = { id: number; isSelected: number | null; name: string };

export function CollectionPickerDialog({
	emptyMessage,
	loadCollections,
	onOpenChange,
	open,
	saveCollections,
	successMessage,
}: {
	emptyMessage: string;
	loadCollections: () => Promise<CollectionOption[]>;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	saveCollections: (collectionIds: number[]) => Promise<unknown>;
	successMessage: (collectionNames: string[]) => string;
}) {
	const [collections, setCollections] = useState<CollectionOption[] | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	useEffect(() => {
		if (!open) return;
		let active = true;
		setCollections(null);
		setError(null);
		setQuery("");
		void loadCollections()
			.then((nextCollections) => {
				if (!active) return;
				setCollections(nextCollections);
				setSelectedIds(
					nextCollections
						.filter((collection) => collection.isSelected !== null)
						.map((collection) => collection.id),
				);
			})
			.catch(() => {
				if (active)
					setError("We couldn't load your collections. Please try again.");
			});
		return () => {
			active = false;
		};
	}, [loadCollections, open]);

	const filteredCollections = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase();
		if (!normalizedQuery) return collections ?? [];
		return (collections ?? []).filter((collection) =>
			collection.name.toLocaleLowerCase().includes(normalizedQuery),
		);
	}, [collections, query]);

	const toggleCollection = (collectionId: number, checked: boolean) => {
		setSelectedIds((currentIds) =>
			checked
				? [...currentIds, collectionId]
				: currentIds.filter((id) => id !== collectionId),
		);
	};

	const save = () => {
		setError(null);
		setIsSaving(true);
		void saveCollections(selectedIds)
			.then(() => {
				const selectedNames = (collections ?? [])
					.filter((collection) => selectedIds.includes(collection.id))
					.map((collection) => collection.name);
				toast.success(successMessage(selectedNames));
				onOpenChange(false);
			})
			.catch(() =>
				setError(
					"We couldn't update this item's collections. Please try again.",
				),
			)
			.finally(() => setIsSaving(false));
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
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
		</Dialog>
	);
}
