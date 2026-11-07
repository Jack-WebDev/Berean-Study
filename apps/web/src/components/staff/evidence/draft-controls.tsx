import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	type ContentRevisionStatus,
	contentRevisionStatusLabels,
} from "@berean-study/db/content-kinds";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { discardDraft, submitRevision } from "@/functions/content";

import { useContentMutation } from "../content/content-display";
import { AssignButton } from "../content/work-pages";
import { StaffButton, staffLinkClassName } from "../staff-button";

/** The part of a record's state these controls care about, whatever kind it is. */
export type RecordState = {
	canEdit: boolean;
	contentItemId: number | null;
	feedback: string | null;
	kindLabel: string;
	live: { number: number } | null;
	open: {
		authorName: string;
		byMe: boolean;
		number: number;
		revisionId: number;
		status: ContentRevisionStatus;
	} | null;
	title: string;
};

/** Where this record's review stands, and why it may be read-only just now. */
export function RecordBanner({ state }: { state: RecordState | null }) {
	if (!state) return null;
	const { contentItemId, feedback, live, open } = state;
	return (
		<div className="space-y-3">
			{open && contentItemId ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground">
					<p>
						Revision #{open.number} · {contentRevisionStatusLabels[open.status]}{" "}
						· {open.byMe ? "you" : open.authorName}
						{open.status !== "draft"
							? ". It can't change while it's being reviewed."
							: ""}
						{open.status === "draft" && !open.byMe
							? ". Only they can edit it."
							: ""}
					</p>
					<Link
						className={staffLinkClassName}
						params={{
							contentId: String(contentItemId),
							revisionId: String(open.revisionId),
						}}
						to="/admin/editorial/$contentId/revisions/$revisionId"
					>
						Open revision
					</Link>
				</div>
			) : null}
			{live && open ? (
				<p className="text-muted-foreground text-sm" role="status">
					Revision #{live.number} stays in use until this one is approved and
					published.
				</p>
			) : null}
			{feedback ? (
				<div
					className="rounded-[0.625rem] bg-status-danger p-3 text-sm text-status-danger-foreground"
					role="status"
				>
					<p className="font-semibold">A reviewer asked for changes</p>
					<p className="mt-1">{feedback}</p>
				</div>
			) : null}
		</div>
	);
}

/** What's still missing before this can go to a reviewer. */
export function ReviewProblems({ problems }: { problems: readonly string[] }) {
	if (problems.length === 0) return null;
	return (
		<div className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
			<p className="font-semibold">Before this can go for review</p>
			<ul className="mt-1 list-disc space-y-0.5 pl-4">
				{problems.map((problem) => (
					<li key={problem}>{problem}</li>
				))}
			</ul>
		</div>
	);
}

/** Save, send for review, throw away and assign: the same buttons on every record. */
export function DraftControls({
	canSave,
	isDirty,
	onDiscarded,
	onSaved,
	permissionKeys,
	problems,
	save,
	state,
}: {
	canSave: boolean;
	isDirty: boolean;
	/** Called once the draft is gone. `removed` means the record went with it. */
	onDiscarded: (removed: boolean) => void;
	onSaved: (id: number) => void;
	permissionKeys: readonly PermissionKey[];
	problems: readonly string[];
	save: () => Promise<{ id: number; revisionId: number }>;
	state: RecordState | null;
}) {
	const saveDraftMutation = useContentMutation(save, ({ id }) => {
		onSaved(id);
		toast.success("Draft saved.");
	});
	const submit = useContentMutation(
		async () => {
			const saved = await save();
			await submitRevision({ data: { revisionId: saved.revisionId } });
			return saved;
		},
		({ id }) => {
			onSaved(id);
			toast.success("Sent for review. Someone else checks it next.");
		},
	);
	const open = state?.open ?? null;
	const discard = useContentMutation(
		(revisionId: number) => discardDraft({ data: { revisionId } }),
		() => {
			onDiscarded(!state?.live && open?.number === 1);
			toast.success("Draft thrown away.");
		},
	);

	const busy =
		saveDraftMutation.isPending || submit.isPending || discard.isPending;
	const canAssign =
		permissionKeys.includes("editorial.assign") &&
		state?.contentItemId &&
		open &&
		(open.status === "submitted" || open.status === "in_review");

	return (
		<div className="flex flex-wrap items-center gap-2">
			{canSave ? (
				<>
					<StaffButton
						disabled={busy}
						onClick={() => saveDraftMutation.mutate(undefined)}
						variant="outline"
					>
						Save draft
					</StaffButton>
					<StaffButton
						disabled={busy || problems.length > 0}
						onClick={() => submit.mutate(undefined)}
					>
						Submit for review
					</StaffButton>
				</>
			) : null}
			{open?.status === "draft" && open.byMe ? (
				<StaffButton
					disabled={busy}
					onClick={() => discard.mutate(open.revisionId)}
					variant="outline"
				>
					Throw away draft
				</StaffButton>
			) : null}
			{canAssign && state?.contentItemId && open ? (
				<AssignButton
					row={{
						author: open.authorName,
						contentItemId: state.contentItemId,
						kindLabel: state.kindLabel,
						number: open.number,
						reviewer: null,
						revisionId: open.revisionId,
						status: open.status,
						submittedAt: null,
						title: state.title,
					}}
				/>
			) : null}
			{isDirty ? (
				<span className="text-muted-foreground text-sm" role="status">
					Unsaved changes
				</span>
			) : null}
		</div>
	);
}
