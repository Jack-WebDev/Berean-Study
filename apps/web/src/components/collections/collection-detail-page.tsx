"use client";

import { Button } from "@berean-study/ui/components/button";
import { Dialog } from "@berean-study/ui/components/dialog";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@berean-study/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeftIcon, ListPlusIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { collectionDetailQueryOptions } from "@/queries/collections";

import {
	AddPassageDialog,
	SectionNameDialog,
} from "./collection-detail-dialogs";
import { LatestNotesPanel, OutlinePanel } from "./collection-detail-panels";
import {
	CollectionDetailSkeleton,
	CollectionDetailState,
	NoPassagesState,
} from "./collection-detail-states";
import { CollectionFormDialog } from "./collection-form-dialog";
import { CollectionHero } from "./collection-hero";
import { CollectionNotes } from "./collection-notes-tab";
import { CollectionOverview } from "./collection-overview";
import { CollectionPassageList } from "./collection-passage-list";
import { findUpNext } from "./collection-passage-model";
import { DeleteCollectionDialog } from "./delete-collection-dialog";
import {
	type CollectionDetail,
	type CollectionSection,
	useCollectionActions,
} from "./use-collection-actions";

export type CollectionTab = "passages" | "notes" | "overview";

export function CollectionDetailPage({
	collectionId,
	onTabChange,
	tab,
}: {
	collectionId: number;
	onTabChange: (tab: CollectionTab) => void;
	tab: CollectionTab;
}) {
	const detailQuery = useQuery(collectionDetailQueryOptions(collectionId));
	const actions = useCollectionActions(collectionId);
	const hash = useLocation({ select: (location) => location.hash });
	const hasData = Boolean(detailQuery.data);

	// Each visit counts as opening the collection, for "Continue studying".
	const { mutate: markOpened } = actions.markOpened;
	useEffect(() => {
		markOpened();
	}, [markOpened]);

	// "Resume" links here with #passage-<id>; the list only exists once loaded.
	useEffect(() => {
		if (hasData && hash) {
			document.getElementById(hash)?.scrollIntoView({ block: "center" });
		}
	}, [hasData, hash]);

	if (detailQuery.isError) {
		return (
			<CollectionDetailState
				description="Please try loading this collection again."
				onRetry={() => void detailQuery.refetch()}
				title="Collection unavailable"
			/>
		);
	}
	if (detailQuery.isPending) return <CollectionDetailSkeleton />;
	if (detailQuery.data === null) {
		return (
			<CollectionDetailState
				description="It may have been deleted or is no longer available."
				title="Collection not found"
			/>
		);
	}

	return (
		<LoadedCollectionDetail
			actions={actions}
			detail={detailQuery.data}
			onTabChange={onTabChange}
			tab={tab}
		/>
	);
}

function LoadedCollectionDetail({
	actions,
	detail,
	onTabChange,
	tab,
}: {
	actions: ReturnType<typeof useCollectionActions>;
	detail: CollectionDetail;
	onTabChange: (tab: CollectionTab) => void;
	tab: CollectionTab;
}) {
	const { collection, notes, passages, sections } = detail;
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [isAddPassageOpen, setIsAddPassageOpen] = useState(false);
	const [sectionDialog, setSectionDialog] = useState<{
		open: boolean;
		section?: CollectionSection;
	}>({ open: false });
	const upNext = findUpNext(passages);

	const openAddSection = () => setSectionDialog({ open: true });

	return (
		<div className="min-h-full bg-background px-4 py-8 text-foreground sm:px-8">
			<main className="mx-auto flex w-full max-w-295 flex-col gap-8">
				<nav aria-label="Breadcrumb">
					<ol className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
						<li>
							<Link
								className="inline-flex min-h-11 items-center gap-1.5 font-semibold hover:text-foreground"
								to="/library/collections"
							>
								<ArrowLeftIcon aria-hidden="true" className="size-4" />
								Collections
							</Link>
						</li>
						<li aria-hidden="true">/</li>
						<li aria-current="page" className="font-semibold text-foreground">
							{collection.name}
						</li>
					</ol>
				</nav>

				<CollectionHero
					collection={collection}
					isPinning={actions.setPinned.isPending}
					onContinue={() => onTabChange("passages")}
					onDelete={() => setIsDeleteOpen(true)}
					onEdit={() => setIsEditOpen(true)}
					onTogglePin={() => actions.setPinned.mutate(!collection.pinned)}
					upNext={upNext}
				/>

				<Tabs
					className="gap-0"
					onValueChange={(value) => onTabChange(value as CollectionTab)}
					value={tab}
				>
					<div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-border border-b">
						<TabsList
							aria-label="Collection sections"
							className="gap-1 p-0 group-data-horizontal/tabs:h-auto"
							variant="line"
						>
							<CollectionTabTrigger
								count={passages.length}
								label="Passages"
								value="passages"
							/>
							<CollectionTabTrigger
								count={notes.length}
								label="Notes"
								value="notes"
							/>
							<CollectionTabTrigger label="Overview" value="overview" />
						</TabsList>
						{tab === "passages" ? (
							<div className="flex gap-2 pb-2">
								<Button
									className="h-11 rounded-[9px] border-border-strong px-3 text-sm"
									onClick={() => setIsAddPassageOpen(true)}
									type="button"
									variant="outline"
								>
									<PlusIcon aria-hidden="true" data-icon="inline-start" />
									Add passage
								</Button>
								<Button
									className="h-11 rounded-[9px] border-border-strong px-3 text-sm"
									onClick={openAddSection}
									type="button"
									variant="outline"
								>
									<ListPlusIcon aria-hidden="true" data-icon="inline-start" />
									Add section
								</Button>
							</div>
						) : null}
					</div>

					<TabsContent className="pt-8 text-sm" value="passages">
						<div className="flex flex-wrap items-start gap-8">
							<div className="min-w-0 flex-[999_1_35rem]">
								{passages.length || sections.length ? (
									<CollectionPassageList
										actions={actions}
										collectionId={collection.id}
										notes={notes}
										onRenameSection={(section) =>
											setSectionDialog({ open: true, section })
										}
										passages={passages}
										sections={sections}
									/>
								) : (
									<NoPassagesState onAdd={() => setIsAddPassageOpen(true)} />
								)}
							</div>
							<aside
								aria-label="About this collection"
								className="flex flex-[1_1_18.75rem] flex-col gap-4"
							>
								<OutlinePanel passages={passages} sections={sections} />
								<LatestNotesPanel
									notes={notes}
									onShowAll={() => onTabChange("notes")}
								/>
								{/* TODO(collections): "Suggested to add" needs passage suggestions from the backend. */}
							</aside>
						</div>
					</TabsContent>

					<TabsContent className="pt-8 text-sm" value="notes">
						<CollectionNotes collectionId={collection.id} notes={notes} />
					</TabsContent>

					<TabsContent className="pt-8 text-sm" value="overview">
						<CollectionOverview
							detail={detail}
							onEdit={() => setIsEditOpen(true)}
						/>
					</TabsContent>
				</Tabs>
			</main>

			<Dialog onOpenChange={setIsEditOpen} open={isEditOpen}>
				{isEditOpen ? (
					<CollectionFormDialog
						collection={collection}
						onSaved={() => setIsEditOpen(false)}
					/>
				) : null}
			</Dialog>
			<AddPassageDialog
				actions={actions}
				existingIds={passages.map((passage) => passage.passageId)}
				onOpenChange={setIsAddPassageOpen}
				open={isAddPassageOpen}
				sections={sections}
			/>
			<SectionNameDialog
				actions={actions}
				onOpenChange={(open) => setSectionDialog({ open })}
				open={sectionDialog.open}
				section={sectionDialog.section}
			/>
			<DeleteCollectionDialog
				collectionId={collection.id}
				name={collection.name}
				onOpenChange={setIsDeleteOpen}
				open={isDeleteOpen}
			/>
		</div>
	);
}

function CollectionTabTrigger({
	count,
	label,
	value,
}: {
	count?: number;
	label: string;
	value: CollectionTab;
}) {
	return (
		<TabsTrigger
			className="h-12 flex-none px-3.5 font-semibold text-muted-foreground text-sm after:bg-primary data-active:font-bold data-active:text-primary group-data-horizontal/tabs:after:-bottom-px"
			value={value}
		>
			{label}
			{count === undefined ? null : (
				<span className="font-normal text-muted-foreground">{count}</span>
			)}
		</TabsTrigger>
	);
}
