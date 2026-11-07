import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	countWords,
	type ExcerptBody,
	emptyExcerptBody,
	excerptBodySchema,
	excerptFormLabels,
	excerptForms,
	excerptProblems,
	MAX_QUOTATION_WORDS,
} from "@berean-study/db/evidence-body";
import { Input } from "@berean-study/ui/components/input";
import { Textarea } from "@berean-study/ui/components/textarea";
import { useState } from "react";

import { saveEvidenceDraft } from "@/functions/evidence";

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

const formOptions = [...excerptForms].reverse().map((value) => ({
	label: excerptFormLabels[value],
	value,
}));

const splitPassages = (text: string) =>
	text
		.split(";")
		.map((passage) => passage.trim())
		.filter(Boolean);

export function ExcerptStep({
	excerptId,
	initial,
	onDiscarded,
	onSaved,
	permissionKeys,
	sourceId,
	sourceName,
	sourceUsable,
	state,
}: {
	excerptId?: number;
	initial: ExcerptBody | null;
	onDiscarded: (removed: boolean) => void;
	onSaved: (id: number) => void;
	permissionKeys: readonly PermissionKey[];
	sourceId: number;
	sourceName: string;
	sourceUsable: boolean;
	state: RecordState | null;
}) {
	const start = initial ?? emptyExcerptBody;
	const [form, setForm] = useState(start.form);
	const [location, setLocation] = useState(start.location);
	const [text, setText] = useState(start.text);
	const [passagesText, setPassagesText] = useState(start.passages.join("; "));

	const canEdit = sourceUsable && (state?.canEdit ?? true);
	const body = {
		form,
		location,
		passages: splitPassages(passagesText),
		text,
	};
	const parsed = excerptBodySchema.safeParse(body);
	const cleaned = parsed.success ? parsed.data : body;
	const isDirty = JSON.stringify(cleaned) !== JSON.stringify(start);
	useUnsavedWarning(isDirty);

	const problems = excerptProblems(cleaned);
	const words = countWords(text);

	return (
		<StaffCard title="Source excerpt">
			<div className="space-y-5">
				<RecordBanner state={state} />
				<p className="text-sm">
					<span className="font-semibold">From: </span>
					{sourceName}
				</p>
				<fieldset className="space-y-5" disabled={!canEdit}>
					<EvidenceField label="Location">
						{(id) => (
							<Input
								className={evidenceInputClassName}
								id={id}
								maxLength={200}
								onChange={(event) => setLocation(event.target.value)}
								placeholder="Entry on Romans 8:28"
								value={location}
							/>
						)}
					</EvidenceField>
					<OptionPills
						label="Form"
						onChange={setForm}
						options={formOptions}
						value={form}
					/>
					<EvidenceField
						hint={
							form === "quotation"
								? `${words} of ${MAX_QUOTATION_WORDS} words. Longer material has to be summarised in our own words.`
								: "Say what it says, in our own words."
						}
						label={form === "quotation" ? "Quotation" : "Summary"}
					>
						{(id) => (
							<Textarea
								className="min-h-28 rounded-[0.625rem] text-sm"
								id={id}
								maxLength={5000}
								onChange={(event) => setText(event.target.value)}
								value={text}
							/>
						)}
					</EvidenceField>
					<EvidenceField
						hint="Separate passages with a semicolon, such as Romans 8:28; 1 John 2:1-6."
						label="Passages it speaks to"
					>
						{(id) => (
							<Input
								className={evidenceInputClassName}
								id={id}
								onChange={(event) => setPassagesText(event.target.value)}
								value={passagesText}
							/>
						)}
					</EvidenceField>
				</fieldset>
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
							data: {
								body: cleaned,
								id: excerptId,
								kind: "source_excerpt",
								sourceId: excerptId ? undefined : sourceId,
							},
						})
					}
					state={state}
				/>
			</div>
		</StaffCard>
	);
}
