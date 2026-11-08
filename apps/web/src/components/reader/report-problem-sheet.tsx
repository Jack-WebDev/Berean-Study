import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import {
	type StudyProblemType,
	studyProblemKinds,
} from "@berean-study/db/reader-catalogue";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";

import { BottomSheet } from "@/components/reader-ui/bottom-sheet";
import { ReaderButton } from "@/components/reader-ui/button";
import { reportStudyProblem } from "@/functions/reader";
import { contentKeys } from "@/queries/keys";

/** The study note being reported: the exact revision the reader saw. */
export type ReportedNote = { label: string; revisionId: number };

/*
 * Report a problem with a study note (decision D5). The reader picks what kind of
 * problem it is and says what's wrong; it goes to the staff's Content Issues list.
 */
export function ReportProblemSheet({
	note,
	onOpenChange,
	onSent,
}: {
	note: ReportedNote | null;
	onOpenChange: (open: boolean) => void;
	onSent: () => void;
}) {
	return (
		<BottomSheet
			description={note ? `About: ${note.label}` : undefined}
			kind="tall"
			onOpenChange={onOpenChange}
			open={note !== null}
			title="Report a problem"
		>
			{/* A fresh form for each note, so nothing carries over. */}
			{note ? (
				<ReportForm key={note.revisionId} note={note} onSent={onSent} />
			) : null}
		</BottomSheet>
	);
}

function ReportForm({
	note,
	onSent,
}: {
	note: ReportedNote;
	onSent: () => void;
}) {
	const queryClient = useQueryClient();
	const kindLabelId = useId();
	const descriptionId = useId();
	const errorId = useId();
	const [issueType, setIssueType] = useState<StudyProblemType | null>(null);
	const [description, setDescription] = useState("");
	const [problem, setProblem] = useState<string | null>(null);

	const send = useMutation({
		mutationFn: (type: StudyProblemType) =>
			reportStudyProblem({
				data: {
					description: description.trim(),
					issueType: type,
					revisionId: note.revisionId,
				},
			}),
		onError: () =>
			setProblem(
				"We couldn't send your report. Check your connection, then try again.",
			),
		onSuccess: async (result) => {
			if (result.status === "refused") {
				setProblem(result.message);
				return;
			}
			onSent();
			await queryClient.invalidateQueries({ queryKey: contentKeys.all });
		},
	});

	const submit = () => {
		if (!issueType) {
			setProblem("Choose what kind of problem it is.");
			return;
		}
		if (!description.trim()) {
			setProblem("Tell us what's wrong, in a few words.");
			return;
		}
		setProblem(null);
		send.mutate(issueType);
	};

	return (
		<form
			className="flex flex-col gap-5"
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<div>
				<p className="font-bold text-[17px]" id={kindLabelId}>
					What kind of problem is it?
				</p>
				<RadioGroup
					aria-labelledby={kindLabelId}
					className="mt-2 flex flex-col gap-2"
					onValueChange={(value) => {
						setIssueType(value as StudyProblemType);
						setProblem(null);
					}}
					value={issueType ?? ""}
				>
					{studyProblemKinds.map((kind) => (
						// biome-ignore lint/a11y/noLabelWithoutControl: Base UI's Radio renders the control inside the label.
						<label
							className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-border-strong bg-card px-4 py-2 has-[[data-checked]]:border-primary"
							key={kind.type}
						>
							<Radio.Root
								className="reader-focus flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong data-checked:border-primary"
								value={kind.type}
							>
								<Radio.Indicator className="size-3 rounded-full bg-primary" />
							</Radio.Root>
							<span className="text-[17px] leading-snug">{kind.label}</span>
						</label>
					))}
				</RadioGroup>
			</div>
			<div>
				<label className="font-bold text-[17px]" htmlFor={descriptionId}>
					What's wrong?
				</label>
				<p className="text-[15px] text-muted-foreground">
					Our editors read every report.
				</p>
				<textarea
					aria-describedby={problem ? errorId : undefined}
					className="reader-focus mt-2 h-[140px] w-full resize-y rounded-[var(--ios-control-radius)] border-[1.5px] border-border-strong bg-card px-3 py-2 text-[18px] text-foreground leading-relaxed"
					id={descriptionId}
					maxLength={2000}
					onChange={(event) => {
						setDescription(event.target.value);
						setProblem(null);
					}}
					value={description}
				/>
			</div>
			{problem ? (
				<p
					className="font-semibold text-[16px] text-destructive"
					id={errorId}
					role="alert"
				>
					{problem}
				</p>
			) : null}
			<ReaderButton disabled={send.isPending} type="submit" variant="primary">
				{send.isPending ? "Sending…" : "Send report"}
			</ReaderButton>
		</form>
	);
}
