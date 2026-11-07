import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	newQuestionView,
	type QuestionBody,
	type QuestionStance,
	type QuestionView,
	questionBodySchema,
	questionChecklist,
	questionDocuments,
	questionStanceChange,
	questionStanceLabels,
	questionStances,
	viewLetter,
} from "@berean-study/db/interpretation-body";
import { getDocumentCommentaryNodes } from "@berean-study/rich-text-editor/document";
import { Input } from "@berean-study/ui/components/input";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpIcon, ChevronDownIcon, Trash2Icon, XIcon } from "lucide-react";
import { useDeferredValue, useState } from "react";

import {
	nameableSourcesQueryOptions,
	studyRecordQueryOptions,
	studyRecordsQueryOptions,
} from "@/queries/study-content";

import { useCommentaryInsertTools } from "../commentary/commentary-insert-tools";
import { BeforeReviewCard } from "../commentary/commentary-side-panels";
import { DraftControls, RecordBanner } from "../evidence/draft-controls";
import {
	EvidenceField,
	evidenceInputClassName,
	OptionPills,
} from "../evidence/evidence-display";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import { StatusChip } from "../status-chip";
import { StudyPreview } from "./study-previews";
import {
	canEditRecord,
	citationsBefore,
	FoundationalChangeNotice,
	StudyRecordList,
	StudyRichText,
	useStudyDraft,
} from "./study-shared";

const stanceOptions = questionStances.map((value) => ({
	label: questionStanceLabels[value],
	value,
}));

export function QuestionsListPage({ search }: { search?: string }) {
	const navigate = useNavigate({ from: "/work/questions" });
	const { data } = useSuspenseQuery(
		studyRecordsQueryOptions({ kinds: ["interpretive_question"], search }),
	);
	return (
		<StaffPage
			actions={
				<Link
					className={cn(
						staffLinkClassName,
						"bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
					)}
					search={{ new: true }}
					to="/work/questions"
				>
					New question
				</Link>
			}
			description="Points where faithful readers differ, with each view stated at its strongest."
			section="Interpretation"
			title="Interpretive questions"
		>
			<StudyRecordList
				emptyMessage="No questions match that yet."
				onSearch={(next) => navigate({ search: { q: next } })}
				renderLink={(row, className) => (
					<Link
						className={className}
						search={{ id: row.scopeKey }}
						to="/work/questions"
					>
						{row.title}
					</Link>
				)}
				rows={data}
				search={search}
				title="All questions"
			/>
		</StaffPage>
	);
}

export function QuestionEditorPage({
	id,
	initialPassage,
	permissionKeys,
}: {
	id: string | null;
	initialPassage: string;
	permissionKeys: readonly PermissionKey[];
}) {
	const [restart, setRestart] = useState(0);
	const onRestart = () => setRestart((value) => value + 1);
	if (id !== null) {
		return (
			<ExistingQuestion
				id={id}
				key={restart}
				onRestart={onRestart}
				permissionKeys={permissionKeys}
			/>
		);
	}
	return (
		<QuestionForm
			id={null}
			key={restart}
			onRestart={onRestart}
			permissionKeys={permissionKeys}
			record={null}
			start={{
				passage: initialPassage,
				preferredViewKey: null,
				question: "",
				stance: "no_position",
				views: [
					newQuestionView(crypto.randomUUID()),
					newQuestionView(crypto.randomUUID()),
				],
				whyItMatters: "",
			}}
		/>
	);
}

function ExistingQuestion({
	id,
	onRestart,
	permissionKeys,
}: {
	id: string;
	onRestart: () => void;
	permissionKeys: readonly PermissionKey[];
}) {
	const { data } = useSuspenseQuery(
		studyRecordQueryOptions({
			kind: "interpretive_question",
			scopeKey: id,
		}),
	);
	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this question</h1>
				<Link
					className={cn(staffLinkClassName, "mt-6")}
					search={{}}
					to="/work/questions"
				>
					All questions
				</Link>
			</div>
		);
	}
	return (
		<QuestionForm
			id={id}
			onRestart={onRestart}
			permissionKeys={permissionKeys}
			record={data.state}
			start={questionBodySchema.parse(data.body)}
		/>
	);
}

type RecordState = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof studyRecordQueryOptions>["queryFn"]>
		>
	>
>["state"];

function QuestionForm({
	id,
	onRestart,
	permissionKeys,
	record,
	start,
}: {
	id: string | null;
	onRestart: () => void;
	permissionKeys: readonly PermissionKey[];
	record: RecordState | null;
	start: QuestionBody;
}) {
	const navigate = useNavigate({ from: "/work/questions" });
	const draft = useStudyDraft({
		kind: "interpretive_question",
		onCreated: (scopeKey) => navigate({ search: { id: scopeKey } }),
		schema: questionBodySchema,
		scopeKey: id,
		start,
	});
	const { cleaned, setBody } = draft;
	const body = draft.body;
	const tools = useCommentaryInsertTools();
	const [openKey, setOpenKey] = useState<string | null>(
		start.views[0]?.key ?? null,
	);
	const [preview, setPreview] = useState(false);
	const canEdit = canEditRecord(permissionKeys, record);
	const checklist = questionChecklist(cleaned);
	const problems = checklist
		.filter(({ blocking, ok }) => blocking && !ok)
		.map(({ text }) => text);
	const documents = questionDocuments(cleaned);
	const live = record?.live
		? questionBodySchema.safeParse(record.live.body)
		: null;

	const setView = (key: string, change: Partial<QuestionView>) =>
		setBody((previous) => ({
			...previous,
			views: previous.views.map((view) =>
				view.key === key ? { ...view, ...change } : view,
			),
		}));
	const moveUp = (index: number) =>
		setBody((previous) => {
			const views = [...previous.views];
			const moving = views[index];
			const other = views[index - 1];
			if (!moving || !other) return previous;
			views[index] = other;
			views[index - 1] = moving;
			return { ...previous, views };
		});

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
						isDirty={draft.isDirty}
						onDiscarded={(removed) =>
							removed ? navigate({ search: {} }) : onRestart()
						}
						onSaved={draft.onSaved}
						permissionKeys={permissionKeys}
						problems={problems}
						save={draft.save}
						state={record}
					/>
				</>
			}
			section="Interpretive questions"
			title={body.passage || "New question"}
		>
			<div className="space-y-3">
				<RecordBanner state={record} />
				{live?.success ? (
					<FoundationalChangeNotice
						change={questionStanceChange(live.data, cleaned)}
					/>
				) : null}
			</div>
			<div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
				<div className="min-w-0 space-y-4">
					{preview ? (
						<StudyPreview
							input={{ body: cleaned, kind: "interpretive_question" }}
							title={body.passage}
						/>
					) : (
						<>
							<StaffCard>
								<fieldset className="space-y-5" disabled={!canEdit}>
									<EvidenceField label="Passage">
										{(fieldId) => (
											<Input
												className={evidenceInputClassName}
												id={fieldId}
												maxLength={100}
												onChange={(event) => {
													const passage = event.target.value;
													setBody((previous) => ({ ...previous, passage }));
												}}
												placeholder="Romans 7:14-25"
												value={body.passage}
											/>
										)}
									</EvidenceField>
									<EvidenceField label="Question">
										{(fieldId) => (
											<Textarea
												className="min-h-20 rounded-[0.625rem]"
												id={fieldId}
												maxLength={500}
												onChange={(event) => {
													const question = event.target.value;
													setBody((previous) => ({ ...previous, question }));
												}}
												value={body.question}
											/>
										)}
									</EvidenceField>
									<EvidenceField label="Why it matters">
										{(fieldId) => (
											<Textarea
												className="min-h-20 rounded-[0.625rem]"
												id={fieldId}
												maxLength={2000}
												onChange={(event) => {
													const whyItMatters = event.target.value;
													setBody((previous) => ({
														...previous,
														whyItMatters,
													}));
												}}
												value={body.whyItMatters}
											/>
										)}
									</EvidenceField>
									<OptionPills<QuestionStance>
										label="Berean Study's stance"
										onChange={(stance) =>
											setBody((previous) => ({
												...previous,
												preferredViewKey:
													stance === "no_position"
														? null
														: previous.preferredViewKey,
												stance,
											}))
										}
										options={stanceOptions}
										value={body.stance}
									/>
									{body.stance === "preferred_view" ? (
										<OptionPills
											label="Preferred view"
											onChange={(preferredViewKey) =>
												setBody((previous) => ({
													...previous,
													preferredViewKey,
												}))
											}
											options={body.views.map(({ key, name }, index) => ({
												label: `${viewLetter(index)}. ${name || "Untitled"}`,
												value: key,
											}))}
											value={body.preferredViewKey}
										/>
									) : null}
								</fieldset>
							</StaffCard>

							<StaffCard
								actions={
									<span className="text-muted-foreground text-sm">
										Shown to readers in this order
									</span>
								}
								title="Interpretation views"
							>
								<ol className="space-y-2">
									{body.views.map((view, index) => (
										<ViewCard
											canEdit={canEdit}
											canRemove={body.views.length > 1}
											citationOffset={citationsBefore(documents, index)}
											index={index}
											isOpen={openKey === view.key}
											key={view.key}
											onChange={(change) => setView(view.key, change)}
											onMoveUp={() => moveUp(index)}
											onRemove={() =>
												setBody((previous) => ({
													...previous,
													preferredViewKey:
														previous.preferredViewKey === view.key
															? null
															: previous.preferredViewKey,
													views: previous.views.filter(
														({ key }) => key !== view.key,
													),
												}))
											}
											onToggle={() =>
												setOpenKey((current) =>
													current === view.key ? null : view.key,
												)
											}
											tools={tools}
											view={view}
										/>
									))}
								</ol>
								{canEdit ? (
									<StaffButton
										className="mt-3"
										onClick={() => {
											const view = newQuestionView(crypto.randomUUID());
											setBody((previous) => ({
												...previous,
												views: [...previous.views, view],
											}));
											setOpenKey(view.key);
										}}
										variant="outline"
									>
										+ Add a view
									</StaffButton>
								) : null}
							</StaffCard>
						</>
					)}
				</div>
				<aside className="space-y-4">
					<BeforeReviewCard items={checklist} title="Fairness check" />
					<StaffCard>
						<p className="text-muted-foreground text-sm">
							Check each view states its strongest argument, and that its name
							is one its holders would accept. The question and its views are
							reviewed and published together.
						</p>
					</StaffCard>
				</aside>
			</div>
			{tools.dialogs}
		</StaffPage>
	);
}

function ViewCard({
	canEdit,
	canRemove,
	citationOffset,
	index,
	isOpen,
	onChange,
	onMoveUp,
	onRemove,
	onToggle,
	tools,
	view,
}: {
	canEdit: boolean;
	canRemove: boolean;
	citationOffset: number;
	index: number;
	isOpen: boolean;
	onChange: (change: Partial<QuestionView>) => void;
	onMoveUp: () => void;
	onRemove: () => void;
	onToggle: () => void;
	tools: ReturnType<typeof useCommentaryInsertTools>;
	view: QuestionView;
}) {
	const [addingSource, setAddingSource] = useState(false);
	const noCitations =
		getDocumentCommentaryNodes(view.argument).citations.length === 0;
	const title = view.name || "Untitled view";

	return (
		<li className="rounded-xl border border-border-subtle">
			<div className="flex items-center gap-1 p-1">
				<button
					aria-expanded={isOpen}
					className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={onToggle}
					type="button"
				>
					<span
						aria-hidden="true"
						className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent font-semibold text-sidebar-accent-foreground text-sm"
					>
						{viewLetter(index)}
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate font-medium text-sm">{title}</span>
						<span className="block text-muted-foreground text-xs">
							Held by {view.heldBy.length}{" "}
							{view.heldBy.length === 1 ? "source" : "sources"}
						</span>
					</span>
					{noCitations ? (
						<StatusChip tone="attention">No citations</StatusChip>
					) : null}
					<ChevronDownIcon
						aria-hidden="true"
						className={cn("size-4 shrink-0", isOpen && "rotate-180")}
					/>
				</button>
				{canEdit ? (
					<>
						<StaffButton
							aria-label={`Move ${title} up`}
							disabled={index === 0}
							onClick={onMoveUp}
							size="icon"
							variant="ghost"
						>
							<ArrowUpIcon aria-hidden="true" />
						</StaffButton>
						<StaffButton
							aria-label={`Remove ${title}`}
							disabled={!canRemove}
							onClick={onRemove}
							size="icon"
							variant="ghost"
						>
							<Trash2Icon aria-hidden="true" />
						</StaffButton>
					</>
				) : null}
			</div>
			{isOpen ? (
				<div className="space-y-4 border-border-subtle border-t p-4">
					<fieldset disabled={!canEdit}>
						<EvidenceField label="View name">
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={200}
									onChange={(event) => onChange({ name: event.target.value })}
									value={view.name}
								/>
							)}
						</EvidenceField>
					</fieldset>
					<div className="space-y-2">
						<p className="font-semibold text-sm">Argument</p>
						<StudyRichText
							ariaLabel={`Argument for ${title}`}
							citationOffset={citationOffset}
							editable={canEdit}
							onChange={(argument) => onChange({ argument })}
							placeholder="State this view's strongest argument…"
							tools={tools}
							value={view.argument}
						/>
					</div>
					<div className="space-y-2">
						<p className="font-semibold text-sm">Held by</p>
						<ul className="flex flex-wrap gap-1.5">
							{view.heldBy.map(({ label, sourceId }) => (
								<li
									className="inline-flex min-h-8 items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-sm"
									key={sourceId}
								>
									{label}
									{canEdit ? (
										<button
											aria-label={`Remove ${label}`}
											className="inline-flex size-6 items-center justify-center rounded-full hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											onClick={() =>
												onChange({
													heldBy: view.heldBy.filter(
														(source) => source.sourceId !== sourceId,
													),
												})
											}
											type="button"
										>
											<XIcon aria-hidden="true" className="size-3.5" />
										</button>
									) : null}
								</li>
							))}
						</ul>
						{canEdit ? (
							<StaffButton
								onClick={() => setAddingSource(true)}
								variant="outline"
							>
								+ Add source
							</StaffButton>
						) : null}
						{addingSource ? (
							<AddSourceDialog
								onClose={() => setAddingSource(false)}
								onPick={(source) => {
									if (
										!view.heldBy.some(
											({ sourceId }) => sourceId === source.sourceId,
										)
									) {
										onChange({ heldBy: [...view.heldBy, source] });
									}
									setAddingSource(false);
								}}
							/>
						) : null}
					</div>
				</div>
			) : null}
		</li>
	);
}

function AddSourceDialog({
	onClose,
	onPick,
}: {
	onClose: () => void;
	onPick: (source: { label: string; sourceId: number }) => void;
}) {
	const [search, setSearch] = useState("");
	const deferred = useDeferredValue(search);
	const { data: sources = [], isFetching } = useQuery(
		nameableSourcesQueryOptions(deferred),
	);
	return (
		<StaffFormDialog
			canSubmit={false}
			description="Choose a source that holds this view. It has to be live before the question can be published."
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			onSubmit={() => undefined}
			open
			pending={false}
			submitLabel="Choose a source above"
			title="Add a source"
		>
			<EvidenceField label="Search sources">
				{(id) => (
					<Input
						autoFocus
						className={evidenceInputClassName}
						id={id}
						maxLength={200}
						onChange={(event) => setSearch(event.target.value)}
						type="search"
						value={search}
					/>
				)}
			</EvidenceField>
			<ul aria-busy={isFetching} className="max-h-56 space-y-1 overflow-y-auto">
				{sources.map((source) => (
					<li key={source.id}>
						<button
							className="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-[0.625rem] border border-border p-2.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={() =>
								onPick({ label: source.title, sourceId: source.id })
							}
							type="button"
						>
							<span className="min-w-0 font-medium">{source.title}</span>
							{source.liveNumber ? null : (
								<StatusChip tone="attention">Not live yet</StatusChip>
							)}
						</button>
					</li>
				))}
				{sources.length === 0 && !isFetching ? (
					<li className="text-muted-foreground text-sm">
						No sources match that search.
					</li>
				) : null}
			</ul>
			<Link
				className={staffLinkClassName}
				search={{ step: "source" }}
				target="_blank"
				to="/work/sources/evidence"
			>
				New source
			</Link>
		</StaffFormDialog>
	);
}
