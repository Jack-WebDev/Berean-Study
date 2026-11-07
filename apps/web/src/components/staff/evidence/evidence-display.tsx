import type { ContentRevisionStatus } from "@berean-study/db/content-kinds";
import { contentRevisionStatusLabels } from "@berean-study/db/content-kinds";
import { Label } from "@berean-study/ui/components/label";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useId } from "react";

import { StaffCard } from "../staff-card";
import { StatusChip } from "../status-chip";

export const evidenceSteps = [
	"source",
	"excerpt",
	"citation",
	"claim",
] as const;
export type EvidenceStep = (typeof evidenceSteps)[number];

/** The workbench address that opens one evidence record in its editor. */
export function evidenceWorkbenchSearch(kind: string, scopeKey: string) {
	const id = Number(scopeKey);
	if (kind === "source") return { source: id, step: "source" as const };
	if (kind === "source_excerpt") {
		return { excerpt: id, step: "excerpt" as const };
	}
	return { claim: id, step: "claim" as const };
}

/** Where a record stands, in the same words wherever it's listed. */
export function RecordStatusChips({
	latestNumber,
	latestStatus,
	liveNumber,
	sourceStatus,
}: {
	latestNumber: number | null;
	latestStatus: ContentRevisionStatus | null;
	liveNumber: number | null;
	sourceStatus?: "active" | "merged" | "retired";
}) {
	if (sourceStatus === "retired") {
		return <StatusChip tone="danger">Retired</StatusChip>;
	}
	if (sourceStatus === "merged") {
		return <StatusChip tone="neutral">Merged</StatusChip>;
	}
	const inProgress = latestStatus !== "published" && latestStatus !== null;
	return (
		<>
			{liveNumber ? (
				<StatusChip tone="success">Live: Revision #{liveNumber}</StatusChip>
			) : null}
			{inProgress && latestStatus !== "superseded" ? (
				<StatusChip tone={latestStatus === "draft" ? "neutral" : "info"}>
					{contentRevisionStatusLabels[latestStatus]}
					{latestNumber ? ` · #${latestNumber}` : ""}
				</StatusChip>
			) : null}
		</>
	);
}

/** A choice between a few options, shown all at once. */
export function OptionPills<TValue extends string>({
	disabledOptions = [],
	label,
	onChange,
	options,
	value,
}: {
	disabledOptions?: readonly TValue[];
	label: string;
	onChange: (value: TValue) => void;
	options: readonly { label: string; value: TValue }[];
	value: TValue | null;
}) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: A fieldset would add its own disabled state on top of the form's.
		<div aria-label={label} className="space-y-2" role="group">
			<p className="font-semibold text-sm">{label}</p>
			<div className="flex flex-wrap gap-2">
				{options.map((option) => (
					<button
						aria-pressed={option.value === value}
						className={cn(
							"min-h-11 rounded-full border px-4 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
							option.value === value
								? "border-primary bg-primary text-primary-foreground"
								: "border-border bg-card hover:bg-muted",
						)}
						disabled={disabledOptions.includes(option.value)}
						key={option.value}
						onClick={() => onChange(option.value)}
						type="button"
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}

/** A labelled field. The control gets its id from here, so the label stays connected. */
export function EvidenceField({
	children,
	hint,
	label,
}: {
	children: (id: string) => ReactNode;
	hint?: ReactNode;
	label: string;
}) {
	const id = useId();
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			{children(id)}
			{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
		</div>
	);
}

export const evidenceInputClassName = "h-11 rounded-[0.625rem] text-sm";

type UsedInRow = {
	id: string;
	label: string;
	meta: string;
	target:
		| { type: "revision"; contentItemId: number; revisionId: number }
		| { type: "excerpt"; excerptId: number }
		| { type: "research" };
};

export function UsedInList({ rows }: { rows: readonly UsedInRow[] }) {
	return (
		<ul className="divide-y divide-border-subtle">
			{rows.map((row) => (
				<li className="py-2 text-sm first:pt-0 last:pb-0" key={row.id}>
					<UsedInLink row={row} />
					<p className="text-muted-foreground text-xs">{row.meta}</p>
				</li>
			))}
		</ul>
	);
}

function UsedInLink({ row }: { row: UsedInRow }) {
	const className = "font-medium underline-offset-4 hover:underline";
	const { target } = row;
	if (target.type === "revision") {
		return (
			<Link
				className={className}
				params={{
					contentId: String(target.contentItemId),
					revisionId: String(target.revisionId),
				}}
				to="/admin/editorial/$contentId/revisions/$revisionId"
			>
				{row.label}
			</Link>
		);
	}
	if (target.type === "excerpt") {
		return (
			<Link
				className={className}
				search={{ excerpt: target.excerptId, step: "excerpt" }}
				to="/work/sources/evidence"
			>
				{row.label}
			</Link>
		);
	}
	return (
		<Link className={className} to="/work/research">
			{row.label}
		</Link>
	);
}

/** Everything that depends on this record, and what happens to it when this changes. */
export function UsedInCard({ rows }: { rows: readonly UsedInRow[] }) {
	return (
		<StaffCard title="Used in">
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">Nothing uses this yet.</p>
			) : (
				<UsedInList rows={rows} />
			)}
			<p className="mt-3 text-muted-foreground text-xs">
				Changing this record creates a new revision. Published content keeps
				pointing to the version it was reviewed with.
			</p>
		</StaffCard>
	);
}

/** Warns before leaving a form with unsaved changes. */
export function useUnsavedWarning(isDirty: boolean) {
	useEffect(() => {
		if (!isDirty) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [isDirty]);
}
