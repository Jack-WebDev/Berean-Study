"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@berean-study/ui/components/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { deleteCollection } from "@/functions/collections";
import { collectionKeys, libraryKeys, noteKeys } from "@/queries/keys";

/** Confirms deleting a collection, then returns to the library. */
export function DeleteCollectionDialog({
	collectionId,
	name,
	onOpenChange,
	open,
}: {
	collectionId: number;
	name: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const deleteMutation = useMutation({
		mutationFn: async () => {
			const deleted = await deleteCollection({ data: { id: collectionId } });
			if (!deleted) throw new Error("Collection not found.");
		},
		onSuccess: async () => {
			await navigate({ to: "/library/collections" });
			queryClient.removeQueries({
				queryKey: collectionKeys.detail(collectionId),
			});
			await Promise.all(
				[collectionKeys.all, libraryKeys.all, noteKeys.lists()].map(
					(queryKey) => queryClient.invalidateQueries({ queryKey }),
				),
			);
		},
	});

	return (
		<AlertDialog
			onOpenChange={(next) => {
				if (!next && !deleteMutation.isPending) {
					deleteMutation.reset();
					onOpenChange(false);
				}
			}}
			open={open}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
					<AlertDialogDescription>
						The collection, its sections and reading progress will be deleted.
						Its passages and notes stay in your Library.
					</AlertDialogDescription>
					{deleteMutation.isError ? (
						<p className="text-destructive text-xs" role="alert">
							We couldn&apos;t delete this collection. Please try again.
						</p>
					) : null}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleteMutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						disabled={deleteMutation.isPending}
						onClick={() => deleteMutation.mutate()}
						variant="destructive"
					>
						{deleteMutation.isPending ? "Deleting…" : "Delete collection"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
