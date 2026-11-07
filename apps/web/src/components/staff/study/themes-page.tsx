import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	emptyThemeBody,
	orderedThemePassages,
	type ThemeBody,
	type ThemePassage,
	type ThemePassageRole,
	themeBodySchema,
	themeChecklist,
	themeDocuments,
	themeOrderLabels,
	themeOrders,
	themePassageRoleLabels,
	themePassageRoles,
	themeRename,
} from "@berean-study/db/interpretation-body";
import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
	decideFoundationalChange,
	previewPassage,
	proposeThemeMerge,
} from "@/functions/study-content";
import { invalidateContent } from "@/queries/content";
import {
	themeEditorQueryOptions,
	themesQueryOptions,
} from "@/queries/study-content";

import { useCommentaryInsertTools } from "../commentary/commentary-insert-tools";
import { BeforeReviewCard } from "../commentary/commentary-side-panels";
import { useContentMutation } from "../content/content-display";
import { DraftControls, RecordBanner } from "../evidence/draft-controls";
import {
	EvidenceField,
	evidenceInputClassName,
	OptionPills,
} from "../evidence/evidence-display";
import { ChangeDecisionPanel } from "../foundations/change-decision-panel";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import { StatusChip } from "../status-chip";
import { ThemePreviewCard } from "./study-previews";
import {
	canEditRecord,
	citationsBefore,
	FoundationalChangeNotice,
	StudyRecordList,
	StudyRichText,
	useStudyDraft,
} from "./study-shared";

const orderOptions = themeOrders.map((value) => ({
	label: themeOrderLabels[value],
	value,
}));

export function ThemesListPage({ search }: { search?: string }) {
	const navigate = useNavigate({ from: "/work/themes" });
	const { data } = useSuspenseQuery(themesQueryOptions(search));
	return (
		<StaffPage
			actions={
				<Link
					className={cn(
						staffLinkClassName,
						"bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
					)}
					search={{ new: true }}
					to="/work/themes"
				>
					New theme
				</Link>
			}
			description="Biblical themes traced across Scripture, with the passages that carry them."
			section="Interpretation"
			title="Themes"
		>
			<StudyRecordList
				emptyMessage="No themes match that yet."
				onSearch={(next) => navigate({ search: { q: next } })}
				renderLink={(row, className) => (
					<Link
						className={className}
						search={{ theme: Number(row.scopeKey) }}
						to="/work/themes"
					>
						{row.title}
					</Link>
				)}
				rows={data}
				search={search}
				title="All themes"
			/>
		</StaffPage>
	);
}

export function ThemeEditorPage({
	initialPassage,
	permissionKeys,
	themeId,
}: {
	initialPassage?: string;
	permissionKeys: readonly PermissionKey[];
	themeId: number | null;
}) {
	const { data } = useSuspenseQuery(themeEditorQueryOptions(themeId));
	const [restart, setRestart] = useState(0);
	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this theme</h1>
				<Link
					className={cn(staffLinkClassName, "mt-6")}
					search={{}}
					to="/work/themes"
				>
					All themes
				</Link>
			</div>
		);
	}
	return (
		<ThemeEditor
			data={data}
			initialPassage={initialPassage}
			key={restart}
			onRestart={() => setRestart((value) => value + 1)}
			permissionKeys={permissionKeys}
		/>
	);
}

type EditorData = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof themeEditorQueryOptions>["queryFn"]>
		>
	>
>;

function ThemeEditor({
	data,
	initialPassage,
	onRestart,
	permissionKeys,
}: {
	data: EditorData;
	initialPassage?: string;
	onRestart: () => void;
	permissionKeys: readonly PermissionKey[];
}) {
	const navigate = useNavigate({ from: "/work/themes" });
	const scopeKey = data.themeId === null ? null : String(data.themeId);
	const draft = useStudyDraft({
		kind: "theme",
		onCreated: (key) => navigate({ search: { theme: Number(key) } }),
		schema: themeBodySchema,
		scopeKey,
		start: themeBodySchema.parse(data.body ?? emptyThemeBody),
	});
	const { body, cleaned, setBody } = draft;
	const tools = useCommentaryInsertTools();
	const isMerged = data.mergedInto !== null;
	const canEdit = !isMerged && canEditRecord(permissionKeys, data.state);
	const checklist = themeChecklist(cleaned);
	const problems = checklist
		.filter(({ blocking, ok }) => blocking && !ok)
		.map(({ text }) => text);
	const passages = orderedThemePassages(cleaned, data.bookPositions);
	const live = data.state?.live
		? themeBodySchema.safeParse(data.state.live.body)
		: null;
	const canConfirm = permissionKeys.includes("content.confirm_foundational");

	const setPassage = (key: string, change: Partial<ThemePassage>) =>
		setBody((previous) => ({
			...previous,
			passages: previous.passages.map((passage) =>
				passage.key === key ? { ...passage, ...change } : passage,
			),
		}));
	const moveUp = (key: string) =>
		setBody((previous) => {
			const list = [...previous.passages];
			const index = list.findIndex((passage) => passage.key === key);
			const moving = list[index];
			const other = list[index - 1];
			if (!moving || !other) return previous;
			list[index] = other;
			list[index - 1] = moving;
			return { ...previous, passages: list };
		});

	return (
		<StaffPage
			actions={
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
					state={data.state}
				/>
			}
			section="Themes"
			title={data.state?.title ?? "New theme"}
		>
			<div className="space-y-3">
				{isMerged && data.mergedInto ? (
					<p
						className="rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground"
						role="status"
					>
						This theme was merged into another one, so it can't change.{" "}
						<Link
							className="underline underline-offset-4"
							search={{ theme: data.mergedInto }}
							to="/work/themes"
						>
							Open that theme
						</Link>
					</p>
				) : null}
				<RecordBanner state={data.state} />
				{live?.success ? (
					<FoundationalChangeNotice change={themeRename(live.data, cleaned)} />
				) : null}
			</div>
			<div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
				<div className="min-w-0 space-y-4">
					<StaffCard>
						<fieldset className="space-y-5" disabled={!canEdit}>
							<EvidenceField label="Name">
								{(id) => (
									<Input
										className={evidenceInputClassName}
										id={id}
										maxLength={100}
										onChange={(event) => {
											const name = event.target.value;
											setBody((previous) => ({ ...previous, name }));
										}}
										value={body.name}
									/>
								)}
							</EvidenceField>
							<RelatedThemes
								canEdit={canEdit}
								onChange={(relatedThemes) =>
									setBody((previous) => ({ ...previous, relatedThemes }))
								}
								options={data.otherThemes}
								value={body.relatedThemes}
							/>
							<EvidenceField label="Summary (shown on cards)">
								{(id) => (
									<Textarea
										className="min-h-20 rounded-[0.625rem]"
										id={id}
										maxLength={300}
										onChange={(event) => {
											const summary = event.target.value;
											setBody((previous) => ({ ...previous, summary }));
										}}
										value={body.summary}
									/>
								)}
							</EvidenceField>
						</fieldset>
						<div className="mt-5 space-y-2">
							<p className="font-semibold text-sm">Description</p>
							<StudyRichText
								ariaLabel="Description"
								citationOffset={citationsBefore(themeDocuments(cleaned), 0)}
								editable={canEdit}
								onChange={(description) =>
									setBody((previous) => ({ ...previous, description }))
								}
								tools={tools}
								value={body.description}
							/>
						</div>
					</StaffCard>

					<StaffCard
						actions={
							<span className="text-muted-foreground text-sm">
								{body.passages.length}
							</span>
						}
						title="Theme passages"
					>
						<fieldset className="space-y-4" disabled={!canEdit}>
							<OptionPills
								label="Order"
								onChange={(order) =>
									setBody((previous) => ({ ...previous, order }))
								}
								options={orderOptions}
								value={body.order}
							/>
							<ol className="space-y-2">
								{passages.map((passage, index) => (
									<PassageRow
										canMoveUp={body.order === "custom" && index > 0}
										isCustomOrder={body.order === "custom"}
										key={passage.key}
										onChange={(change) => setPassage(passage.key, change)}
										onMoveUp={() => moveUp(passage.key)}
										onRemove={() =>
											setBody((previous) => ({
												...previous,
												passages: previous.passages.filter(
													({ key }) => key !== passage.key,
												),
											}))
										}
										passage={passage}
									/>
								))}
							</ol>
							<AddPassage
								initialPassage={initialPassage}
								onAdd={(reference) =>
									setBody((previous) =>
										previous.passages.some(
											(passage) => passage.reference === reference,
										)
											? previous
											: {
													...previous,
													passages: [
														...previous.passages,
														{
															key: crypto.randomUUID(),
															reference,
															role: "supporting",
															why: "",
														},
													],
												},
									)
								}
							/>
							<p className="text-muted-foreground text-xs">
								Each passage here is also listed under Theme passages on that
								verse's Connections page.
							</p>
						</fieldset>
					</StaffCard>
				</div>

				<aside className="space-y-4">
					<ThemePreviewCard body={cleaned} />
					<BeforeReviewCard items={checklist} />
					{data.pendingMerge ? (
						<PendingMerge canDecide={canConfirm} merge={data.pendingMerge} />
					) : canConfirm && data.themeId && data.state?.live && !isMerged ? (
						<MergeThemePanel
							options={data.otherThemes.filter(({ liveNumber }) => liveNumber)}
							themeId={data.themeId}
							title={data.state.title}
						/>
					) : null}
				</aside>
			</div>
			{tools.dialogs}
		</StaffPage>
	);
}

function RelatedThemes({
	canEdit,
	onChange,
	options,
	value,
}: {
	canEdit: boolean;
	onChange: (next: ThemeBody["relatedThemes"]) => void;
	options: EditorData["otherThemes"];
	value: ThemeBody["relatedThemes"];
}) {
	const remaining = options.filter(
		({ scopeKey }) =>
			!value.some(({ themeId }) => String(themeId) === scopeKey),
	);
	return (
		<EvidenceField label="Related themes">
			{(id) => (
				<div className="space-y-2">
					{value.length > 0 ? (
						<ul className="flex flex-wrap gap-1.5">
							{value.map(({ name, themeId }) => (
								<li
									className="inline-flex min-h-8 items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-sm"
									key={themeId}
								>
									{name}
									{canEdit ? (
										<button
											aria-label={`Remove ${name}`}
											className="inline-flex size-6 items-center justify-center rounded-full hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											onClick={() =>
												onChange(
													value.filter((theme) => theme.themeId !== themeId),
												)
											}
											type="button"
										>
											<XIcon aria-hidden="true" className="size-3.5" />
										</button>
									) : null}
								</li>
							))}
						</ul>
					) : null}
					<NativeSelect
						className="h-11 w-full rounded-[0.625rem]"
						id={id}
						onChange={(event) => {
							const picked = remaining.find(
								({ scopeKey }) => scopeKey === event.target.value,
							);
							if (picked) {
								onChange([
									...value,
									{ name: picked.title, themeId: Number(picked.scopeKey) },
								]);
							}
						}}
						value=""
					>
						<NativeSelectOption value="">
							Add a related theme…
						</NativeSelectOption>
						{remaining.map(({ scopeKey, title }) => (
							<NativeSelectOption key={scopeKey} value={scopeKey}>
								{title}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</div>
			)}
		</EvidenceField>
	);
}

const nextRole = (role: ThemePassageRole) =>
	themePassageRoles[
		(themePassageRoles.indexOf(role) + 1) % themePassageRoles.length
	] as ThemePassageRole;

function PassageRow({
	canMoveUp,
	isCustomOrder,
	onChange,
	onMoveUp,
	onRemove,
	passage,
}: {
	canMoveUp: boolean;
	isCustomOrder: boolean;
	onChange: (change: Partial<ThemePassage>) => void;
	onMoveUp: () => void;
	onRemove: () => void;
	passage: ThemePassage;
}) {
	return (
		<li className="rounded-xl border border-border-subtle p-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="min-w-0 flex-1 font-medium text-sm">
					{passage.reference}
				</span>
				<button
					aria-label={`${passage.reference} role: ${themePassageRoleLabels[passage.role]}. Change it to ${themePassageRoleLabels[nextRole(passage.role)]}`}
					className="min-h-11 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
					onClick={() => onChange({ role: nextRole(passage.role) })}
					type="button"
				>
					<StatusChip
						tone={passage.role === "key_text" ? "success" : "neutral"}
					>
						{themePassageRoleLabels[passage.role]}
					</StatusChip>
				</button>
				{isCustomOrder ? (
					<StaffButton
						aria-label={`Move ${passage.reference} up`}
						disabled={!canMoveUp}
						onClick={onMoveUp}
						size="icon"
						variant="ghost"
					>
						<ArrowUpIcon aria-hidden="true" />
					</StaffButton>
				) : null}
				<StaffButton
					aria-label={`Remove ${passage.reference}`}
					onClick={onRemove}
					size="icon"
					variant="ghost"
				>
					<Trash2Icon aria-hidden="true" />
				</StaffButton>
			</div>
			<Input
				aria-label={`Why ${passage.reference} belongs here`}
				className={cn(evidenceInputClassName, "mt-2")}
				maxLength={500}
				onChange={(event) => onChange({ why: event.target.value })}
				placeholder="Why it belongs here"
				value={passage.why}
			/>
		</li>
	);
}

function AddPassage({
	initialPassage,
	onAdd,
}: {
	initialPassage?: string;
	onAdd: (reference: string) => void;
}) {
	const [text, setText] = useState(initialPassage ?? "");
	const check = useMutation({
		mutationFn: () => previewPassage({ data: { text } }),
		onSuccess: ({ label }) => {
			onAdd(label);
			setText("");
		},
	});
	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-end gap-2">
				<div className="min-w-48 flex-1">
					<EvidenceField label="Add a passage">
						{(id) => (
							<Input
								className={evidenceInputClassName}
								id={id}
								maxLength={100}
								onChange={(event) => {
									check.reset();
									setText(event.target.value);
								}}
								onKeyDown={(event) => {
									if (event.key === "Enter" && text.trim()) {
										event.preventDefault();
										check.mutate();
									}
								}}
								placeholder="Genesis 50:20"
								value={text}
							/>
						)}
					</EvidenceField>
				</div>
				<StaffButton
					disabled={!text.trim() || check.isPending}
					onClick={() => check.mutate()}
					variant="outline"
				>
					+ Add passage
				</StaffButton>
			</div>
			{check.error ? (
				<p className="text-sm text-status-danger-foreground" role="alert">
					{check.error.message}
				</p>
			) : null}
		</div>
	);
}

function PendingMerge({
	canDecide,
	merge,
}: {
	canDecide: boolean;
	merge: NonNullable<EditorData["pendingMerge"]>;
}) {
	const queryClient = useQueryClient();
	return (
		<StaffCard title="Merging this theme">
			<div className="space-y-3 text-sm">
				<p>
					{merge.proposedByMe ? "You" : merge.proposerName} proposed:{" "}
					{merge.description}.
				</p>
				<p className="text-muted-foreground">{merge.reason}</p>
				{canDecide ? (
					<ChangeDecisionPanel
						confirmLabel="Confirm & merge"
						decideWith={decideFoundationalChange}
						onDecided={() => invalidateContent(queryClient)}
						proposalId={merge.id}
						proposedByMe={merge.proposedByMe}
					/>
				) : (
					<p className="text-muted-foreground">
						A second Superadmin has to decide it.
					</p>
				)}
			</div>
		</StaffCard>
	);
}

function MergeThemePanel({
	options,
	themeId,
	title,
}: {
	options: EditorData["otherThemes"];
	themeId: number;
	title: string;
}) {
	const [open, setOpen] = useState(false);
	const [intoThemeId, setIntoThemeId] = useState<number | null>(null);
	const [reason, setReason] = useState("");
	const merge = useContentMutation(
		() => {
			if (intoThemeId === null) throw new Error("Choose a theme to keep.");
			return proposeThemeMerge({ data: { intoThemeId, reason, themeId } });
		},
		() => {
			setOpen(false);
			setReason("");
			toast.success("Proposed. A second Superadmin has to confirm it.");
		},
	);
	return (
		<StaffCard title="Merge">
			<p className="text-muted-foreground text-sm">
				Moves this theme's passages into another published theme, and takes this
				one down. A second Superadmin has to confirm.
			</p>
			<StaffButton
				className="mt-3"
				disabled={options.length === 0}
				onClick={() => setOpen(true)}
				variant="outline"
			>
				Merge into another theme
			</StaffButton>
			<StaffFormDialog
				canSubmit={intoThemeId !== null && reason.trim().length > 0}
				description="It can't go ahead while either theme has a draft in progress."
				destructive
				onOpenChange={setOpen}
				onSubmit={() => merge.mutate(undefined)}
				open={open}
				pending={merge.isPending}
				submitLabel="Send for confirmation"
				title={`Merge ${title}`}
			>
				<EvidenceField label="Keep this theme">
					{(id) => (
						<NativeSelect
							className="h-11 w-full rounded-[0.625rem]"
							id={id}
							onChange={(event) =>
								setIntoThemeId(Number(event.target.value) || null)
							}
							value={intoThemeId ?? ""}
						>
							<NativeSelectOption value="">Choose a theme…</NativeSelectOption>
							{options.map(({ scopeKey, title: name }) => (
								<NativeSelectOption key={scopeKey} value={scopeKey}>
									{name}
								</NativeSelectOption>
							))}
						</NativeSelect>
					)}
				</EvidenceField>
				<ReasonField onChange={setReason} value={reason} />
			</StaffFormDialog>
		</StaffCard>
	);
}
