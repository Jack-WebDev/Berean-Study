"use client";

import { getDocumentText } from "@berean-study/rich-text-editor";
import { Button, buttonVariants } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import {
	type Announcements,
	closestCorners,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	KeyboardSensor,
	PointerSensor,
	type UniqueIdentifier,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@tanstack/react-router";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	CheckIcon,
	CircleIcon,
	EllipsisIcon,
	FileTextIcon,
	FolderInputIcon,
	GripVerticalIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import {
	buildColumns,
	findColumn,
	findUpNext,
	movePassage,
	notesForPassage,
	type PassageColumn,
	sameLayout,
	toGroups,
	unsectionedKey,
	visiblePassageIds,
} from "./collection-passage-model";
import type {
	CollectionNote,
	CollectionPassage,
	CollectionSection,
	useCollectionActions,
} from "./use-collection-actions";

type Actions = ReturnType<typeof useCollectionActions>;

/**
 * The collection's passages, grouped by section. Passages can be dragged
 * (pointer, or keyboard: Space to pick up, arrows to move, Space to drop) or
 * moved from their menu, within and between sections.
 */
export function CollectionPassageList({
	actions,
	collectionId,
	notes,
	onRenameSection,
	passages,
	sections,
}: {
	actions: Actions;
	collectionId: number;
	notes: readonly CollectionNote[];
	onRenameSection: (section: CollectionSection) => void;
	passages: readonly CollectionPassage[];
	sections: readonly CollectionSection[];
}) {
	const serverColumns = useMemo(
		() => buildColumns(passages, sections),
		[passages, sections],
	);
	// While dragging (and until the saved order comes back) the list shows
	// this local layout instead of the server's.
	const [localColumns, setLocalColumns] = useState<PassageColumn[] | null>(
		null,
	);
	const [activeId, setActiveId] = useState<number | null>(null);
	const [lastServerColumns, setLastServerColumns] = useState(serverColumns);
	if (lastServerColumns !== serverColumns) {
		setLastServerColumns(serverColumns);
		if (activeId === null) setLocalColumns(null);
	}
	const columns = localColumns ?? serverColumns;
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

	const byId = useMemo(
		() => new Map(passages.map((passage) => [passage.passageId, passage])),
		[passages],
	);
	const readIds = useMemo(
		() =>
			new Set(
				passages
					.filter((passage) => passage.readAt !== null)
					.map((passage) => passage.passageId),
			),
		[passages],
	);
	const upNext = findUpNext(passages);
	const referenceOf = (id: UniqueIdentifier) =>
		byId.get(Number(id))?.reference ?? "passage";

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const save = (next: PassageColumn[]) => {
		setLocalColumns(next);
		if (!sameLayout(next, serverColumns))
			actions.arrange.mutate(toGroups(next));
	};

	const handleDragOver = ({ active, over }: DragOverEvent) => {
		if (!over || !localColumns) return;
		const from = findColumn(localColumns, Number(active.id));
		const to = findColumn(
			localColumns,
			typeof over.id === "string" ? over.id : Number(over.id),
		);
		if (!from || !to || from.key === to.key) return;
		const overIndex = to.ids.indexOf(Number(over.id));
		setLocalColumns(
			movePassage(
				localColumns,
				Number(active.id),
				to.key,
				overIndex === -1 ? to.ids.length : overIndex,
			),
		);
	};

	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		setActiveId(null);
		if (!over || !localColumns) {
			setLocalColumns(null);
			return;
		}
		const column = findColumn(localColumns, Number(active.id));
		const overIndex = column?.ids.indexOf(Number(over.id)) ?? -1;
		save(
			column && overIndex !== -1
				? movePassage(localColumns, Number(active.id), column.key, overIndex)
				: localColumns,
		);
	};

	const announcements: Announcements = {
		onDragCancel: ({ active }) =>
			`Stopped moving ${referenceOf(active.id)}. It's back where it was.`,
		onDragEnd: ({ active, over }) =>
			over
				? `${referenceOf(active.id)} dropped.`
				: `${referenceOf(active.id)} put back.`,
		onDragOver: ({ active, over }) => {
			if (!over) return `${referenceOf(active.id)} is no longer over a place.`;
			const column = findColumn(
				localColumns ?? columns,
				typeof over.id === "string" ? over.id : Number(over.id),
			);
			const position = (column?.ids.indexOf(Number(active.id)) ?? 0) + 1;
			return `${referenceOf(active.id)} is now at position ${position} of ${column?.ids.length ?? 0}${column?.title ? ` in ${column.title}` : ""}.`;
		},
		onDragStart: ({ active }) => `Picked up ${referenceOf(active.id)}.`,
	};

	return (
		<DndContext
			accessibility={{
				announcements,
				screenReaderInstructions: {
					draggable:
						"To move a passage, press Space, then use the arrow keys. Press Space again to drop it, or Escape to cancel.",
				},
			}}
			collisionDetection={closestCorners}
			onDragCancel={() => {
				setActiveId(null);
				setLocalColumns(null);
			}}
			onDragEnd={handleDragEnd}
			onDragOver={handleDragOver}
			onDragStart={({ active }) => {
				setActiveId(Number(active.id));
				setLocalColumns(columns);
			}}
			sensors={sensors}
		>
			<div className="flex flex-col gap-7">
				{columns.map((column) => {
					const isExpanded = expanded.has(column.key);
					const shownIds = visiblePassageIds(column, readIds, isExpanded);
					const hiddenCount = column.ids.length - shownIds.length;
					const readCount = column.ids.filter((id) => readIds.has(id)).length;
					const section = sections.find(
						(candidate) => candidate.id === column.sectionId,
					);
					const sectionIndex = section ? sections.indexOf(section) : -1;

					return (
						<section
							aria-labelledby={`${column.key}-title`}
							className="flex scroll-mt-6 flex-col gap-3"
							id={column.key}
							key={column.key}
						>
							{section ? (
								<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
									<h2
										className="font-serif text-[1.375rem] leading-tight"
										id={`${column.key}-title`}
									>
										{section.title}
									</h2>
									<span className="text-muted-foreground text-sm">
										{readCount} of {column.ids.length} read
									</span>
									<SectionMenu
										canMoveDown={sectionIndex < sections.length - 1}
										canMoveUp={sectionIndex > 0}
										onDelete={() =>
											actions.deleteSection.mutate(section.id, {
												onSuccess: () =>
													toast.success(
														`Deleted “${section.title}”. Its passages are now under “Not in a section”.`,
													),
											})
										}
										onMove={(offset) =>
											actions.moveSection.mutate({
												sectionId: section.id,
												toIndex: sectionIndex + offset,
											})
										}
										onRename={() => onRenameSection(section)}
										title={section.title}
									/>
								</div>
							) : (
								<h2
									className={
										sections.length
											? "font-serif text-[1.375rem] leading-tight"
											: "sr-only"
									}
									id={`${column.key}-title`}
								>
									{sections.length ? "Not in a section" : "Passages"}
								</h2>
							)}

							<SortableContext
								id={column.key}
								items={shownIds}
								strategy={verticalListSortingStrategy}
							>
								<DropColumn id={column.key} isEmpty={column.ids.length === 0}>
									{shownIds.map((id, index) => {
										const passage = byId.get(id);
										if (!passage) return null;
										return (
											<SortablePassage
												collectionId={collectionId}
												isNext={upNext?.passageId === id}
												isRead={readIds.has(id)}
												key={id}
												menu={
													<PassageMenu
														canMoveDown={index < column.ids.length - 1}
														canMoveUp={index > 0}
														columns={columns}
														currentKey={column.key}
														isRead={readIds.has(id)}
														onMove={(toKey, toIndex) =>
															save(movePassage(columns, id, toKey, toIndex))
														}
														onRemove={() =>
															actions.removePassage.mutate(id, {
																onSuccess: () =>
																	toast.success(
																		`Removed ${passage.reference} from this collection.`,
																	),
															})
														}
														onToggleRead={() =>
															actions.setRead.mutate({
																passageId: id,
																read: !readIds.has(id),
															})
														}
														passageIndex={index}
														reference={passage.reference}
													/>
												}
												notes={notesForPassage(notes, id)}
												onMarkRead={() =>
													actions.setRead.mutate({ passageId: id, read: true })
												}
												passage={passage}
											/>
										);
									})}
								</DropColumn>
							</SortableContext>

							{hiddenCount > 0 ? (
								<Button
									className="h-11 self-start px-1 font-bold text-primary text-sm"
									onClick={() =>
										setExpanded(new Set([...expanded, column.key]))
									}
									type="button"
									variant="ghost"
								>
									Show {hiddenCount} more read{" "}
									{hiddenCount === 1 ? "passage" : "passages"}
								</Button>
							) : null}
						</section>
					);
				})}
			</div>
		</DndContext>
	);
}

/** Lets a passage be dropped into a section, even an empty one. */
function DropColumn({
	children,
	id,
	isEmpty,
}: {
	children: ReactNode;
	id: string;
	isEmpty: boolean;
}) {
	const { isOver, setNodeRef } = useDroppable({ id });
	return (
		<ol
			className={`flex flex-col gap-3 rounded-[14px] ${
				isEmpty
					? `min-h-20 items-center justify-center border-[1.5px] border-dashed p-4 ${
							isOver ? "border-primary bg-primary/5" : "border-border-strong"
						}`
					: ""
			}`}
			ref={setNodeRef}
		>
			{isEmpty ? (
				<li className="text-center text-muted-foreground text-sm">
					Drag a passage here, or use a passage's menu to move it.
				</li>
			) : (
				children
			)}
		</ol>
	);
}

function SortablePassage({
	collectionId,
	isNext,
	isRead,
	menu,
	notes,
	onMarkRead,
	passage,
}: {
	collectionId: number;
	isNext: boolean;
	isRead: boolean;
	menu: ReactNode;
	notes: readonly CollectionNote[];
	onMarkRead: () => void;
	passage: CollectionPassage;
}) {
	const {
		attributes,
		isDragging,
		listeners,
		setActivatorNodeRef,
		setNodeRef,
		transform,
		transition,
	} = useSortable({ id: passage.passageId });
	const text = passage.verses.map((verse) => verse.text).join(" ");

	return (
		<li
			className="scroll-mt-6"
			id={`passage-${passage.passageId}`}
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
		>
			<article
				aria-label={
					isNext ? `Up next: ${passage.reference}` : passage.reference
				}
				className={`flex gap-2 rounded-[14px] bg-card py-4 pr-3 pl-1.5 sm:gap-3 sm:py-4.5 sm:pr-4 ${
					isNext
						? "border-2 border-primary"
						: "border border-border hover:border-border-strong"
				} ${isDragging ? "relative z-10 opacity-80 shadow-lg" : ""}`}
			>
				<button
					{...attributes}
					{...listeners}
					aria-label={`Move ${passage.reference}`}
					className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
					ref={setActivatorNodeRef}
					type="button"
				>
					<GripVerticalIcon aria-hidden="true" className="size-4" />
				</button>
				<div className="flex min-w-0 flex-1 flex-col gap-2 pt-2.5">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<h3 className="font-bold text-primary">{passage.reference}</h3>
							{passage.title && passage.title !== passage.reference ? (
								<p className="text-muted-foreground text-xs">{passage.title}</p>
							) : null}
						</div>
						<div className="-mt-2.5 flex shrink-0 items-center gap-1">
							{isRead ? (
								<span className="inline-flex items-center gap-1 font-bold text-success text-xs">
									<CheckIcon
										aria-hidden="true"
										className="size-3.5"
										strokeWidth={2.4}
									/>
									Read
								</span>
							) : isNext ? (
								<span className="rounded-full bg-primary px-2.5 py-1 font-bold text-primary-foreground text-xs">
									Up next
								</span>
							) : null}
							{menu}
						</div>
					</div>
					{text ? (
						<p className="line-clamp-4 font-serif text-[17px] text-body-foreground leading-relaxed">
							{text}
						</p>
					) : (
						<p className="text-muted-foreground text-sm">
							This passage's text isn't available in your translation yet.
						</p>
					)}
					{notes.map((note) => (
						<Link
							className="flex gap-2.5 rounded-[10px] bg-secondary px-3 py-2.5 text-secondary-foreground text-sm outline-none hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
							key={note.id}
							params={{ noteId: note.id }}
							to="/library/notes/$noteId"
						>
							<FileTextIcon
								aria-hidden="true"
								className="mt-0.5 size-4 shrink-0"
							/>
							<span className="line-clamp-2">
								{note.title ? (
									<strong className="font-semibold">{note.title}. </strong>
								) : null}
								{getDocumentText(note.content)}
							</span>
						</Link>
					))}
					{isNext ? (
						<div className="flex flex-wrap gap-2">
							{/* TODO(collections): add "Open in reader" once the Bible reader exists. */}
							<Link
								className={buttonVariants({
									className: "h-11 rounded-[9px] px-3.5 text-sm",
									variant: "outline",
								})}
								search={{
									collection: collectionId,
									passage: passage.passageId,
								}}
								to="/library/notes/new"
							>
								Add note
							</Link>
							<Button
								className="h-11 rounded-[9px] px-3.5 text-sm"
								onClick={onMarkRead}
								type="button"
								variant="outline"
							>
								Mark as read
							</Button>
						</div>
					) : null}
				</div>
			</article>
		</li>
	);
}

function PassageMenu({
	canMoveDown,
	canMoveUp,
	columns,
	currentKey,
	isRead,
	onMove,
	onRemove,
	onToggleRead,
	passageIndex,
	reference,
}: {
	canMoveDown: boolean;
	canMoveUp: boolean;
	columns: readonly PassageColumn[];
	currentKey: string;
	isRead: boolean;
	onMove: (toKey: string, toIndex: number) => void;
	onRemove: () => void;
	onToggleRead: () => void;
	passageIndex: number;
	reference: string;
}) {
	// Other places this passage can go: out of sections, or another section.
	const hasSections = columns.some((column) => column.sectionId !== null);
	const unsectioned = columns.find((column) => column.key === unsectionedKey);
	const targets = hasSections
		? [
				...(currentKey === unsectionedKey
					? []
					: [
							{
								key: unsectionedKey,
								label: "Move out of sections",
								length: unsectioned?.ids.length ?? 0,
							},
						]),
				...columns
					.filter(
						(column) => column.sectionId !== null && column.key !== currentKey,
					)
					.map((column) => ({
						key: column.key,
						label: `Move to “${column.title}”`,
						length: column.ids.length,
					})),
			]
		: [];

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={`Options for ${reference}`}
						className="size-11 rounded-lg text-muted-foreground"
						type="button"
						variant="ghost"
					/>
				}
			>
				<EllipsisIcon aria-hidden="true" className="size-5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-52">
				<DropdownMenuItem onClick={onToggleRead}>
					{isRead ? (
						<CircleIcon aria-hidden="true" />
					) : (
						<CheckIcon aria-hidden="true" />
					)}
					{isRead ? "Mark as unread" : "Mark as read"}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					disabled={!canMoveUp}
					onClick={() => onMove(currentKey, passageIndex - 1)}
				>
					<ArrowUpIcon aria-hidden="true" />
					Move up
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={!canMoveDown}
					onClick={() => onMove(currentKey, passageIndex + 1)}
				>
					<ArrowDownIcon aria-hidden="true" />
					Move down
				</DropdownMenuItem>
				{targets.map((target) => (
					<DropdownMenuItem
						key={target.key}
						onClick={() => onMove(target.key, target.length)}
					>
						<FolderInputIcon aria-hidden="true" />
						{target.label}
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onRemove} variant="destructive">
					<Trash2Icon aria-hidden="true" />
					Remove from collection
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function SectionMenu({
	canMoveDown,
	canMoveUp,
	onDelete,
	onMove,
	onRename,
	title,
}: {
	canMoveDown: boolean;
	canMoveUp: boolean;
	onDelete: () => void;
	onMove: (offset: number) => void;
	onRename: () => void;
	title: string;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={`Options for section ${title}`}
						className="ml-auto size-11 rounded-lg text-muted-foreground"
						type="button"
						variant="ghost"
					/>
				}
			>
				<EllipsisIcon aria-hidden="true" className="size-5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuItem onClick={onRename}>
					<PencilIcon aria-hidden="true" />
					Rename section
				</DropdownMenuItem>
				<DropdownMenuItem disabled={!canMoveUp} onClick={() => onMove(-1)}>
					<ArrowUpIcon aria-hidden="true" />
					Move section up
				</DropdownMenuItem>
				<DropdownMenuItem disabled={!canMoveDown} onClick={() => onMove(1)}>
					<ArrowDownIcon aria-hidden="true" />
					Move section down
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={onDelete} variant="destructive">
					<Trash2Icon aria-hidden="true" />
					Delete section (keeps passages)
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
