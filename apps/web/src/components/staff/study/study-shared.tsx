import type { PermissionKey } from "@berean-study/db/access-catalogue";
import type { ContentRevisionStatus } from "@berean-study/db/content-kinds";
import {
	type CommentaryTools,
	RichTextEditor,
} from "@berean-study/rich-text-editor";
import type { RichTextDocument } from "@berean-study/rich-text-editor/document";
import { getDocumentCommentaryNodes } from "@berean-study/rich-text-editor/document";
import { Input } from "@berean-study/ui/components/input";
import { cn } from "@berean-study/ui/lib/utils";
import {
	type CSSProperties,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import type { z } from "zod";

import { saveStudyDraft } from "@/functions/study-content";

import type { useCommentaryInsertTools } from "../commentary/commentary-insert-tools";
import {
	EvidenceField,
	evidenceInputClassName,
	RecordStatusChips,
	useUnsavedWarning,
} from "../evidence/evidence-display";
import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";

type StudyKind = Parameters<typeof saveStudyDraft>[0]["data"]["kind"];

/**
 * A form's wording, and saving it as a draft. A new record has no address until its
 * first save, so `onCreated` hears what it was given.
 */
export function useStudyDraft<TBody>({
	kind,
	onCreated,
	schema,
	scopeKey,
	start,
}: {
	kind: StudyKind;
	onCreated?: (scopeKey: string) => void;
	schema: z.ZodType<TBody>;
	scopeKey: string | null;
	start: TBody;
}) {
	const [body, setBody] = useState(start);
	const cleaned = useMemo(() => {
		const parsed = schema.safeParse(body);
		return parsed.success ? parsed.data : body;
	}, [body, schema]);

	const [startingText] = useState(() => {
		const parsed = schema.safeParse(start);
		return JSON.stringify(parsed.success ? parsed.data : start);
	});
	const [savedText, setSavedText] = useState(startingText);
	const isDirty = JSON.stringify(cleaned) !== savedText;
	useUnsavedWarning(isDirty);

	const currentScope = useRef(scopeKey);
	const save = useCallback(async () => {
		const saved = await saveStudyDraft({
			data: { body: cleaned, kind, scopeKey: currentScope.current },
		});
		currentScope.current = saved.scopeKey;
		setSavedText(JSON.stringify(cleaned));
		return { id: saved.contentItemId, revisionId: saved.revisionId };
	}, [cleaned, kind]);

	const onSaved = useCallback(() => {
		if (currentScope.current && currentScope.current !== scopeKey) {
			onCreated?.(currentScope.current);
		}
	}, [onCreated, scopeKey]);

	return { body, cleaned, isDirty, onSaved, save, setBody };
}

/** Whether this person can change a record that's in this state. */
export function canEditRecord(
	permissionKeys: readonly PermissionKey[],
	state: { canEdit: boolean; live: unknown } | null,
	permissions: { create: PermissionKey; revise: PermissionKey } = {
		create: "content.write",
		revise: "content.revise",
	},
) {
	const allowed = state?.live
		? permissionKeys.includes(permissions.revise)
		: permissionKeys.includes(permissions.create);
	return allowed && (state?.canEdit ?? true);
}

export const originalLanguageWriters = {
	create: "content.original_language",
	revise: "content.original_language",
} as const satisfies { create: PermissionKey; revise: PermissionKey };

/** How many citations come before each document, so numbering runs straight through. */
export function citationsBefore(
	documents: readonly RichTextDocument[],
	index: number,
) {
	return documents
		.slice(0, index)
		.reduce(
			(total, document) =>
				total + getDocumentCommentaryNodes(document).citations.length,
			0,
		);
}

/** A shorter version of the commentary writing surface, with the same insert tools. */
export function StudyRichText({
	ariaLabel,
	citationOffset = 0,
	editable,
	onChange,
	placeholder,
	tools,
	value,
}: {
	ariaLabel: string;
	citationOffset?: number;
	editable: boolean;
	onChange: (document: RichTextDocument) => void;
	placeholder?: string;
	tools: ReturnType<typeof useCommentaryInsertTools>;
	value: RichTextDocument;
}) {
	const commentaryTools: CommentaryTools | undefined = editable
		? tools.commentaryTools
		: undefined;
	return (
		<div style={{ "--citation-offset": citationOffset } as CSSProperties}>
			<RichTextEditor
				ariaLabel={ariaLabel}
				className="shadow-none"
				commentaryTools={commentaryTools}
				contentClassName="[&_.ProseMirror]:min-h-32"
				editable={editable}
				onChange={onChange}
				onRequestCitation={editable ? tools.requestCitation : undefined}
				placeholder={placeholder}
				preset="contributor"
				toolbar="simple"
				value={value}
			/>
		</div>
	);
}

export type StudyRecordRow = {
	kindLabel?: string;
	latestNumber: number | null;
	latestStatus: ContentRevisionStatus | null;
	liveNumber: number | null;
	scopeKey: string;
	title: string;
};

/** Records that already exist, to open and revise. Search runs when submitted. */
export function StudyRecordList({
	emptyMessage,
	onSearch,
	renderLink,
	rows,
	search,
	title,
}: {
	emptyMessage: string;
	onSearch: (search: string | undefined) => void;
	renderLink: (row: StudyRecordRow, className: string) => ReactNode;
	rows: readonly StudyRecordRow[];
	search?: string;
	title: string;
}) {
	const [text, setText] = useState(search ?? "");
	return (
		<StaffCard title={title}>
			<form
				className="mb-4 flex flex-wrap items-end gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					onSearch(text.trim() || undefined);
				}}
			>
				<div className="min-w-48 flex-1">
					<EvidenceField label="Search">
						{(id) => (
							<Input
								className={evidenceInputClassName}
								id={id}
								maxLength={200}
								onChange={(event) => setText(event.target.value)}
								type="search"
								value={text}
							/>
						)}
					</EvidenceField>
				</div>
				<StaffButton type="submit" variant="outline">
					Search
				</StaffButton>
			</form>
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">{emptyMessage}</p>
			) : (
				<ul className="divide-y divide-border-subtle">
					{rows.map((row) => (
						<li
							className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
							key={row.scopeKey}
						>
							<span className="min-w-0">
								{renderLink(
									row,
									"font-medium text-sm underline-offset-4 hover:underline",
								)}
								{row.kindLabel ? (
									<span className="block text-muted-foreground text-xs">
										{row.kindLabel}
									</span>
								) : null}
							</span>
							<span className="flex flex-wrap gap-1.5">
								<RecordStatusChips
									latestNumber={row.latestNumber}
									latestStatus={row.latestStatus}
									liveNumber={row.liveNumber}
								/>
							</span>
						</li>
					))}
				</ul>
			)}
		</StaffCard>
	);
}

/** Choose between a few linked views of one page, shown as tabs. */
export function SegmentedLinks<TValue extends string>({
	label,
	options,
	renderOption,
	value,
}: {
	label: string;
	options: readonly { label: string; value: TValue }[];
	renderOption: (
		option: { label: string; value: TValue },
		className: string,
		isCurrent: boolean,
	) => ReactNode;
	value: TValue;
}) {
	return (
		<nav
			aria-label={label}
			className="mb-5 flex gap-1 overflow-x-auto border-border border-b"
		>
			{options.map((option) =>
				renderOption(
					option,
					cn(
						"-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
						option.value === value
							? "border-primary text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground",
					),
					option.value === value,
				),
			)}
		</nav>
	);
}

/** The words of a passage in the KJV, or why they aren't here. */
export function KjvText({
	label,
	text,
}: {
	label: string;
	text: string | null;
}) {
	return (
		<div>
			<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
				{label} · KJV
			</p>
			{text ? (
				<p className="mt-1.5 font-serif text-[1.0625rem] leading-relaxed">
					{text}
				</p>
			) : (
				<p className="mt-1.5 text-muted-foreground text-sm">
					The KJV text of this passage hasn't been published yet.
				</p>
			)}
		</div>
	);
}

/** A notice that a change will need two Superadmins before it goes live. */
export function FoundationalChangeNotice({
	change,
}: {
	change: string | null;
}) {
	if (!change) return null;
	return (
		<div
			className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground"
			role="status"
		>
			<p className="font-semibold">This will need two Superadmins</p>
			<p className="mt-1">
				{change} After review, one Superadmin sends it for confirmation and a
				different one publishes it by confirming.
			</p>
		</div>
	);
}
