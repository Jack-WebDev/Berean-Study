import {
	type ReportReasonKey,
	reportReasons,
} from "@berean-study/db/community-moderation-catalogue";
import { Button } from "@berean-study/ui/components/button";
import { Label } from "@berean-study/ui/components/label";
import {
	RadioGroup,
	RadioGroupItem,
} from "@berean-study/ui/components/radio-group";
import { Textarea } from "@berean-study/ui/components/textarea";
import { cn } from "@berean-study/ui/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FlagIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { StaffFormDialog } from "@/components/staff/staff-form-dialog";
import { reportCommunityPost } from "@/functions/community";
import { moderationKeys, staffQueueKeys } from "@/queries/keys";

const outcomeMessages = {
	already_reported: "You've already reported this post.",
	needs_details: "Tell the moderators what's wrong with this post.",
	own_post: "You can't report your own post.",
	unavailable: "This post is no longer available.",
} as const;

/** Lets a member flag a post. Nothing changes for readers until a moderator decides. */
export function ReportPostButton({
	className,
	postId,
	postTitle,
}: {
	className?: string;
	postId: number;
	postTitle: string;
}) {
	const queryClient = useQueryClient();
	const detailsId = useId();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState<ReportReasonKey | null>(null);
	const [details, setDetails] = useState("");
	const needsDetails = reason === "other";

	const report = useMutation({
		mutationFn: (selected: ReportReasonKey) =>
			reportCommunityPost({
				data: {
					details: details.trim() || undefined,
					postId,
					reason: selected,
				},
			}),
		onError: () =>
			toast.error("We couldn't send your report. Please try again."),
		onSuccess: async (outcome) => {
			if (outcome === "needs_details") {
				toast.error(outcomeMessages.needs_details);
				return;
			}
			setOpen(false);
			setReason(null);
			setDetails("");
			if (outcome === "reported") {
				toast.success(
					"Thanks for telling us. A moderator will look at this post.",
				);
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: moderationKeys.all }),
					queryClient.invalidateQueries({ queryKey: staffQueueKeys.all }),
				]);
				return;
			}
			toast.info(outcomeMessages[outcome]);
		},
	});

	return (
		<>
			<Button
				aria-label={`Report ${postTitle}`}
				className={cn(
					// The extra space above and below makes it a 44px target without looking bigger.
					"relative h-7 rounded-md px-2 text-muted-foreground after:absolute after:inset-x-0 after:-inset-y-2 hover:text-foreground",
					className,
				)}
				onClick={() => setOpen(true)}
				size="sm"
				type="button"
				variant="ghost"
			>
				<FlagIcon aria-hidden="true" data-icon="inline-start" />
				Report
			</Button>
			<StaffFormDialog
				canSubmit={
					reason !== null && (!needsDetails || Boolean(details.trim()))
				}
				description="Only moderators see your report. The author isn't told who sent it."
				onOpenChange={setOpen}
				onSubmit={() => {
					if (reason) report.mutate(reason);
				}}
				open={open}
				pending={report.isPending}
				submitLabel="Send report"
				title={`Report "${postTitle}"`}
			>
				<fieldset className="space-y-3">
					<legend className="font-medium text-sm">What's wrong with it?</legend>
					<RadioGroup
						onValueChange={(value) => setReason(value as ReportReasonKey)}
						value={reason ?? ""}
					>
						{reportReasons.map((option) => (
							<div className="flex min-h-9 items-center gap-3" key={option.key}>
								<RadioGroupItem
									id={`${detailsId}-${option.key}`}
									value={option.key}
								/>
								<Label
									className="font-normal"
									htmlFor={`${detailsId}-${option.key}`}
								>
									{option.label}
								</Label>
							</div>
						))}
					</RadioGroup>
				</fieldset>
				<div className="space-y-2">
					<Label htmlFor={detailsId}>
						{needsDetails ? "Tell us more" : "Tell us more (optional)"}
					</Label>
					<Textarea
						className="min-h-24 rounded-[0.625rem] text-sm"
						id={detailsId}
						maxLength={1000}
						onChange={(event) => setDetails(event.target.value)}
						required={needsDetails}
						value={details}
					/>
				</div>
			</StaffFormDialog>
		</>
	);
}
