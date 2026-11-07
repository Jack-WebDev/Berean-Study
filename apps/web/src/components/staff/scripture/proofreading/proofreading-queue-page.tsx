import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { proofreadingQueueQueryOptions } from "@/queries/verse-text";

import { staffLinkClassName } from "../../staff-button";
import { StaffCard } from "../../staff-card";
import { StaffPage } from "../../staff-page";
import { StatusChip } from "../../status-chip";
import { ReadyToPublishList } from "./ready-to-publish-list";

export function ProofreadingQueuePage({
	permissionKeys,
}: {
	permissionKeys: readonly PermissionKey[];
}) {
	const { data } = useSuspenseQuery(proofreadingQueueQueryOptions());
	const canProofread = permissionKeys.includes("scripture.proofread");
	const canEnter = permissionKeys.includes("scripture.enter");
	const canPublish = permissionKeys.includes("publication.publish");

	return (
		<StaffPage
			actions={
				canEnter ? (
					<Link className={staffLinkClassName} to="/work/scripture">
						Enter verses
					</Link>
				) : null
			}
			description="Chapters on their way from entry to readers. You can't proofread verses you entered yourself."
			section="Scripture entry"
			title="Proofreading"
		>
			<div className="space-y-6">
				<StaffCard title="Waiting for proofreading">
					{data.waiting.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nothing is waiting to be checked.
						</p>
					) : (
						<ul>
							{data.waiting.map((chapter) => (
								<li
									className="flex flex-wrap items-center justify-between gap-3 border-border-subtle border-t py-3 first:border-t-0"
									key={`${chapter.abbreviation}-${chapter.slug}-${chapter.chapter}`}
								>
									<div className="min-w-0">
										<p className="font-semibold">
											{chapter.bookName} {chapter.chapter} ·{" "}
											{chapter.abbreviation}
										</p>
										<p className="text-muted-foreground text-sm">
											Entered by {chapter.enterers.join(", ")}.{" "}
											{chapter.checked} of {chapter.total} checked
											{chapter.needFix > 0
												? `, ${chapter.needFix} need a fix`
												: ""}
										</p>
									</div>
									{canProofread ? (
										<Link
											className={staffLinkClassName}
											params={{
												bookSlug: chapter.slug,
												chapter: String(chapter.chapter),
												translation: chapter.abbreviation,
											}}
											to="/work/scripture/proofreading/$translation/$bookSlug/$chapter"
										>
											{chapter.canCheck > 0 ? "Proofread" : "Open"}
										</Link>
									) : null}
								</li>
							))}
						</ul>
					)}
				</StaffCard>

				{data.sentBack.length > 0 ? (
					<StaffCard title="Sent back to fix">
						<ul>
							{data.sentBack.map((chapter) => (
								<li
									className="flex flex-wrap items-center justify-between gap-3 border-border-subtle border-t py-3 first:border-t-0"
									key={`${chapter.abbreviation}-${chapter.slug}-${chapter.chapter}`}
								>
									<div className="min-w-0">
										<p className="flex flex-wrap items-center gap-2 font-semibold">
											{chapter.bookName} {chapter.chapter} ·{" "}
											{chapter.abbreviation}
											{chapter.mine ? (
												<StatusChip tone="danger">Yours to fix</StatusChip>
											) : null}
										</p>
										<p className="text-muted-foreground text-sm">
											{chapter.verses}{" "}
											{chapter.verses === 1 ? "verse" : "verses"} with{" "}
											{chapter.enterers.join(", ")}
										</p>
									</div>
									{canEnter ? (
										<Link
											className={staffLinkClassName}
											search={{
												book: chapter.slug,
												chapter: chapter.chapter,
												t: chapter.abbreviation,
											}}
											to="/work/scripture"
										>
											Open
										</Link>
									) : null}
								</li>
							))}
						</ul>
					</StaffCard>
				) : null}

				{canPublish ? <ReadyToPublishList canPublish /> : null}
			</div>
		</StaffPage>
	);
}
