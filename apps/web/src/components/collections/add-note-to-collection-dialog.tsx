import {
	listCollectionsForNote,
	setCollectionsForNote,
} from "@/functions/collections";

import { CollectionPickerDialog } from "./collection-picker-dialog";

export function AddNoteToCollectionDialog({
	noteId,
	onOpenChange,
	open,
}: {
	noteId: number;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	return (
		<CollectionPickerDialog
			emptyMessage="Create a collection first, then add this note to it."
			loadCollections={() => listCollectionsForNote({ data: { id: noteId } })}
			onOpenChange={onOpenChange}
			open={open}
			saveCollections={(collectionIds) =>
				setCollectionsForNote({ data: { collectionIds, id: noteId } })
			}
			successMessage={(collectionNames) =>
				collectionNames.length === 1
					? `Added to ${collectionNames[0]}.`
					: "Note collections updated."
			}
		/>
	);
}
