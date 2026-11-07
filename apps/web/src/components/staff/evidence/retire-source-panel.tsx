import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { decideSourceRetirement, retireSource } from "@/functions/evidence";
import { invalidateContent } from "@/queries/content";

import { useContentMutation } from "../content/content-display";
import { ChangeDecisionPanel } from "../foundations/change-decision-panel";
import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { UsedInList } from "./evidence-display";

type UsedInRows = Parameters<typeof UsedInList>[0]["rows"];

/** Retiring a source that's in use lists what it affects, and needs a second person. */
export function RetireSourcePanel({
	pending,
	sourceId,
	usedIn,
}: {
	pending: {
		id: number;
		proposedByMe: boolean;
		proposerName: string;
		reason: string;
	} | null;
	sourceId: number;
	usedIn: UsedInRows;
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const inUse = usedIn.length > 0;

	const retire = useContentMutation(
		() => retireSource({ data: { reason, sourceId } }),
		({ outcome }) => {
			setOpen(false);
			setReason("");
			toast.success(
				outcome === "proposed"
					? "Proposed. A second Superadmin has to confirm it."
					: "Retired. Nothing was using this source.",
			);
		},
	);

	if (pending) {
		return (
			<StaffCard title="Retiring this source">
				<div className="space-y-3 text-sm">
					<p>
						{pending.proposedByMe ? "You" : pending.proposerName} proposed
						retiring this source.
					</p>
					<p className="text-muted-foreground">{pending.reason}</p>
					{inUse ? (
						<div>
							<p className="mb-1 font-semibold">What this affects</p>
							<UsedInList rows={usedIn} />
						</div>
					) : null}
					<ChangeDecisionPanel
						confirmLabel="Confirm & retire"
						decideWith={decideSourceRetirement}
						onDecided={() => invalidateContent(queryClient)}
						proposalId={pending.id}
						proposedByMe={pending.proposedByMe}
					/>
				</div>
			</StaffCard>
		);
	}

	return (
		<StaffCard title="Retire">
			<p className="text-muted-foreground text-sm">
				{inUse
					? "This source is in use, so a second Superadmin has to confirm. Published work stays as it is, but nothing new can rest on it."
					: "Nothing uses this source, so retiring it takes effect straight away."}
			</p>
			<StaffButton
				className="mt-3"
				onClick={() => setOpen(true)}
				variant="outline"
			>
				Retire this source
			</StaffButton>
			<StaffFormDialog
				canSubmit={reason.trim().length > 0}
				description={
					inUse
						? "Check what depends on it first. A second Superadmin sees the same list."
						: undefined
				}
				destructive
				onOpenChange={setOpen}
				onSubmit={() => retire.mutate(undefined)}
				open={open}
				pending={retire.isPending}
				submitLabel={inUse ? "Send for confirmation" : "Retire source"}
				title="Retire this source"
			>
				{inUse ? (
					<div>
						<p className="mb-1 font-semibold text-sm">What this affects</p>
						<UsedInList rows={usedIn} />
					</div>
				) : null}
				<ReasonField onChange={setReason} value={reason} />
			</StaffFormDialog>
		</StaffCard>
	);
}
