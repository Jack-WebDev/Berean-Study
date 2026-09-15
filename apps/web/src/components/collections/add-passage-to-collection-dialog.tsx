import {
	listCollectionsForPassage,
	setCollectionsForPassage,
} from "@/functions/collections";

import { CollectionPickerDialog } from "./collection-picker-dialog";

export function AddPassageToCollectionDialog({
	onOpenChange,
	open,
	passageId,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
	passageId: number;
}) {
	return (
		<CollectionPickerDialog
			emptyMessage="Create a collection first, then add this passage to it."
			loadCollections={() =>
				listCollectionsForPassage({ data: { id: passageId } })
			}
			onOpenChange={onOpenChange}
			open={open}
			saveCollections={(collectionIds) =>
				setCollectionsForPassage({ data: { collectionIds, id: passageId } })
			}
			successMessage={(collectionNames) =>
				collectionNames.length === 1
					? `Added to ${collectionNames[0]}.`
					: "Passage collections updated."
			}
		/>
	);
}
