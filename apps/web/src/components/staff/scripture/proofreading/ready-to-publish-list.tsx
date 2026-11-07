import { formatVerseList } from "@berean-study/db/verse-text-tools";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { readyToPublishQueryOptions } from "@/queries/verse-text";

import { staffLinkClassName } from "../../staff-button";
import { StaffCard } from "../../staff-card";
import { StatusChip } from "../../status-chip";
import { PublishChapterButton } from "./publish-chapter-button";

const blockLabels = {
	permission_not_recorded: "Needs permission to publish",
	licence_ended: "Licence has ended",
};

/** Chapters that have passed proofreading, and what's still in the way of each. */
export function ReadyToPublishList({ canPublish }: { canPublish: boolean }) {
	const { data: chapters } = useSuspenseQuery(readyToPublishQueryOptions());

	return (
		<StaffCard title="Scripture ready to publish">
			{chapters.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Nothing is waiting. Chapters appear here once they pass proofreading.
				</p>
			) : (
				<ul>
					{chapters.map((chapter) => {
						const missing = chapter.versesBlockingPublication;
						const address = {
							abbreviation: chapter.abbreviation,
							chapter: chapter.chapter,
							slug: chapter.slug,
						};
						return (
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
										{chapter.passedVerses}{" "}
										{chapter.passedVerses === 1 ? "verse" : "verses"} passed
										proofreading
										{missing.length > 0
											? `. Still waiting on verse ${formatVerseList(missing)}`
											: ""}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									{chapter.publishingBlock ? (
										<StatusChip tone="attention">
											{blockLabels[chapter.publishingBlock]}
										</StatusChip>
									) : null}
									<Link
										className={staffLinkClassName}
										params={{
											bookSlug: chapter.slug,
											chapter: String(chapter.chapter),
											translation: chapter.abbreviation,
										}}
										to="/work/scripture/proofreading/$translation/$bookSlug/$chapter"
									>
										Open
									</Link>
									{canPublish &&
									!chapter.publishingBlock &&
									missing.length === 0 ? (
										<PublishChapterButton
											address={address}
											bookName={chapter.bookName}
											passedVerses={chapter.passedVerses}
										/>
									) : null}
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</StaffCard>
	);
}
