import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	type ClaimBody,
	citationStrengthLabels,
	claimBodySchema,
	claimConfidenceLabels,
	claimConfidences,
	claimKindLabels,
	claimKinds,
	claimProblems,
	emptyClaimBody,
} from "@berean-study/db/evidence-body";
import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { Textarea } from "@berean-study/ui/components/textarea";
import { useState } from "react";

import { saveEvidenceDraft } from "@/functions/evidence";

import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StatusChip } from "../status-chip";
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

const confidenceOptions = claimConfidences.map((value) => ({
	label: claimConfidenceLabels[value],
	value,
}));

export function ClaimStep({
	citations,
	claimId,
	initial,
	onAddCitation,
	onDiscarded,
	onSaved,
	permissionKeys,
	state,
}: {
	citations: readonly {
		excerptIsLive: boolean;
		excerptTitle: string;
		index: number;
		locator: string;
		strength: keyof typeof citationStrengthLabels;
	}[];
	claimId?: number;
	initial: ClaimBody | null;
	onAddCitation: () => void;
	onDiscarded: (removed: boolean) => void;
	onSaved: (id: number) => void;
	permissionKeys: readonly PermissionKey[];
	state: RecordState | null;
}) {
	const start = initial ?? emptyClaimBody;
	const [statement, setStatement] = useState(start.statement);
	const [passage, setPassage] = useState(start.passage);
	const [kind, setKind] = useState(start.kind);
	const [confidence, setConfidence] = useState(start.confidence);

	const canEdit = state?.canEdit ?? true;
	// Citations are saved from their own step, so the saved list is the true one.
	const body = {
		citations: start.citations,
		confidence,
		kind,
		passage,
		statement,
	};
	const parsed = claimBodySchema.safeParse(body);
	const cleaned = parsed.success ? parsed.data : body;
	const isDirty = JSON.stringify(cleaned) !== JSON.stringify(start);
	useUnsavedWarning(isDirty);
	const problems = claimProblems(cleaned);

	return (
		<StaffCard title="Claim">
			<div className="space-y-5">
				<RecordBanner state={state} />
				<fieldset className="space-y-5" disabled={!canEdit}>
					<EvidenceField label="Statement">
						{(id) => (
							<Textarea
								className="min-h-20 rounded-[0.625rem] text-sm"
								id={id}
								maxLength={1000}
								onChange={(event) => setStatement(event.target.value)}
								value={statement}
							/>
						)}
					</EvidenceField>
					<div className="grid gap-4 sm:grid-cols-2">
						<EvidenceField label="Passage">
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={100}
									onChange={(event) => setPassage(event.target.value)}
									placeholder="Romans 8:28"
									value={passage}
								/>
							)}
						</EvidenceField>
						<EvidenceField label="Kind">
							{(id) => (
								<NativeSelect
									className="h-11 w-full rounded-[0.625rem]"
									id={id}
									onChange={(event) =>
										setKind((event.target.value || null) as ClaimBody["kind"])
									}
									value={kind ?? ""}
								>
									<NativeSelectOption value="">Choose…</NativeSelectOption>
									{claimKinds.map((value) => (
										<NativeSelectOption key={value} value={value}>
											{claimKindLabels[value]}
										</NativeSelectOption>
									))}
								</NativeSelect>
							)}
						</EvidenceField>
					</div>
					<OptionPills
						label="Confidence"
						onChange={setConfidence}
						options={confidenceOptions}
						value={confidence}
					/>
				</fieldset>

				<div className="space-y-2">
					<p className="font-semibold text-sm">Supporting citations</p>
					{citations.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							None yet. Every claim has to trace back to a source.
						</p>
					) : (
						<ul className="space-y-2">
							{citations.map((citation) => (
								<li
									className="flex flex-wrap items-center justify-between gap-2 rounded-[0.625rem] border border-border p-3 text-sm"
									key={citation.index}
								>
									<span className="min-w-0">
										<span className="block font-medium">
											{citation.excerptTitle}
										</span>
										{citation.locator ? (
											<span className="block text-muted-foreground text-xs">
												{citation.locator}
											</span>
										) : null}
									</span>
									<span className="flex flex-wrap gap-1.5">
										{citation.excerptIsLive ? null : (
											<StatusChip tone="attention">Excerpt not live</StatusChip>
										)}
										<StatusChip tone="success">
											{citationStrengthLabels[citation.strength]}
										</StatusChip>
									</span>
								</li>
							))}
						</ul>
					)}
					{canEdit ? (
						<StaffButton onClick={onAddCitation} variant="outline">
							+ Add citation
						</StaffButton>
					) : null}
				</div>

				{canEdit ? <ReviewProblems problems={problems} /> : null}
				<DraftControls
					canSave={canEdit}
					isDirty={isDirty}
					onDiscarded={onDiscarded}
					onSaved={onSaved}
					permissionKeys={permissionKeys}
					problems={problems}
					save={() =>
						saveEvidenceDraft({
							data: { body: cleaned, id: claimId, kind: "claim" },
						})
					}
					state={state}
				/>
			</div>
		</StaffCard>
	);
}
