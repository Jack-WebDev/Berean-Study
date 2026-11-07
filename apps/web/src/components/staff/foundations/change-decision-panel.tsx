import { useState } from "react";
import { toast } from "sonner";

import { decideFoundationChange } from "@/functions/structure";

import { StaffButton } from "../staff-button";
import { ReasonField } from "../staff-form-dialog";
import { useFoundationMutation } from "./use-foundation-mutation";

type Decision = "confirm" | "return" | "reject";

const decisionMessages: Record<Decision, string> = {
	confirm: "Confirmed and applied. This is recorded in the audit log.",
	return: "Sent back with your questions. Nothing has changed.",
	reject: "Rejected. Nothing has changed.",
};

/** The second person's decision on a foundation change. The proposer only sees why they can't. */
export function ChangeDecisionPanel({
	confirmLabel = "Confirm & apply",
	decideWith = decideFoundationChange,
	onDecided,
	proposalId,
	proposedByMe,
}: {
	confirmLabel?: string;
	/** Each screen decides through a server function guarded by its own permission. */
	decideWith?: (input: {
		data: { decision: Decision; note: string; proposalId: number };
	}) => Promise<unknown>;
	onDecided?: () => void;
	proposalId: number;
	proposedByMe: boolean;
}) {
	const [note, setNote] = useState("");
	const decide = useFoundationMutation(
		(decision: Decision) =>
			decideWith({ data: { decision, note, proposalId } }),
		(_result, decision) => {
			setNote("");
			onDecided?.();
			toast.success(decisionMessages[decision]);
		},
	);

	if (proposedByMe) {
		return (
			<p className="rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground">
				You proposed this, so a different Superadmin has to decide it. Nothing
				changes until they do.
			</p>
		);
	}

	const canDecide = note.trim().length > 0 && !decide.isPending;

	return (
		<div className="space-y-3">
			<ReasonField
				hint="Required, and kept in the audit log. The person who proposed this sees it."
				label="Your note"
				onChange={setNote}
				value={note}
			/>
			<div className="flex flex-wrap gap-2">
				<StaffButton
					disabled={!canDecide}
					onClick={() => decide.mutate("confirm")}
				>
					{confirmLabel}
				</StaffButton>
				<StaffButton
					disabled={!canDecide}
					onClick={() => decide.mutate("return")}
					variant="outline"
				>
					Send back with questions
				</StaffButton>
				<StaffButton
					disabled={!canDecide}
					onClick={() => decide.mutate("reject")}
					variant="destructive"
				>
					Reject
				</StaffButton>
			</div>
		</div>
	);
}
