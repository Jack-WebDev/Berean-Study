import { Button } from "@berean-study/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FilePlus2Icon, FileTextIcon, FolderPlusIcon } from "lucide-react";
import { useState } from "react";

import { AddPassageToCollectionDialog } from "@/components/collections/add-passage-to-collection-dialog";
import { passageNoteCountQueryOptions } from "@/queries/notes";

export function ScriptureNotesActions({ passageId }: { passageId: number }) {
	const { data: noteCount } = useQuery(passageNoteCountQueryOptions(passageId));
	const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);

	return (
		<div className="mt-4 flex flex-wrap items-center gap-2">
			<Button
				render={
					<Link
						search={{ passage: passageId, return: passageId }}
						to="/library/notes/new"
					/>
				}
				size="sm"
				variant="outline"
			>
				<FilePlus2Icon aria-hidden="true" data-icon="inline-start" />
				Add note
			</Button>
			<Button
				onClick={() => setCollectionDialogOpen(true)}
				size="sm"
				type="button"
				variant="outline"
			>
				<FolderPlusIcon aria-hidden="true" data-icon="inline-start" />
				Add to Collection
			</Button>
			{noteCount && noteCount > 0 ? (
				<Button
					render={
						<Link
							search={{
								passage: passageId,
								return: passageId,
								sort: "updated-desc",
							}}
							to="/library/notes"
						/>
					}
					size="sm"
					variant="ghost"
				>
					<FileTextIcon aria-hidden="true" data-icon="inline-start" />
					Your Notes · {noteCount}
				</Button>
			) : null}
			<AddPassageToCollectionDialog
				onOpenChange={setCollectionDialogOpen}
				open={collectionDialogOpen}
				passageId={passageId}
			/>
		</div>
	);
}
