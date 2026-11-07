import { useState } from "react";
import { toast } from "sonner";

import { reopenChapter } from "@/functions/verse-proofreading";

import { StaffButton } from "../../staff-button";
import { ReasonField, StaffFormDialog } from "../../staff-form-dialog";
import { useVerseTextMutation } from "../verse-text-display";

type ChapterAddress = { abbreviation: string; chapter: number; slug: string };

/** For when a passed verse turns out to be wrong, so it never has to go live to be fixed. */
export function ReopenChapterButton({
	address,
	name,
	passedVerses,
}: {
	address: ChapterAddress;
	name: string;
	passedVerses: number;
}) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const reopen = useVerseTextMutation(
		() => reopenChapter({ data: { ...address, reason } }),
		() => {
			setOpen(false);
			setReason("");
			toast.success(`${name} is back in proofreading.`);
		},
	);

	return (
		<>
			<StaffButton
				className="w-full"
				onClick={() => setOpen(true)}
				variant="outline"
			>
				Send back to proofreading
			</StaffButton>
			<StaffFormDialog
				canSubmit={reason.trim().length > 0}
				description={`${passedVerses === 1 ? "The verse goes" : `The ${passedVerses} verses go`} back to being checked, and readers see nothing new. Marks stay in place, so only what's wrong has to change. Whoever passed it is told why.`}
				onOpenChange={setOpen}
				onSubmit={() => reopen.mutate(undefined)}
				open={open}
				pending={reopen.isPending}
				submitLabel="Send back to proofreading"
				title={`Send ${name} back to proofreading?`}
			>
				<ReasonField
					hint="For example, which verse is wrong and how you noticed."
					onChange={setReason}
					value={reason}
				/>
			</StaffFormDialog>
		</>
	);
}
