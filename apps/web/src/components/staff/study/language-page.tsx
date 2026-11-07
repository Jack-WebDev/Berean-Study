import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	type NoteLanguage,
	newVariantReading,
	noteLanguageLabels,
	noteLanguages,
	type OriginalLanguageNoteBody,
	originalLanguageNoteBodySchema,
	originalLanguageNoteChecklist,
	type TextualNoteBody,
	type TextualVariantBody,
	textualNoteBodySchema,
	textualNoteChecklist,
	textualVariantBodySchema,
	textualVariantChecklist,
	type VariantReading,
	variantConfidenceLabels,
	variantConfidences,
	variantKindLabels,
	variantKinds,
} from "@berean-study/db/language-body";
import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Textarea } from "@berean-study/ui/components/textarea";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";

import {
	passageLanguageQueryOptions,
	studyRecordQueryOptions,
} from "@/queries/study-content";

import { useCommentaryInsertTools } from "../commentary/commentary-insert-tools";
import { BeforeReviewCard } from "../commentary/commentary-side-panels";
import { RevisionStatusChip } from "../content/content-display";
import { DraftControls, RecordBanner } from "../evidence/draft-controls";
import {
	EvidenceField,
	evidenceInputClassName,
	OptionPills,
} from "../evidence/evidence-display";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import { StudyPreview } from "./study-previews";
import {
	canEditRecord,
	KjvText,
	originalLanguageWriters,
	SegmentedLinks,
	StudyRichText,
	useStudyDraft,
} from "./study-shared";

export const languageTabs = [
	"original_language_note",
	"textual_note",
	"textual_variant",
] as const;
export type LanguageTab = (typeof languageTabs)[number];

const tabLabels: Record<LanguageTab, string> = {
	original_language_note: "Original-language note",
	textual_note: "Textual note",
	textual_variant: "Textual variant",
};
const tabOptions = languageTabs.map((value) => ({
	label: tabLabels[value],
	value,
}));

const pillOptions = <TValue extends string>(
	values: readonly TValue[],
	labels: Record<TValue, string>,
) => values.map((value) => ({ label: labels[value], value }));

/** Ask which passage to work on, when the page wasn't opened from one. */
export function LanguageStartPage({
	initialPassage,
	notFound,
	tab,
}: {
	initialPassage: string;
	notFound?: boolean;
	tab?: LanguageTab;
}) {
	const navigate = useNavigate({ from: "/work/language" });
	const [text, setText] = useState(initialPassage);
	return (
		<StaffPage
			description="Original-language notes, textual notes and textual variants are all opened from a passage."
			section="Language & text"
			title="Which passage?"
		>
			<StaffCard>
				<form
					className="flex flex-wrap items-end gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						if (text.trim()) {
							navigate({ search: { passage: text.trim(), tab } });
						}
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
						Open language & text
					</StaffButton>
				</form>
			</StaffCard>
		</StaffPage>
	);
}

export function LanguagePage({
	id,
	passage,
	permissionKeys,
	tab,
}: {
	id?: string;
	passage: string;
	permissionKeys: readonly PermissionKey[];
	tab: LanguageTab;
}) {
	const { data } = useSuspenseQuery(passageLanguageQueryOptions(passage));
	if (!data) return <LanguageStartPage initialPassage={passage} notFound />;

	const countOf = (kind: LanguageTab) =>
		data.items.filter((item) => item.kind === kind).length;
	const onThisTab = data.items.filter((item) => item.kind === tab);

	return (
		<StaffPage
			section={`${data.bookName} · Language & text`}
			title={`Language & text: ${data.label}`}
		>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
				<div className="min-w-0 space-y-4">
					<StaffCard>
						<KjvText label={data.label} text={data.text} />
						<p className="mt-3 text-muted-foreground text-xs">
							Words are typed for now. Choosing them from the Greek or Hebrew
							text comes later, once the original-language text is decided.
						</p>
					</StaffCard>
					<SegmentedLinks
						label="Kind of language content"
						options={tabOptions}
						renderOption={(option, className, isCurrent) => (
							<Link
								aria-current={isCurrent ? "page" : undefined}
								className={className}
								key={option.value}
								search={{ passage: data.key, tab: option.value }}
								to="/work/language"
							>
								{option.label}
							</Link>
						)}
						value={tab}
					/>
					<LanguageRecord
						id={id ?? null}
						key={`${tab}:${id ?? "new"}`}
						passageKey={data.key}
						passageLabel={data.label}
						permissionKeys={permissionKeys}
						tab={tab}
						variants={data.items.filter(
							(item) => item.kind === "textual_variant",
						)}
					/>
				</div>
				<aside className="space-y-4">
					<StaffCard title="On this passage">
						<dl className="space-y-2 text-sm">
							{languageTabs.map((kind) => (
								<div className="flex justify-between gap-2" key={kind}>
									<dt>{tabLabels[kind]}</dt>
									<dd className="font-semibold">{countOf(kind)}</dd>
								</div>
							))}
						</dl>
					</StaffCard>
					<StaffCard title={`${tabLabels[tab]}s here`}>
						{onThisTab.length === 0 ? (
							<p className="text-muted-foreground text-sm">None yet.</p>
						) : (
							<ul className="space-y-2">
								{onThisTab.map((item) => (
									<li
										className="flex flex-wrap items-center justify-between gap-2"
										key={item.scopeKey}
									>
										<Link
											aria-current={item.scopeKey === id ? "true" : undefined}
											className="min-w-0 font-medium text-sm underline-offset-4 hover:underline"
											search={{
												id: item.scopeKey,
												passage: data.key,
												tab,
											}}
											to="/work/language"
										>
											{item.title}
										</Link>
										<RevisionStatusChip status={item.status} />
									</li>
								))}
							</ul>
						)}
						{id ? (
							<Link
								className={`${staffLinkClassName} mt-3`}
								search={{ passage: data.key, tab }}
								to="/work/language"
							>
								+ New {tabLabels[tab].toLowerCase()}
							</Link>
						) : null}
					</StaffCard>
					<StaffCard title="Greek review required">
						<p className="text-muted-foreground text-sm">
							Anything in this editor gets an extra check by someone with the
							Greek Reviewer role before an Admin can publish it.
						</p>
					</StaffCard>
				</aside>
			</div>
		</StaffPage>
	);
}

type RecordProps = {
	id: string | null;
	onRestart: () => void;
	passageKey: string;
	passageLabel: string;
	permissionKeys: readonly PermissionKey[];
	record: RecordState | null;
};

type RecordState = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof studyRecordQueryOptions>["queryFn"]>
		>
	>
>["state"];

function LanguageRecord({
	id,
	passageKey,
	passageLabel,
	permissionKeys,
	tab,
	variants,
}: {
	id: string | null;
	passageKey: string;
	passageLabel: string;
	permissionKeys: readonly PermissionKey[];
	tab: LanguageTab;
	variants: readonly { scopeKey: string; title: string }[];
}) {
	const { data, isPending } = useQuery({
		...studyRecordQueryOptions({ kind: tab, scopeKey: id ?? "" }),
		enabled: id !== null,
	});
	const [restart, setRestart] = useState(0);
	if (id !== null && isPending) return null;
	if (id !== null && !data) {
		return (
			<StaffCard>
				<p className="text-sm">This record can't be read.</p>
			</StaffCard>
		);
	}
	const props: RecordProps = {
		id,
		onRestart: () => setRestart((value) => value + 1),
		passageKey,
		passageLabel,
		permissionKeys,
		record: data?.state ?? null,
	};
	if (tab === "original_language_note") {
		return (
			<OriginalLanguageNoteForm
				{...props}
				key={restart}
				start={originalLanguageNoteBodySchema.parse(
					data?.body ?? {
						gloss: "",
						language: "greek",
						lemma: "",
						lexiconKey: "",
						note: { content: [{ type: "paragraph" }], type: "doc" },
						parsing: "",
						passage: passageLabel,
						word: "",
					},
				)}
			/>
		);
	}
	if (tab === "textual_note") {
		return (
			<TextualNoteForm
				{...props}
				key={restart}
				start={textualNoteBodySchema.parse(
					data?.body ?? {
						heading: "",
						note: { content: [{ type: "paragraph" }], type: "doc" },
						passage: passageLabel,
						relatedVariant: null,
					},
				)}
				variants={variants}
			/>
		);
	}
	return (
		<TextualVariantForm
			{...props}
			key={restart}
			start={textualVariantBodySchema.parse(
				data?.body ?? {
					confidence: null,
					kind: null,
					location: "",
					passage: passageLabel,
					readings: [
						newVariantReading(crypto.randomUUID()),
						newVariantReading(crypto.randomUUID()),
					],
					reason: { content: [{ type: "paragraph" }], type: "doc" },
				},
			)}
		/>
	);
}

/** Saving, reviewing and previewing are the same whichever language record this is. */
function useLanguageRecord<TBody>({
	id,
	kind,
	onRestart,
	passageKey,
	permissionKeys,
	record,
	schema,
	start,
}: RecordProps & {
	kind: LanguageTab;
	schema: Parameters<typeof useStudyDraft<TBody>>[0]["schema"];
	start: TBody;
}) {
	const navigate = useNavigate({ from: "/work/language" });
	const draft = useStudyDraft({
		kind,
		onCreated: (scopeKey) =>
			navigate({ search: { id: scopeKey, passage: passageKey, tab: kind } }),
		schema,
		scopeKey: id,
		start,
	});
	const canEdit = canEditRecord(
		permissionKeys,
		record,
		originalLanguageWriters,
	);
	const controls = (problems: readonly string[]) => (
		<DraftControls
			canSave={canEdit}
			isDirty={draft.isDirty}
			onDiscarded={(removed) =>
				removed
					? navigate({ search: { passage: passageKey, tab: kind } })
					: onRestart()
			}
			onSaved={draft.onSaved}
			permissionKeys={permissionKeys}
			problems={problems}
			save={draft.save}
			state={record}
		/>
	);
	return { canEdit, controls, draft };
}

function blocking(items: ReturnType<typeof textualNoteChecklist>) {
	return items
		.filter(({ blocking: blocks, ok }) => blocks && !ok)
		.map(({ text }) => text);
}

function PassageField({
	onChange,
	value,
}: {
	onChange: (passage: string) => void;
	value: string;
}) {
	return (
		<EvidenceField label="Passage">
			{(id) => (
				<Input
					className={evidenceInputClassName}
					id={id}
					maxLength={100}
					onChange={(event) => onChange(event.target.value)}
					value={value}
				/>
			)}
		</EvidenceField>
	);
}

function OriginalLanguageNoteForm({
	start,
	...props
}: RecordProps & { start: OriginalLanguageNoteBody }) {
	const { canEdit, controls, draft } = useLanguageRecord({
		...props,
		kind: "original_language_note",
		schema: originalLanguageNoteBodySchema,
		start,
	});
	const { body, cleaned, setBody } = draft;
	const tools = useCommentaryInsertTools();
	const [preview, setPreview] = useState(false);
	const checklist = originalLanguageNoteChecklist(cleaned);
	const textField = (
		label: string,
		field: "gloss" | "lemma" | "lexiconKey" | "parsing" | "word",
		maxLength: number,
	) => (
		<EvidenceField label={label}>
			{(id) => (
				<Input
					className={evidenceInputClassName}
					dir={
						(field === "word" || field === "lemma") &&
						body.language === "hebrew"
							? "rtl"
							: undefined
					}
					id={id}
					lang={
						field === "word" || field === "lemma"
							? body.language === "hebrew"
								? "he"
								: "grc"
							: undefined
					}
					maxLength={maxLength}
					onChange={(event) => {
						const { value } = event.target;
						setBody((previous) => ({ ...previous, [field]: value }));
					}}
					value={body[field]}
				/>
			)}
		</EvidenceField>
	);

	return (
		<div className="space-y-4">
			<RecordBanner state={props.record} />
			{preview ? (
				<StudyPreview
					input={{ body: cleaned, kind: "original_language_note" }}
					title={body.word}
				/>
			) : (
				<StaffCard title={tabLabels.original_language_note}>
					<fieldset className="space-y-5" disabled={!canEdit}>
						<PassageField
							onChange={(passage) =>
								setBody((previous) => ({ ...previous, passage }))
							}
							value={body.passage}
						/>
						<OptionPills<NoteLanguage>
							label="Language"
							onChange={(language) =>
								setBody((previous) => ({ ...previous, language }))
							}
							options={pillOptions(noteLanguages, noteLanguageLabels)}
							value={body.language}
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							{textField("Word", "word", 100)}
							{textField("Lemma", "lemma", 100)}
							{textField("Parsing", "parsing", 200)}
							{textField("Strong's / lexicon key", "lexiconKey", 50)}
						</div>
						{textField("Short gloss", "gloss", 200)}
					</fieldset>
					<div className="mt-5 space-y-2">
						<p className="font-semibold text-sm">Note</p>
						<StudyRichText
							ariaLabel="Note"
							editable={canEdit}
							onChange={(note) =>
								setBody((previous) => ({ ...previous, note }))
							}
							tools={tools}
							value={body.note}
						/>
					</div>
				</StaffCard>
			)}
			<div className="flex flex-wrap gap-2">
				<StaffButton
					aria-pressed={preview}
					onClick={() => setPreview((value) => !value)}
					variant="outline"
				>
					{preview ? "Back to editing" : "Preview as reader"}
				</StaffButton>
				{controls(blocking(checklist))}
			</div>
			<BeforeReviewCard items={checklist} />
			{tools.dialogs}
		</div>
	);
}

function TextualNoteForm({
	start,
	variants,
	...props
}: RecordProps & {
	start: TextualNoteBody;
	variants: readonly { scopeKey: string; title: string }[];
}) {
	const { canEdit, controls, draft } = useLanguageRecord({
		...props,
		kind: "textual_note",
		schema: textualNoteBodySchema,
		start,
	});
	const { body, cleaned, setBody } = draft;
	const tools = useCommentaryInsertTools();
	const [preview, setPreview] = useState(false);
	const checklist = textualNoteChecklist(cleaned);

	return (
		<div className="space-y-4">
			<RecordBanner state={props.record} />
			{preview ? (
				<StudyPreview
					input={{ body: cleaned, kind: "textual_note" }}
					title={body.heading}
				/>
			) : (
				<StaffCard title={tabLabels.textual_note}>
					<fieldset className="space-y-5" disabled={!canEdit}>
						<PassageField
							onChange={(passage) =>
								setBody((previous) => ({ ...previous, passage }))
							}
							value={body.passage}
						/>
						<EvidenceField label="Heading">
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={200}
									onChange={(event) => {
										const heading = event.target.value;
										setBody((previous) => ({ ...previous, heading }));
									}}
									value={body.heading}
								/>
							)}
						</EvidenceField>
					</fieldset>
					<div className="mt-5 space-y-2">
						<p className="font-semibold text-sm">
							Note for readers (plain language)
						</p>
						<StudyRichText
							ariaLabel="Note for readers"
							editable={canEdit}
							onChange={(note) =>
								setBody((previous) => ({ ...previous, note }))
							}
							tools={tools}
							value={body.note}
						/>
					</div>
					<fieldset className="mt-5" disabled={!canEdit}>
						<EvidenceField
							hint="Variants listed are the ones on this passage. It has to be live before this note can be published."
							label="Related variant"
						>
							{(id) => (
								<NativeSelect
									className="h-11 w-full rounded-[0.625rem]"
									id={id}
									onChange={(event) => {
										const picked = variants.find(
											({ scopeKey }) => scopeKey === event.target.value,
										);
										setBody((previous) => ({
											...previous,
											relatedVariant: picked
												? { label: picked.title, scopeKey: picked.scopeKey }
												: null,
										}));
									}}
									value={body.relatedVariant?.scopeKey ?? ""}
								>
									<NativeSelectOption value="">None</NativeSelectOption>
									{variants.map(({ scopeKey, title }) => (
										<NativeSelectOption key={scopeKey} value={scopeKey}>
											{title}
										</NativeSelectOption>
									))}
								</NativeSelect>
							)}
						</EvidenceField>
						{body.relatedVariant ? (
							<Link
								className={`${staffLinkClassName} mt-2`}
								search={{
									id: body.relatedVariant.scopeKey,
									passage: props.passageKey,
									tab: "textual_variant",
								}}
								to="/work/language"
							>
								Open variant
							</Link>
						) : null}
					</fieldset>
				</StaffCard>
			)}
			<div className="flex flex-wrap gap-2">
				<StaffButton
					aria-pressed={preview}
					onClick={() => setPreview((value) => !value)}
					variant="outline"
				>
					{preview ? "Back to editing" : "Preview as reader"}
				</StaffButton>
				{controls(blocking(checklist))}
			</div>
			<BeforeReviewCard items={checklist} />
			{tools.dialogs}
		</div>
	);
}

function TextualVariantForm({
	start,
	...props
}: RecordProps & { start: TextualVariantBody }) {
	const { canEdit, controls, draft } = useLanguageRecord({
		...props,
		kind: "textual_variant",
		schema: textualVariantBodySchema,
		start,
	});
	const { body, cleaned, setBody } = draft;
	const tools = useCommentaryInsertTools();
	const [preview, setPreview] = useState(false);
	const checklist = textualVariantChecklist(cleaned);

	const setReading = (key: string, change: Partial<VariantReading>) =>
		setBody((previous) => ({
			...previous,
			readings: previous.readings.map((reading) =>
				reading.key === key ? { ...reading, ...change } : reading,
			),
		}));

	return (
		<div className="space-y-4">
			<RecordBanner state={props.record} />
			{preview ? (
				<StudyPreview
					input={{ body: cleaned, kind: "textual_variant" }}
					title={body.location}
				/>
			) : (
				<StaffCard title={tabLabels.textual_variant}>
					<fieldset className="space-y-5" disabled={!canEdit}>
						<PassageField
							onChange={(passage) =>
								setBody((previous) => ({ ...previous, passage }))
							}
							value={body.passage}
						/>
						<EvidenceField
							hint="Which words the question is about."
							label="Location"
						>
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={200}
									onChange={(event) => {
										const location = event.target.value;
										setBody((previous) => ({ ...previous, location }));
									}}
									placeholder="Rom 8:28, with or without ὁ θεός"
									value={body.location}
								/>
							)}
						</EvidenceField>
						<OptionPills
							label="Kind"
							onChange={(kind) =>
								setBody((previous) => ({ ...previous, kind }))
							}
							options={pillOptions(variantKinds, variantKindLabels)}
							value={body.kind}
						/>
						<div className="space-y-3">
							<p className="font-semibold text-sm">Readings</p>
							<ul className="space-y-3">
								{body.readings.map((reading, index) => (
									<ReadingCard
										canRemove={body.readings.length > 1}
										index={index}
										key={reading.key}
										onChange={(change) => setReading(reading.key, change)}
										onPrefer={() =>
											setBody((previous) => ({
												...previous,
												readings: previous.readings.map((other) => ({
													...other,
													preferred:
														other.key === reading.key && !other.preferred,
												})),
											}))
										}
										onRemove={() =>
											setBody((previous) => ({
												...previous,
												readings: previous.readings.filter(
													({ key }) => key !== reading.key,
												),
											}))
										}
										reading={reading}
									/>
								))}
							</ul>
							<StaffButton
								onClick={() =>
									setBody((previous) => ({
										...previous,
										readings: [
											...previous.readings,
											newVariantReading(crypto.randomUUID()),
										],
									}))
								}
								variant="outline"
							>
								+ Add reading
							</StaffButton>
						</div>
					</fieldset>
					<div className="mt-5 space-y-2">
						<p className="font-semibold text-sm">
							Why this reading is preferred
						</p>
						<StudyRichText
							ariaLabel="Why this reading is preferred"
							editable={canEdit}
							onChange={(reason) =>
								setBody((previous) => ({ ...previous, reason }))
							}
							tools={tools}
							value={body.reason}
						/>
					</div>
					<fieldset className="mt-5" disabled={!canEdit}>
						<OptionPills
							label="Confidence"
							onChange={(confidence) =>
								setBody((previous) => ({ ...previous, confidence }))
							}
							options={pillOptions(variantConfidences, variantConfidenceLabels)}
							value={body.confidence}
						/>
					</fieldset>
				</StaffCard>
			)}
			<div className="flex flex-wrap gap-2">
				<StaffButton
					aria-pressed={preview}
					onClick={() => setPreview((value) => !value)}
					variant="outline"
				>
					{preview ? "Back to editing" : "Preview as reader"}
				</StaffButton>
				{controls(blocking(checklist))}
			</div>
			<BeforeReviewCard items={checklist} />
			{tools.dialogs}
		</div>
	);
}

function ReadingCard({
	canRemove,
	index,
	onChange,
	onPrefer,
	onRemove,
	reading,
}: {
	canRemove: boolean;
	index: number;
	onChange: (change: Partial<VariantReading>) => void;
	onPrefer: () => void;
	onRemove: () => void;
	reading: VariantReading;
}) {
	const [witness, setWitness] = useState("");
	const addWitness = () => {
		const text = witness.trim();
		if (!text) return;
		if (!reading.witnesses.includes(text)) {
			onChange({ witnesses: [...reading.witnesses, text] });
		}
		setWitness("");
	};
	const name = `Reading ${index + 1}`;

	return (
		<li className="space-y-3 rounded-xl border border-border-subtle p-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="font-semibold text-sm">{name}</p>
				<div className="flex items-center gap-1">
					<StaffButton
						aria-pressed={reading.preferred}
						onClick={onPrefer}
						variant={reading.preferred ? "default" : "outline"}
					>
						{reading.preferred ? "Preferred" : "Mark as preferred"}
					</StaffButton>
					<StaffButton
						aria-label={`Remove ${name}`}
						disabled={!canRemove}
						onClick={onRemove}
						size="icon"
						variant="ghost"
					>
						<Trash2Icon aria-hidden="true" />
					</StaffButton>
				</div>
			</div>
			<EvidenceField label="Greek text">
				{(id) => (
					<Textarea
						className="min-h-16 rounded-[0.625rem]"
						id={id}
						lang="grc"
						maxLength={500}
						onChange={(event) => onChange({ text: event.target.value })}
						value={reading.text}
					/>
				)}
			</EvidenceField>
			<EvidenceField label="English gloss">
				{(id) => (
					<Input
						className={evidenceInputClassName}
						id={id}
						maxLength={500}
						onChange={(event) => onChange({ gloss: event.target.value })}
						value={reading.gloss}
					/>
				)}
			</EvidenceField>
			<div className="space-y-2">
				<p className="font-semibold text-sm">Witnesses</p>
				{reading.witnesses.length > 0 ? (
					<ul className="flex flex-wrap gap-1.5">
						{reading.witnesses.map((text) => (
							<li
								className="inline-flex min-h-8 items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-sm"
								key={text}
							>
								{text}
								<button
									aria-label={`Remove ${text}`}
									className="inline-flex size-6 items-center justify-center rounded-full hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() =>
										onChange({
											witnesses: reading.witnesses.filter(
												(other) => other !== text,
											),
										})
									}
									type="button"
								>
									<XIcon aria-hidden="true" className="size-3.5" />
								</button>
							</li>
						))}
					</ul>
				) : null}
				<div className="flex flex-wrap gap-2">
					<Input
						aria-label={`Add a witness to ${name}`}
						className={`${evidenceInputClassName} min-w-32 flex-1`}
						maxLength={60}
						onChange={(event) => setWitness(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								addWitness();
							}
						}}
						placeholder="𝔓46"
						value={witness}
					/>
					<StaffButton onClick={addWitness} variant="outline">
						+ Witness
					</StaffButton>
				</div>
			</div>
		</li>
	);
}
