import {
	type CitationStrength,
	type ClaimBody,
	citationStrengthLabels,
	citationStrengths,
} from "@berean-study/db/evidence-body";
import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { useState } from "react";
import { toast } from "sonner";

import { saveEvidenceDraft } from "@/functions/evidence";

import { useContentMutation } from "../content/content-display";
import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StatusChip } from "../status-chip";
import {
	EvidenceField,
	evidenceInputClassName,
	OptionPills,
} from "./evidence-display";

const strengthOptions = citationStrengths.map((value) => ({
	label: citationStrengthLabels[value],
	value,
}));

// Commentary cites from its own editor, where the footnote goes in the text. Views
// and variants arrive with their editors, and stay visible so people can see them.
const supportOptions = [
	{ label: "Claim", value: "claim" },
	{ label: "Commentary text", value: "commentary" },
	{ label: "Interpretation view", value: "view" },
	{ label: "Textual variant", value: "variant" },
] as const;
const unavailableSupports = ["commentary", "view", "variant"] as const;

/**
 * A citation has no review of its own. It's part of the claim it supports, so
 * saving one saves that claim's draft, and the reviewer checks them together.
 */
export function CitationStep({
	claim,
	claimOptions,
	excerptOptions,
	onChooseClaim,
	preferredExcerptId,
}: {
	claim: {
		body: ClaimBody;
		canEdit: boolean;
		citations: readonly {
			excerptId: number;
			excerptTitle: string;
			index: number;
			locator: string;
			strength: CitationStrength;
		}[];
		id: number;
		title: string;
	} | null;
	claimOptions: readonly { id: number; title: string }[];
	excerptOptions: readonly { id: number; title: string }[];
	onChooseClaim: (id: number | null) => void;
	preferredExcerptId?: number;
}) {
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [excerptId, setExcerptId] = useState(preferredExcerptId ?? null);
	const [locator, setLocator] = useState("");
	const [strength, setStrength] = useState<CitationStrength>("direct");

	function reset() {
		setEditingIndex(null);
		setExcerptId(preferredExcerptId ?? null);
		setLocator("");
		setStrength("direct");
	}

	const save = useContentMutation(
		(citations: ClaimBody["citations"]) => {
			if (!claim) throw new Error("Choose a claim first.");
			return saveEvidenceDraft({
				data: {
					body: { ...claim.body, citations },
					id: claim.id,
					kind: "claim",
				},
			});
		},
		() => {
			reset();
			toast.success("Citation saved on the claim's draft.");
		},
	);

	if (!claim) {
		return (
			<StaffCard title="Citation">
				<div className="space-y-4">
					<p className="text-muted-foreground text-sm">
						A citation links a claim to the excerpt it rests on, so it needs a
						claim first. Pick one, or start one at the Claim step.
					</p>
					<EvidenceField label="Claim">
						{(id) => (
							<NativeSelect
								className="h-11 w-full rounded-[0.625rem]"
								id={id}
								onChange={(event) =>
									onChooseClaim(Number(event.target.value) || null)
								}
								value=""
							>
								<NativeSelectOption value="">
									Choose a claim…
								</NativeSelectOption>
								{claimOptions.map(({ id: optionId, title }) => (
									<NativeSelectOption key={optionId} value={optionId}>
										{title}
									</NativeSelectOption>
								))}
							</NativeSelect>
						)}
					</EvidenceField>
				</div>
			</StaffCard>
		);
	}

	const saved = claim.body.citations;
	const entry = excerptId
		? { excerptId, locator: locator.trim(), strength }
		: null;

	function submitEntry() {
		if (!entry) return;
		save.mutate(
			editingIndex === null
				? [...saved, entry]
				: saved.map((citation, index) =>
						index === editingIndex ? entry : citation,
					),
		);
	}

	return (
		<StaffCard title="Citation">
			<div className="space-y-5">
				<p className="text-sm">
					<span className="font-semibold">Supports the claim: </span>
					{claim.title}
				</p>
				{claim.citations.length > 0 ? (
					<ul className="space-y-2">
						{claim.citations.map((citation) => (
							<li
								className="flex flex-wrap items-center justify-between gap-2 rounded-[0.625rem] border border-border p-3 text-sm"
								key={citation.index}
							>
								<span className="min-w-0">
									<span className="block font-medium">
										{citation.excerptTitle}
									</span>
									<span className="mt-1 flex flex-wrap items-center gap-1.5">
										<StatusChip tone="success">
											{citationStrengthLabels[citation.strength]}
										</StatusChip>
										{citation.locator ? (
											<span className="text-muted-foreground text-xs">
												{citation.locator}
											</span>
										) : null}
									</span>
								</span>
								{claim.canEdit ? (
									<span className="flex gap-2">
										<StaffButton
											onClick={() => {
												setEditingIndex(citation.index);
												setExcerptId(citation.excerptId);
												setLocator(citation.locator);
												setStrength(citation.strength);
											}}
											variant="outline"
										>
											Edit
										</StaffButton>
										<StaffButton
											disabled={save.isPending}
											onClick={() =>
												save.mutate(
													saved.filter((_, index) => index !== citation.index),
												)
											}
											variant="outline"
										>
											Remove
										</StaffButton>
									</span>
								) : null}
							</li>
						))}
					</ul>
				) : null}

				{claim.canEdit ? (
					<div className="space-y-5">
						<EvidenceField
							hint={
								excerptOptions.length === 0
									? "No excerpts exist yet. Add one at the Excerpt step."
									: undefined
							}
							label="Points to excerpt"
						>
							{(id) => (
								<NativeSelect
									className="h-11 w-full rounded-[0.625rem]"
									id={id}
									onChange={(event) =>
										setExcerptId(Number(event.target.value) || null)
									}
									value={excerptId ?? ""}
								>
									<NativeSelectOption value="">
										Choose an excerpt…
									</NativeSelectOption>
									{excerptOptions.map(({ id: optionId, title }) => (
										<NativeSelectOption key={optionId} value={optionId}>
											{title}
										</NativeSelectOption>
									))}
								</NativeSelect>
							)}
						</EvidenceField>
						<EvidenceField label="Locator">
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={200}
									onChange={(event) => setLocator(event.target.value)}
									placeholder="on Rom 8:28, or p. 459"
									value={locator}
								/>
							)}
						</EvidenceField>
						<div className="space-y-2">
							<OptionPills
								disabledOptions={unavailableSupports}
								label="Supports"
								onChange={() => undefined}
								options={supportOptions}
								value="claim"
							/>
							<p className="text-muted-foreground text-xs">
								Commentary adds its citations from the commentary editor. Views
								and variants open with their own editors.
							</p>
						</div>
						<OptionPills
							label="Strength"
							onChange={setStrength}
							options={strengthOptions}
							value={strength}
						/>
						<div className="flex flex-wrap gap-2">
							<StaffButton
								disabled={!entry || save.isPending}
								onClick={submitEntry}
							>
								{editingIndex === null ? "Add to claim" : "Update citation"}
							</StaffButton>
							{editingIndex !== null ? (
								<StaffButton onClick={reset} variant="outline">
									Cancel
								</StaffButton>
							) : null}
						</div>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						This claim can't change right now. Its citations are shown as they
						were sent for review.
					</p>
				)}
			</div>
		</StaffCard>
	);
}
