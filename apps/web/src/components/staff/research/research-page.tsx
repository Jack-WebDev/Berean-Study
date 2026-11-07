import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Textarea } from "@berean-study/ui/components/textarea";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteResearchNote, saveResearchNote } from "@/functions/evidence";
import { formatStaffDate } from "@/lib/format";
import {
	evidenceSourcesQueryOptions,
	researchNotesQueryOptions,
} from "@/queries/evidence";
import { evidenceKeys } from "@/queries/keys";

import {
	EvidenceField,
	evidenceInputClassName,
} from "../evidence/evidence-display";
import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import { StatusChip } from "../status-chip";

type NoteDraft = {
	content: string;
	id?: number;
	reference: string;
	sources: {
		key: number;
		locator: string;
		sourceId: number;
		title?: string;
	}[];
};

export function ResearchPage({
	search,
	viewerUserId,
}: {
	search?: string;
	viewerUserId: string;
}) {
	const navigate = useNavigate({ from: "/work/research" });
	const queryClient = useQueryClient();
	const { data: notes } = useSuspenseQuery(
		researchNotesQueryOptions({ search }),
	);
	const [searchText, setSearchText] = useState(search ?? "");
	const [editing, setEditing] = useState<NoteDraft | null>(null);

	const remove = useMutation({
		mutationFn: (id: number) => deleteResearchNote({ data: { id } }),
		onError: (error) => toast.error(error.message),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: evidenceKeys.all }),
		onSuccess: () => toast.success("Note deleted."),
	});

	return (
		<StaffPage
			actions={
				<StaffButton
					onClick={() =>
						setEditing({ content: "", reference: "", sources: [] })
					}
				>
					New note
				</StaffButton>
			}
			description="Working notes for the team, tied to a passage and the sources behind them. Readers never see these, so they don't need review."
			section="Contributor"
			title="Research"
		>
			<form
				className="mb-4"
				onSubmit={(event) => {
					event.preventDefault();
					navigate({
						search: { q: searchText.trim() || undefined },
					});
				}}
			>
				<EvidenceField label="Search">
					{(id) => (
						<Input
							className="h-11 max-w-md rounded-[0.625rem] text-sm"
							id={id}
							maxLength={200}
							onChange={(event) => setSearchText(event.target.value)}
							placeholder="Press Enter to search"
							type="search"
							value={searchText}
						/>
					)}
				</EvidenceField>
			</form>

			<StaffCard>
				{notes.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{search ? "No notes match that search." : "No research notes yet."}
					</p>
				) : (
					<ul className="divide-y divide-border-subtle">
						{notes.map((note) => (
							<li className="py-4 first:pt-0 last:pb-0" key={note.id}>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="font-semibold">{note.reference}</p>
										<p className="text-muted-foreground text-xs">
											{note.authorName} · updated{" "}
											{formatStaffDate(note.updatedAt)}
										</p>
									</div>
									<div className="flex gap-2">
										<StaffButton
											onClick={() =>
												setEditing({
													content: note.content,
													id: note.id,
													reference: note.reference,
													sources: note.sources.map((link, key) => ({
														key,
														locator: link.locator ?? "",
														sourceId: link.sourceId,
														title: link.title,
													})),
												})
											}
											variant="outline"
										>
											Edit
										</StaffButton>
										{note.authorUserId === viewerUserId ? (
											<StaffButton
												disabled={remove.isPending}
												onClick={() => remove.mutate(note.id)}
												variant="outline"
											>
												Delete
											</StaffButton>
										) : null}
									</div>
								</div>
								<p className="mt-2 whitespace-pre-wrap text-sm">
									{note.content}
								</p>
								{note.sources.length > 0 ? (
									<ul className="mt-2 flex flex-wrap gap-1.5">
										{note.sources.map((source) => (
											<li key={source.sourceId}>
												<StatusChip
													className="whitespace-normal"
													tone={
														source.status === "active" ? "neutral" : "attention"
													}
												>
													{source.title}
													{source.locator ? ` · ${source.locator}` : ""}
													{source.status === "retired" ? " · retired" : ""}
												</StatusChip>
											</li>
										))}
									</ul>
								) : null}
							</li>
						))}
					</ul>
				)}
			</StaffCard>

			{editing ? (
				<NoteDialog initial={editing} onClose={() => setEditing(null)} />
			) : null}
		</StaffPage>
	);
}

function NoteDialog({
	initial,
	onClose,
}: {
	initial: NoteDraft;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const { data: sourceOptions } = useSuspenseQuery(
		evidenceSourcesQueryOptions({}),
	);
	const [reference, setReference] = useState(initial.reference);
	const [content, setContent] = useState(initial.content);
	const [links, setLinks] = useState(initial.sources);
	const [nextKey, setNextKey] = useState(initial.sources.length);

	const save = useMutation({
		mutationFn: () =>
			saveResearchNote({
				data: {
					content,
					id: initial.id,
					reference,
					sources: links
						.filter(({ sourceId }) => sourceId > 0)
						.map(({ locator, sourceId }) => ({ locator, sourceId })),
				},
			}),
		onError: (error) => toast.error(error.message),
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: evidenceKeys.all }),
		onSuccess: () => {
			toast.success("Note saved.");
			onClose();
		},
	});

	const setLink = (
		key: number,
		change: Partial<NoteDraft["sources"][number]>,
	) =>
		setLinks((previous) =>
			previous.map((link) =>
				link.key === key ? { ...link, ...change } : link,
			),
		);

	return (
		<StaffFormDialog
			canSubmit={reference.trim().length > 0 && content.trim().length > 0}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
			onSubmit={() => save.mutate()}
			open
			pending={save.isPending}
			submitLabel="Save note"
			title={initial.id ? "Edit research note" : "New research note"}
		>
			<EvidenceField
				hint="A whole book, or a chapter or verses, such as Romans 8:28."
				label="Passage"
			>
				{(id) => (
					<Input
						className={evidenceInputClassName}
						id={id}
						maxLength={100}
						onChange={(event) => setReference(event.target.value)}
						required
						value={reference}
					/>
				)}
			</EvidenceField>
			<EvidenceField label="Note">
				{(id) => (
					<Textarea
						className="min-h-32 rounded-[0.625rem] text-sm"
						id={id}
						maxLength={5000}
						onChange={(event) => setContent(event.target.value)}
						required
						value={content}
					/>
				)}
			</EvidenceField>
			<div className="space-y-3">
				<p className="font-semibold text-sm">Sources</p>
				{links.map((link) => {
					// A retired source stays on notes that already use it, but isn't offered for new ones.
					const linkOptions =
						link.title && !sourceOptions.some(({ id }) => id === link.sourceId)
							? [{ id: link.sourceId, title: link.title }, ...sourceOptions]
							: sourceOptions;
					return (
						<div className="flex items-start gap-2" key={link.key}>
							<div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
								<NativeSelect
									aria-label="Source"
									className="h-11 w-full rounded-[0.625rem]"
									onChange={(event) =>
										setLink(link.key, {
											sourceId: Number(event.target.value),
										})
									}
									value={link.sourceId}
								>
									<NativeSelectOption value={0}>
										Choose a source…
									</NativeSelectOption>
									{linkOptions.map(({ id, title }) => (
										<NativeSelectOption key={id} value={id}>
											{title}
										</NativeSelectOption>
									))}
								</NativeSelect>
								<Input
									aria-label="Page or location"
									className={evidenceInputClassName}
									maxLength={200}
									onChange={(event) =>
										setLink(link.key, { locator: event.target.value })
									}
									placeholder="Page or location"
									value={link.locator}
								/>
							</div>
							<StaffButton
								aria-label="Remove this source"
								onClick={() =>
									setLinks((previous) =>
										previous.filter(({ key }) => key !== link.key),
									)
								}
								size="icon"
								type="button"
								variant="outline"
							>
								<XIcon aria-hidden="true" className="size-4" />
							</StaffButton>
						</div>
					);
				})}
				<StaffButton
					onClick={() => {
						setLinks((previous) => [
							...previous,
							{ key: nextKey, locator: "", sourceId: 0 },
						]);
						setNextKey((key) => key + 1);
					}}
					type="button"
					variant="outline"
				>
					+ Add a source
				</StaffButton>
			</div>
		</StaffFormDialog>
	);
}
