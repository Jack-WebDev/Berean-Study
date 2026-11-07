import { useState } from "react";
import { toast } from "sonner";

import { publishChapter } from "@/functions/verse-proofreading";

import { StaffButton } from "../../staff-button";
import { StaffFormDialog } from "../../staff-form-dialog";
import { useVerseTextMutation } from "../verse-text-display";

type ChapterAddress = { abbreviation: string; chapter: number; slug: string };

/** Publishing can't be taken back except by a correction, so it asks first. */
export function PublishChapterButton({
	address,
	bookName,
	passedVerses,
}: {
	address: ChapterAddress;
	bookName: string;
	passedVerses: number;
}) {
	const [open, setOpen] = useState(false);
	const name = `${bookName} ${address.chapter} (${address.abbreviation})`;
	const publish = useVerseTextMutation(
		() => publishChapter({ data: address }),
		() => {
			setOpen(false);
			toast.success(`${name} is live for readers.`);
		},
	);

	return (
		<>
			<StaffButton onClick={() => setOpen(true)}>Publish chapter</StaffButton>
			<StaffFormDialog
				canSubmit
				description={`Readers will see the ${passedVerses === 1 ? "verse" : `${passedVerses} verses`} that passed proofreading. This is recorded in the audit log under your name. Later changes go through Correct text.`}
				onOpenChange={setOpen}
				onSubmit={() => publish.mutate(undefined)}
				open={open}
				pending={publish.isPending}
				submitLabel="Publish chapter"
				title={`Publish ${name}?`}
			>
				{null}
			</StaffFormDialog>
		</>
	);
}
