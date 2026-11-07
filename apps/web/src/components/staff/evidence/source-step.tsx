import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	emptySourceBody,
	type SourceBody,
	sourceBodySchema,
	sourceProblems,
	sourceTypeLabels,
	sourceTypes,
} from "@berean-study/db/evidence-body";
import { Input } from "@berean-study/ui/components/input";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";

import { saveEvidenceDraft } from "@/functions/evidence";
import { similarSourcesQueryOptions } from "@/queries/evidence";

import { StaffCard } from "../staff-card";
import {
	DraftControls,
	RecordBanner,
	type RecordState,
	ReviewProblems,
} from "./draft-controls";
import {
	EvidenceField,
	evidenceInputClassName,
	OptionPills,
	useUnsavedWarning,
} from "./evidence-display";

const typeOptions = sourceTypes.map((value) => ({
	label: sourceTypeLabels[value],
	value,
}));

export function SourceStep({
	initial,
	onDiscarded,
	onSaved,
	permissionKeys,
	sourceId,
	sourceStatus,
	state,
}: {
	initial: SourceBody | null;
	onDiscarded: (removed: boolean) => void;
	onSaved: (id: number) => void;
	permissionKeys: readonly PermissionKey[];
	sourceId?: number;
	sourceStatus?: "active" | "merged" | "retired";
	state: RecordState | null;
}) {
	const start = initial ?? emptySourceBody;
	const [body, setBody] = useState(start);
	const set = <K extends keyof SourceBody>(field: K, value: SourceBody[K]) =>
		setBody((previous) => ({ ...previous, [field]: value }));

	const usable = sourceStatus === undefined || sourceStatus === "active";
	const canEdit = usable && (state?.canEdit ?? true);
	const parsed = sourceBodySchema.safeParse(body);
	const cleaned = parsed.success ? parsed.data : body;
	const isDirty = JSON.stringify(cleaned) !== JSON.stringify(start);
	useUnsavedWarning(isDirty);

	const deferredTitle = useDeferredValue(cleaned.title);
	const { data: similar = [] } = useQuery({
		...similarSourcesQueryOptions({
			exceptSourceId: sourceId,
			title: deferredTitle,
		}),
		enabled: canEdit && deferredTitle.length >= 4,
	});

	return (
		<StaffCard title="Source">
			<div className="space-y-5">
				{sourceStatus === "retired" ? (
					<p className="rounded-[0.625rem] bg-status-danger p-3 text-sm text-status-danger-foreground">
						This source has been retired. Published work that already rests on
						it stays as it is, but nothing new can use it.
					</p>
				) : null}
				{sourceStatus === "merged" ? (
					<p className="rounded-[0.625rem] bg-status-neutral p-3 text-sm text-status-neutral-foreground">
						This source was merged into another one and is kept only for the
						record.
					</p>
				) : null}
				<RecordBanner state={state} />
				<fieldset className="space-y-5" disabled={!canEdit}>
					<OptionPills
						label="Type"
						onChange={(value) => set("type", value)}
						options={typeOptions}
						value={body.type}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<EvidenceField label="Author(s)">
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={300}
									onChange={(event) => set("authors", event.target.value)}
									value={body.authors}
								/>
							)}
						</EvidenceField>
						<EvidenceField label="Edition">
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={100}
									onChange={(event) => set("edition", event.target.value)}
									placeholder="2nd edition"
									value={body.edition}
								/>
							)}
						</EvidenceField>
					</div>
					<EvidenceField label="Title">
						{(id) => (
							<Input
								className={evidenceInputClassName}
								id={id}
								maxLength={300}
								onChange={(event) => set("title", event.target.value)}
								value={body.title}
							/>
						)}
					</EvidenceField>
					<div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
						<EvidenceField label="Publisher">
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={200}
									onChange={(event) => set("publisher", event.target.value)}
									value={body.publisher}
								/>
							)}
						</EvidenceField>
						<EvidenceField label="Year">
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									inputMode="numeric"
									maxLength={20}
									onChange={(event) => set("year", event.target.value)}
									value={body.year}
								/>
							)}
						</EvidenceField>
					</div>
				</fieldset>

				{similar.length > 0 ? (
					<div
						className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground"
						role="status"
					>
						<p className="font-semibold">Possible duplicate</p>
						<ul className="mt-1 space-y-0.5">
							{similar.map(({ id, title }) => (
								<li key={id}>
									<Link
										className="underline underline-offset-4"
										search={{ source: id, step: "source" }}
										to="/work/sources/evidence"
									>
										{title}
									</Link>{" "}
									already exists. If it's another edition, keep both.
								</li>
							))}
						</ul>
					</div>
				) : null}

				{canEdit ? <ReviewProblems problems={sourceProblems(cleaned)} /> : null}
				<DraftControls
					canSave={canEdit}
					isDirty={isDirty}
					onDiscarded={(removed) => {
						if (!removed) setBody(start);
						onDiscarded(removed);
					}}
					onSaved={onSaved}
					permissionKeys={permissionKeys}
					problems={sourceProblems(cleaned)}
					save={() =>
						saveEvidenceDraft({
							data: { body: cleaned, id: sourceId, kind: "source" },
						})
					}
					state={state}
				/>
			</div>
		</StaffCard>
	);
}
