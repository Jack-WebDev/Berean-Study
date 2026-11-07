import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	canonicalRelationshipBodySchema,
	canonicalRelationshipChecklist,
	canonicalRelationshipLabels,
	canonicalRelationshipTypes,
	crossReferenceBodySchema,
	crossReferenceChecklist,
	crossReferenceKindLabels,
	crossReferenceKinds,
	textFormLabels,
	textForms,
} from "@berean-study/db/connection-body";
import {
	type ThemePassageRole,
	themePassageRoleLabels,
	themePassageRoles,
} from "@berean-study/db/interpretation-body";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Textarea } from "@berean-study/ui/components/textarea";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
	addPassageToTheme,
	previewPassage,
	resolveConnection,
} from "@/functions/study-content";
import {
	connectionRecordQueryOptions,
	passageConnectionsQueryOptions,
	themesQueryOptions,
} from "@/queries/study-content";

import { BeforeReviewCard } from "../commentary/commentary-side-panels";
import {
	RevisionStatusChip,
	useContentMutation,
} from "../content/content-display";
import { DraftControls, RecordBanner } from "../evidence/draft-controls";
import {
	EvidenceField,
	evidenceInputClassName,
	OptionPills,
} from "../evidence/evidence-display";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import {
	canEditRecord,
	KjvText,
	SegmentedLinks,
	useStudyDraft,
} from "./study-shared";

export const connectionTabs = [
	"cross_reference",
	"canonical_relationship",
	"theme_passage",
] as const;
export type ConnectionTab = (typeof connectionTabs)[number];

const tabLabels: Record<ConnectionTab, string> = {
	canonical_relationship: "Canonical relationship",
	cross_reference: "Cross-reference",
	theme_passage: "Theme passage",
};

const pillOptions = <TValue extends string>(
	values: readonly TValue[],
	labels: Record<TValue, string>,
) => values.map((value) => ({ label: labels[value], value }));

/** Ask which passage to work on, when the page wasn't opened from one. */
export function ConnectionsStartPage({
	initialPassage,
	notFound,
}: {
	initialPassage: string;
	notFound?: boolean;
}) {
	const navigate = useNavigate({ from: "/work/connections" });
	const [text, setText] = useState(initialPassage);
	return (
		<StaffPage
			description="Cross-references, canonical relationships and theme passages are all opened from a verse."
			section="Connections"
			title="Which passage?"
		>
			<StaffCard>
				<form
					className="flex flex-wrap items-end gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						if (text.trim()) navigate({ search: { passage: text.trim() } });
					}}
				>
					<div className="min-w-56 flex-1">
						<EvidenceField
							hint={
								notFound
									? `We can't read "${initialPassage}". Write it like Romans 8:28.`
									: "Write it like Romans 8:28."
							}
							label="Passage"
						>
							{(id) => (
								<Input
									aria-invalid={notFound}
									className={evidenceInputClassName}
									id={id}
									maxLength={100}
									onChange={(event) => setText(event.target.value)}
									value={text}
								/>
							)}
						</EvidenceField>
					</div>
					<StaffButton disabled={!text.trim()} type="submit">
						Open connections
					</StaffButton>
				</form>
			</StaffCard>
		</StaffPage>
	);
}

type Connections = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof passageConnectionsQueryOptions>["queryFn"]>
		>
	>
>;

export function ConnectionsPage({
	editing,
	existed,
	passage,
	permissionKeys,
	tab,
}: {
	editing?: string;
	existed?: boolean;
	passage: string;
	permissionKeys: readonly PermissionKey[];
	tab: ConnectionTab;
}) {
	const { data } = useSuspenseQuery(passageConnectionsQueryOptions(passage));
	if (!data) {
		return <ConnectionsStartPage initialPassage={passage} notFound />;
	}

	return (
		<StaffPage
			description="Everything here goes through review before readers see it."
			section={`${data.bookName} · Connections`}
			title={`Connections: ${data.label}`}
		>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
				<div className="min-w-0 space-y-4">
					<StaffCard>
						<KjvText label={data.label} text={data.text} />
						{permissionKeys.includes("content.original_language") ? (
							<Link
								className="mt-3 inline-block text-muted-foreground text-sm underline-offset-4 hover:underline"
								search={{ passage: data.key }}
								to="/work/language"
							>
								Language & text on this passage
							</Link>
						) : null}
					</StaffCard>
					<ConnectionGroup
						data={data}
						kind="cross_reference"
						title="Cross-references"
					/>
					<ConnectionGroup
						data={data}
						kind="canonical_relationship"
						title="Canonical relationships"
					/>
					<ConnectionGroup data={data} kind="theme" title="Theme passages" />
				</div>
				<div className="min-w-0">
					<SegmentedLinks
						label="Kind of connection"
						options={pillOptions(connectionTabs, tabLabels)}
						renderOption={(option, className, isCurrent) => (
							<Link
								aria-current={isCurrent ? "page" : undefined}
								className={className}
								key={option.value}
								search={{ passage: data.key, tab: option.value }}
								to="/work/connections"
							>
								{option.label}
							</Link>
						)}
						value={tab}
					/>
					{tab === "theme_passage" ? (
						<ThemePassageForm passage={data.label} />
					) : editing ? (
						<ConnectionEditor
							existed={existed}
							key={`${tab}:${editing}`}
							kind={tab}
							passageKey={data.key}
							permissionKeys={permissionKeys}
							scopeKey={editing}
						/>
					) : (
						<ChooseOtherPassage data={data} key={tab} kind={tab} />
					)}
				</div>
			</div>
		</StaffPage>
	);
}

function ConnectionGroup({
	data,
	kind,
	title,
}: {
	data: Connections;
	kind: Connections["items"][number]["kind"];
	title: string;
}) {
	const rows = data.items.filter((item) => item.kind === kind);
	return (
		<StaffCard
			actions={
				<span className="text-muted-foreground text-sm">{rows.length}</span>
			}
			title={title}
		>
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">None yet.</p>
			) : (
				<ul className="divide-y divide-border-subtle">
					{rows.map((row) => (
						<li
							className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
							key={row.contentItemId}
						>
							<span className="min-w-0">
								<span className="block font-medium text-sm">{row.target}</span>
								<span className="block text-muted-foreground text-xs">
									{row.meta}
								</span>
							</span>
							<span className="flex flex-wrap items-center gap-2">
								<RevisionStatusChip status={row.status} />
								{row.kind === "theme" ? (
									<Link
										className={staffLinkClassName}
										search={{ theme: Number(row.scopeKey) }}
										to="/work/themes"
									>
										Edit
									</Link>
								) : (
									<Link
										className={staffLinkClassName}
										search={{
											edit: row.scopeKey,
											passage: data.key,
											tab: row.kind,
										}}
										to="/work/connections"
									>
										Edit
									</Link>
								)}
							</span>
						</li>
					))}
				</ul>
			)}
		</StaffCard>
	);
}

/** The other end comes first, because the two passages are what a connection is. */
function ChooseOtherPassage({
	data,
	kind,
}: {
	data: Connections;
	kind: Exclude<ConnectionTab, "theme_passage">;
}) {
	const navigate = useNavigate({ from: "/work/connections" });
	const [text, setText] = useState("");
	const preview = useMutation({
		mutationFn: () => previewPassage({ data: { text } }),
	});
	const open = useMutation({
		mutationFn: () =>
			resolveConnection({
				data: { first: data.label, kind, second: text },
			}),
		onSuccess: ({ existed, scopeKey }) =>
			navigate({
				search: {
					edit: scopeKey,
					existed: existed || undefined,
					passage: data.key,
					tab: kind,
				},
			}),
	});
	const error = preview.error ?? open.error;
	const isCanonical = kind === "canonical_relationship";

	return (
		<StaffCard title="Add a connection">
			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					open.mutate();
				}}
			>
				<EvidenceField
					label={
						isCanonical
							? data.testament === "new"
								? "New Testament"
								: "Old Testament"
							: "From"
					}
				>
					{(id) => (
						<Input
							className={evidenceInputClassName}
							disabled
							id={id}
							value={data.label}
						/>
					)}
				</EvidenceField>
				<EvidenceField
					hint="Write it like Genesis 50:20. Include the verse."
					label={
						isCanonical
							? data.testament === "new"
								? "Old Testament"
								: "New Testament"
							: "To"
					}
				>
					{(id) => (
						<Input
							className={evidenceInputClassName}
							id={id}
							maxLength={100}
							onBlur={() => {
								if (text.trim()) preview.mutate();
							}}
							onChange={(event) => {
								preview.reset();
								open.reset();
								setText(event.target.value);
							}}
							required
							value={text}
						/>
					)}
				</EvidenceField>
				{preview.data ? (
					<KjvText label={preview.data.label} text={preview.data.text} />
				) : null}
				{error ? (
					<p className="text-sm text-status-danger-foreground" role="alert">
						{error.message}
					</p>
				) : null}
				<StaffButton disabled={!text.trim() || open.isPending} type="submit">
					Continue
				</StaffButton>
			</form>
		</StaffCard>
	);
}

function ConnectionEditor({
	existed,
	kind,
	passageKey,
	permissionKeys,
	scopeKey,
}: {
	existed?: boolean;
	kind: Exclude<ConnectionTab, "theme_passage">;
	passageKey: string;
	permissionKeys: readonly PermissionKey[];
	scopeKey: string;
}) {
	const { data } = useSuspenseQuery(
		connectionRecordQueryOptions({ kind, scopeKey }),
	);
	const [restart, setRestart] = useState(0);
	if (!data) {
		return (
			<StaffCard>
				<p className="text-sm">This connection can't be read.</p>
			</StaffCard>
		);
	}
	const common = {
		existed,
		onRestart: () => setRestart((value) => value + 1),
		passageKey,
		permissionKeys,
		scopeKey,
	};
	return kind === "cross_reference" ? (
		<CrossReferenceForm {...common} data={data} key={restart} />
	) : (
		<CanonicalRelationshipForm {...common} data={data} key={restart} />
	);
}

type ConnectionRecord = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof connectionRecordQueryOptions>["queryFn"]>
		>
	>
>;

type FormProps = {
	data: ConnectionRecord;
	existed?: boolean;
	onRestart: () => void;
	passageKey: string;
	permissionKeys: readonly PermissionKey[];
	scopeKey: string;
};

function useLeaveAfterDiscard(passageKey: string, kind: ConnectionTab) {
	const navigate = useNavigate({ from: "/work/connections" });
	return () => navigate({ search: { passage: passageKey, tab: kind } });
}

function CrossReferenceForm({
	data,
	existed,
	onRestart,
	passageKey,
	permissionKeys,
	scopeKey,
}: FormProps) {
	const draft = useStudyDraft({
		kind: "cross_reference",
		schema: crossReferenceBodySchema,
		scopeKey,
		start: crossReferenceBodySchema.parse(data.body),
	});
	const leave = useLeaveAfterDiscard(passageKey, "cross_reference");
	const canEdit = canEditRecord(permissionKeys, data.state);
	const checklist = crossReferenceChecklist(draft.cleaned);
	const twoWayId = useId();

	return (
		<div className="space-y-4">
			<ExistedNotice existed={existed} />
			<RecordBanner state={data.state} />
			<StaffCard title={`${data.first.label} → ${data.second.label}`}>
				<fieldset className="space-y-5" disabled={!canEdit}>
					<div className="grid gap-4 sm:grid-cols-2">
						<KjvText label={data.first.label} text={data.first.text} />
						<KjvText label={data.second.label} text={data.second.text} />
					</div>
					<OptionPills
						label="Kind of link"
						onChange={(kind) =>
							draft.setBody((previous) => ({ ...previous, kind }))
						}
						options={pillOptions(crossReferenceKinds, crossReferenceKindLabels)}
						value={draft.body.kind}
					/>
					<div className="flex min-h-11 items-center gap-3">
						<input
							checked={draft.body.twoWay}
							className="size-4 accent-primary"
							id={twoWayId}
							onChange={(event) => {
								const twoWay = event.target.checked;
								draft.setBody((previous) => ({ ...previous, twoWay }));
							}}
							type="checkbox"
						/>
						<Label htmlFor={twoWayId}>
							Show on {data.second.label} too (two-way)
						</Label>
					</div>
					<EvidenceField label="Note for readers">
						{(id) => (
							<Textarea
								className="min-h-28 rounded-[0.625rem]"
								id={id}
								maxLength={2000}
								onChange={(event) => {
									const note = event.target.value;
									draft.setBody((previous) => ({ ...previous, note }));
								}}
								value={draft.body.note}
							/>
						)}
					</EvidenceField>
				</fieldset>
			</StaffCard>
			<DraftControls
				canSave={canEdit}
				isDirty={draft.isDirty}
				onDiscarded={(removed) => (removed ? leave() : onRestart())}
				onSaved={draft.onSaved}
				permissionKeys={permissionKeys}
				problems={blockingProblems(checklist)}
				save={draft.save}
				state={data.state}
			/>
			<BeforeReviewCard items={checklist} />
		</div>
	);
}

function CanonicalRelationshipForm({
	data,
	existed,
	onRestart,
	passageKey,
	permissionKeys,
	scopeKey,
}: FormProps) {
	const draft = useStudyDraft({
		kind: "canonical_relationship",
		schema: canonicalRelationshipBodySchema,
		scopeKey,
		start: canonicalRelationshipBodySchema.parse(data.body),
	});
	const leave = useLeaveAfterDiscard(passageKey, "canonical_relationship");
	const canEdit = canEditRecord(permissionKeys, data.state);
	const checklist = canonicalRelationshipChecklist(draft.cleaned);

	return (
		<div className="space-y-4">
			<ExistedNotice existed={existed} />
			<RecordBanner state={data.state} />
			<StaffCard title={`${data.second.label} in ${data.first.label}`}>
				<fieldset className="space-y-5" disabled={!canEdit}>
					<div className="grid gap-4 rounded-xl border border-border-subtle p-4 sm:grid-cols-2">
						<KjvText label={data.second.label} text={data.second.text} />
						<KjvText label={data.first.label} text={data.first.text} />
					</div>
					<OptionPills
						label="Relationship"
						onChange={(relationship) =>
							draft.setBody((previous) => ({ ...previous, relationship }))
						}
						options={pillOptions(
							canonicalRelationshipTypes,
							canonicalRelationshipLabels,
						)}
						value={draft.body.relationship}
					/>
					<OptionPills
						label="Text form used"
						onChange={(textForm) =>
							draft.setBody((previous) => ({ ...previous, textForm }))
						}
						options={pillOptions(textForms, textFormLabels)}
						value={draft.body.textForm}
					/>
					<EvidenceField label="Note">
						{(id) => (
							<Textarea
								className="min-h-28 rounded-[0.625rem]"
								id={id}
								maxLength={2000}
								onChange={(event) => {
									const note = event.target.value;
									draft.setBody((previous) => ({ ...previous, note }));
								}}
								value={draft.body.note}
							/>
						)}
					</EvidenceField>
				</fieldset>
			</StaffCard>
			<DraftControls
				canSave={canEdit}
				isDirty={draft.isDirty}
				onDiscarded={(removed) => (removed ? leave() : onRestart())}
				onSaved={draft.onSaved}
				permissionKeys={permissionKeys}
				problems={blockingProblems(checklist)}
				save={draft.save}
				state={data.state}
			/>
			<BeforeReviewCard items={checklist} />
		</div>
	);
}

function ExistedNotice({ existed }: { existed?: boolean }) {
	if (!existed) return null;
	return (
		<p
			className="rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground"
			role="status"
		>
			This link already exists, so it's opened here instead of starting a second
			one.
		</p>
	);
}

function blockingProblems(items: ReturnType<typeof crossReferenceChecklist>) {
	return items
		.filter(({ blocking, ok }) => blocking && !ok)
		.map(({ text }) => text);
}

/** A theme's passages are part of the theme, so this adds to that theme's draft. */
function ThemePassageForm({ passage }: { passage: string }) {
	const { data: themes } = useSuspenseQuery(themesQueryOptions());
	const [themeId, setThemeId] = useState<number | null>(null);
	const [text, setText] = useState(passage);
	const [role, setRole] = useState<ThemePassageRole>("supporting");
	const [why, setWhy] = useState("");
	const [addedTo, setAddedTo] = useState<number | null>(null);
	const add = useContentMutation(
		() => {
			if (themeId === null) throw new Error("Choose a theme.");
			return addPassageToTheme({
				data: {
					key: crypto.randomUUID(),
					passage: text,
					role,
					themeId,
					why,
				},
			});
		},
		() => {
			setAddedTo(themeId);
			setWhy("");
			toast.success(
				"Added to the theme's draft. Send the theme for review next.",
			);
		},
	);

	return (
		<StaffCard title="Add a connection">
			<div className="space-y-5">
				<EvidenceField
					hint={
						<>
							Not listed?{" "}
							<Link
								className="underline underline-offset-4"
								search={{ new: true }}
								to="/work/themes"
							>
								Start a new theme
							</Link>
						</>
					}
					label="Theme"
				>
					{(id) => (
						<NativeSelect
							className="h-11 w-full rounded-[0.625rem]"
							id={id}
							onChange={(event) =>
								setThemeId(Number(event.target.value) || null)
							}
							value={themeId ?? ""}
						>
							<NativeSelectOption value="">Choose a theme…</NativeSelectOption>
							{themes.map(({ scopeKey, title }) => (
								<NativeSelectOption key={scopeKey} value={scopeKey}>
									{title}
								</NativeSelectOption>
							))}
						</NativeSelect>
					)}
				</EvidenceField>
				<EvidenceField label="Passage">
					{(id) => (
						<Input
							className={evidenceInputClassName}
							id={id}
							maxLength={100}
							onChange={(event) => setText(event.target.value)}
							value={text}
						/>
					)}
				</EvidenceField>
				<OptionPills
					label="Role in this theme"
					onChange={setRole}
					options={pillOptions(themePassageRoles, themePassageRoleLabels)}
					value={role}
				/>
				<EvidenceField label="Why it belongs here">
					{(id) => (
						<Textarea
							className="min-h-24 rounded-[0.625rem]"
							id={id}
							maxLength={500}
							onChange={(event) => setWhy(event.target.value)}
							value={why}
						/>
					)}
				</EvidenceField>
				<div className="flex flex-wrap items-center gap-2">
					<StaffButton
						disabled={themeId === null || !text.trim() || add.isPending}
						onClick={() => add.mutate(undefined)}
					>
						Add to the theme's draft
					</StaffButton>
					{addedTo ? (
						<Link
							className={staffLinkClassName}
							search={{ theme: addedTo }}
							to="/work/themes"
						>
							Open the theme to submit it
						</Link>
					) : null}
				</div>
				<p className="text-muted-foreground text-xs">
					Passages are reviewed with their theme, so the reviewer sees the theme
					as a whole.
				</p>
			</div>
		</StaffCard>
	);
}
