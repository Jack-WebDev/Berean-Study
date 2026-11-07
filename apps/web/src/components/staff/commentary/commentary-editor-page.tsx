import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	type CommentaryBody,
	type CommentaryKind,
	type CommentarySection,
	citationOffset,
	commentaryBodySchema,
	commentaryChecklist,
	commentaryCounts,
	commentaryCoverage,
	formatCoverageGaps,
	newCommentarySection,
} from "@berean-study/db/commentary-body";
import {
	type EditorSession,
	RichTextEditor,
} from "@berean-study/rich-text-editor";
import { Input } from "@berean-study/ui/components/input";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import { type CSSProperties, type DragEvent, useMemo, useState } from "react";

import { commentaryEditorQueryOptions } from "@/queries/commentary";

import { DraftControls, RecordBanner } from "../evidence/draft-controls";
import {
	EvidenceField,
	evidenceInputClassName,
	useUnsavedWarning,
} from "../evidence/evidence-display";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import { StatusChip } from "../status-chip";
import { useCommentaryInsertTools } from "./commentary-insert-tools";
import { CommentaryPreview } from "./commentary-preview";
import {
	BeforeReviewCard,
	CitedInDraftCard,
	type ResearchNoteQuote,
	ResearchNotesCard,
	researchNoteDragType,
} from "./commentary-side-panels";
import { useCommentaryAutosave } from "./use-commentary-autosave";

export function CommentaryEditorPage({
	kind,
	permissionKeys,
	scopeKey,
}: {
	kind: CommentaryKind;
	permissionKeys: readonly PermissionKey[];
	scopeKey: string;
}) {
	const { data } = useSuspenseQuery(
		commentaryEditorQueryOptions({ kind, scopeKey }),
	);
	// Bumped when a draft is thrown away, so the form restarts from what's saved.
	const [restart, setRestart] = useState(0);

	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find these verses</h1>
				<Link className={cn(staffLinkClassName, "mt-6")} to="/work/commentary">
					Start a commentary
				</Link>
			</div>
		);
	}

	return (
		<CommentaryEditor
			data={data}
			key={restart}
			onRestart={() => setRestart((value) => value + 1)}
			permissionKeys={permissionKeys}
		/>
	);
}

type EditorData = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof commentaryEditorQueryOptions>["queryFn"]>
		>
	>
>;

function CommentaryEditor({
	data,
	onRestart,
	permissionKeys,
}: {
	data: EditorData;
	onRestart: () => void;
	permissionKeys: readonly PermissionKey[];
}) {
	const { scope, state } = data;
	const [body, setBody] = useState<CommentaryBody>(data.body);
	const [selectedKey, setSelectedKey] = useState(body.sections[0]?.key ?? null);
	const [preview, setPreview] = useState(false);
	const [session, setSession] = useState<EditorSession | null>(null);

	const canWrite = state.live
		? permissionKeys.includes("content.revise")
		: permissionKeys.includes("content.write");
	const canEdit = canWrite && state.canEdit;

	const cleaned = useMemo(() => {
		const parsed = commentaryBodySchema.safeParse(body);
		return parsed.success ? parsed.data : body;
	}, [body]);

	// Only what the form started from counts as saved, even as the query refreshes.
	const [startingBody] = useState(() => {
		const parsed = commentaryBodySchema.safeParse(data.body);
		return parsed.success ? parsed.data : data.body;
	});
	const autosave = useCommentaryAutosave({
		body: cleaned,
		enabled: canEdit,
		scope: { kind: data.kind, scopeKey: data.scopeKey },
		startingBody,
	});
	useUnsavedWarning(autosave.isDirty);

	const selected =
		body.sections.find(({ key }) => key === selectedKey) ??
		body.sections[0] ??
		null;

	const { askCitation, commentaryTools, dialogs, requestCitation } =
		useCommentaryInsertTools({ blocks: true });

	const setSection = (key: string, change: Partial<CommentarySection>) =>
		setBody((previous) => ({
			...previous,
			sections: previous.sections.map((section) =>
				section.key === key ? { ...section, ...change } : section,
			),
		}));

	const moveSection = (index: number, by: -1 | 1) =>
		setBody((previous) => {
			const sections = [...previous.sections];
			const moving = sections[index];
			const other = sections[index + by];
			if (!moving || !other) return previous;
			sections[index] = other;
			sections[index + by] = moving;
			return { ...previous, sections };
		});

	const removeSection = (key: string) =>
		setBody((previous) => ({
			...previous,
			sections: previous.sections.filter((section) => section.key !== key),
		}));

	const addSection = () => {
		const section = newCommentarySection(crypto.randomUUID());
		setBody((previous) => ({
			...previous,
			sections: [...previous.sections, section],
		}));
		setSelectedKey(section.key);
	};

	async function quoteNote(
		note: ResearchNoteQuote,
		point?: { x: number; y: number },
	) {
		if (!session?.insertQuote(note.content, point)) return;
		const [source] = note.sources;
		if (!source) return;
		const citation = await askCitation({
			locator: source.locator ?? "",
			search: source.title,
		});
		if (citation) session.insertCitation(citation);
	}

	function dropNote(event: DragEvent) {
		const raw = event.dataTransfer.getData(researchNoteDragType);
		if (!raw) return;
		event.preventDefault();
		event.stopPropagation();
		void quoteNote(JSON.parse(raw) as ResearchNoteQuote, {
			x: event.clientX,
			y: event.clientY,
		});
	}

	const checklist = commentaryChecklist(scope, cleaned, data.verseCounts);
	const problems = checklist
		.filter(({ blocking, ok }) => blocking && !ok)
		.map(({ text }) => text);
	const counts = commentaryCounts(cleaned);
	const coverage =
		scope.kind === "passage_commentary"
			? {
					result: commentaryCoverage(scope, cleaned.sections, data.verseCounts),
					scope,
				}
			: null;

	return (
		<StaffPage
			actions={
				<>
					<StaffButton
						aria-pressed={preview}
						onClick={() => setPreview((value) => !value)}
						variant="outline"
					>
						{preview ? "Back to editing" : "Preview as reader"}
					</StaffButton>
					<DraftControls
						canSave={canEdit}
						isDirty={false}
						onDiscarded={() => onRestart()}
						onSaved={() => undefined}
						permissionKeys={permissionKeys}
						problems={problems}
						save={async () => {
							const saved = await autosave.saveNow();
							return { id: saved.contentItemId, revisionId: saved.revisionId };
						}}
						state={state}
					/>
				</>
			}
			section={data.kindLabel}
			title={data.scopeLabel}
		>
			<div className="-mt-4 mb-5 flex flex-wrap items-center gap-2">
				<SaveStatus autosave={autosave} canEdit={canEdit} />
				<Link
					className="text-muted-foreground text-sm underline-offset-4 hover:underline"
					search={{}}
					to="/work/commentary"
				>
					Other commentary
				</Link>
			</div>

			<div className="space-y-3">
				<RecordBanner state={state} />
				{canWrite ? null : (
					<p className="text-muted-foreground text-sm">
						You don't have permission to change this.
					</p>
				)}
				{data.overlaps.length > 0 ? (
					<div
						className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground"
						role="status"
					>
						<p className="font-semibold">
							Some of these verses are covered elsewhere
						</p>
						<ul className="mt-1 space-y-0.5">
							{data.overlaps.map((other) => (
								<li key={other.scopeKey}>
									<Link
										className="underline underline-offset-4"
										search={{
											kind: "passage_commentary",
											scope: other.scopeKey,
										}}
										to="/work/commentary"
									>
										{other.title}
									</Link>{" "}
									shares some of them. You can carry on.
								</li>
							))}
						</ul>
					</div>
				) : null}
			</div>

			<div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
				<div className="min-w-0 space-y-4">
					{preview ? (
						<CommentaryPreview body={cleaned} />
					) : (
						<>
							<StaffCard>
								<fieldset disabled={!canEdit}>
									<EvidenceField hint={scopeHint(data.kind)} label="Title">
										{(id) => (
											<Input
												className={evidenceInputClassName}
												id={id}
												maxLength={200}
												onChange={(event) =>
													setBody((previous) => ({
														...previous,
														title: event.target.value,
													}))
												}
												value={body.title}
											/>
										)}
									</EvidenceField>
								</fieldset>
							</StaffCard>

							<StaffCard title="Sections">
								{coverage ? (
									<CoverageBar
										coverage={coverage.result}
										scope={coverage.scope}
									/>
								) : null}
								<ol className="space-y-1.5">
									{body.sections.map((section, index) => (
										<li
											className={cn(
												"flex items-center gap-1 rounded-xl border py-1 pr-1 pl-1",
												section.key === selected?.key
													? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
													: "border-border-subtle",
											)}
											key={section.key}
										>
											<button
												aria-current={
													section.key === selected?.key ? "true" : undefined
												}
												className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												onClick={() => setSelectedKey(section.key)}
												type="button"
											>
												<span className="truncate font-medium text-sm">
													{index + 1}. {section.title || "Untitled section"}
												</span>
												<span className="text-xs opacity-80">
													{section.range
														? `Verses ${section.range}`
														: data.kind === "book_introduction"
															? "Whole book"
															: "All of these verses"}
												</span>
											</button>
											{canEdit ? (
												<>
													<StaffButton
														aria-label={`Move ${section.title || "section"} up`}
														disabled={index === 0}
														onClick={() => moveSection(index, -1)}
														size="icon"
														variant="ghost"
													>
														<ArrowUpIcon aria-hidden="true" />
													</StaffButton>
													<StaffButton
														aria-label={`Move ${section.title || "section"} down`}
														disabled={index === body.sections.length - 1}
														onClick={() => moveSection(index, 1)}
														size="icon"
														variant="ghost"
													>
														<ArrowDownIcon aria-hidden="true" />
													</StaffButton>
													<StaffButton
														aria-label={`Remove ${section.title || "section"}`}
														disabled={body.sections.length === 1}
														onClick={() => removeSection(section.key)}
														size="icon"
														variant="ghost"
													>
														<Trash2Icon aria-hidden="true" />
													</StaffButton>
												</>
											) : null}
										</li>
									))}
								</ol>
								{canEdit ? (
									<StaffButton
										className="mt-3"
										onClick={addSection}
										variant="outline"
									>
										+ Add section
									</StaffButton>
								) : null}
							</StaffCard>

							{selected ? (
								<section aria-label="Section editor" className="space-y-3">
									<fieldset
										className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]"
										disabled={!canEdit}
									>
										<EvidenceField label="Section title">
											{(id) => (
												<Input
													className={evidenceInputClassName}
													id={id}
													maxLength={200}
													onChange={(event) =>
														setSection(selected.key, {
															title: event.target.value,
														})
													}
													value={selected.title}
												/>
											)}
										</EvidenceField>
										{data.kind === "book_introduction" ? null : (
											<EvidenceField label="Covers">
												{(id) => (
													<Input
														className={evidenceInputClassName}
														id={id}
														maxLength={40}
														onChange={(event) =>
															setSection(selected.key, {
																range: event.target.value,
															})
														}
														placeholder={
															scope.kind !== "book_introduction" &&
															scope.from.chapter === scope.to.chapter
																? "18–22"
																: "8:18–22"
														}
														value={selected.range}
													/>
												)}
											</EvidenceField>
										)}
									</fieldset>
									<div
										onDragOverCapture={(event) => {
											if (
												event.dataTransfer.types.includes(researchNoteDragType)
											) {
												event.preventDefault();
											}
										}}
										onDropCapture={dropNote}
										style={
											{
												"--citation-offset": citationOffset(
													cleaned,
													selected.key,
												),
											} as CSSProperties
										}
									>
										<RichTextEditor
											ariaLabel={selected.title || "Section text"}
											className="shadow-none"
											commentaryTools={canEdit ? commentaryTools : undefined}
											editable={canEdit}
											footer={
												<p className="px-4 py-2 text-muted-foreground text-xs">
													{counts.words} words · {counts.references}{" "}
													{counts.references === 1 ? "reference" : "references"}{" "}
													· {counts.citations}{" "}
													{counts.citations === 1 ? "citation" : "citations"}
												</p>
											}
											key={selected.key}
											onChange={(document) =>
												setSection(selected.key, { body: document })
											}
											onRequestCitation={canEdit ? requestCitation : undefined}
											onSessionReady={setSession}
											placeholder="Start writing this section…"
											preset="contributor"
											toolbar="simple"
											value={selected.body}
										/>
									</div>
									<p className="text-muted-foreground text-xs">
										Same editor as your Notes. Section order, titles and verses
										are part of the revision, so reviewers see structural
										changes too.
									</p>
								</section>
							) : null}
						</>
					)}
				</div>

				<aside className="space-y-4">
					<CitedInDraftCard body={cleaned} />
					<BeforeReviewCard items={checklist} />
					<ResearchNotesCard
						bookName={data.bookName}
						bookSlug={scope.bookSlug}
						canQuote={canEdit && !preview}
						onQuote={(note) => void quoteNote(note)}
					/>
				</aside>
			</div>

			{dialogs}
		</StaffPage>
	);
}

function scopeHint(kind: CommentaryKind) {
	if (kind === "book_introduction") {
		return "One introduction per book. Rename or remove any of the suggested sections.";
	}
	if (kind === "passage_commentary") {
		return "Sections must stay inside these verses. Gaps are flagged, not blocked.";
	}
	return "This can stay a single note, or be split into sections.";
}

function SaveStatus({
	autosave,
	canEdit,
}: {
	autosave: ReturnType<typeof useCommentaryAutosave>;
	canEdit: boolean;
}) {
	if (!canEdit) return null;
	if (autosave.error && !autosave.isSaving) {
		return (
			<StatusChip tone="danger">
				Couldn't save: {autosave.error.message}
			</StatusChip>
		);
	}
	if (autosave.isSaving) return <StatusChip tone="neutral">Saving…</StatusChip>;
	if (autosave.isDirty) {
		return <StatusChip tone="neutral">Unsaved changes</StatusChip>;
	}
	if (autosave.savedAt) {
		return (
			<StatusChip tone="success">
				Saved{" "}
				{autosave.savedAt.toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				})}
			</StatusChip>
		);
	}
	return null;
}

function CoverageBar({
	coverage,
	scope,
}: {
	coverage: ReturnType<typeof commentaryCoverage>;
	scope: Parameters<typeof formatCoverageGaps>[1];
}) {
	const { cells, gaps, unknownChapters } = coverage;
	const summary =
		gaps.length === 0
			? "Every verse is covered"
			: `${gaps.length === 1 ? "Verse" : "Verses"} ${formatCoverageGaps(gaps, scope)} ${gaps.length === 1 ? "is" : "are"} not covered by any section`;
	return (
		<div className="mb-4">
			<div aria-label={summary} className="flex gap-0.5" role="img">
				{cells.map(({ chapter, covered, verse }) => (
					<span
						className={cn(
							"h-2.5 min-w-0 flex-1 rounded-[3px]",
							covered ? "bg-primary" : "bg-status-danger",
						)}
						key={`${chapter}:${verse}`}
					/>
				))}
			</div>
			<p className="mt-2 text-muted-foreground text-sm">{summary}</p>
			{unknownChapters.length > 0 ? (
				<p className="mt-1 text-muted-foreground text-xs">
					Chapter {unknownChapters.join(", ")} has no verses entered yet, so
					this can't check to its last verse.
				</p>
			) : null}
		</div>
	);
}
