import { chapterLabel } from "@berean-study/db/reader-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { BottomSheet } from "@/components/reader-ui/bottom-sheet";
import { readerButtonClass } from "@/components/reader-ui/button";
import { Chip, ChipRow } from "@/components/reader-ui/chip";
import { recentChaptersQueryOptions } from "@/queries/reader";

/**
 * The chapter picker (HANDOFF Screen 1), opened from the chapter title. Chapters
 * not published yet are still listed and still open, where the reading page
 * explains they're coming.
 */
export function ChapterSheet({
	bookName,
	bookSlug,
	chapter,
	chapterCount,
	onOpenChange,
	open,
}: {
	bookName: string;
	bookSlug: string;
	chapter: number;
	chapterCount: number;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const recent = useQuery({ ...recentChaptersQueryOptions(), enabled: open });
	const close = () => onOpenChange(false);

	return (
		<BottomSheet
			kind="tall"
			onOpenChange={onOpenChange}
			open={open}
			title={bookName}
		>
			{recent.data && recent.data.length > 0 ? (
				<section aria-labelledby="chapters-recent" className="mb-6">
					<h3 className="mb-2 font-bold text-[18px]" id="chapters-recent">
						Read recently
					</h3>
					<ChipRow>
						{recent.data.map((place) => (
							<Chip
								key={`${place.book.slug}-${place.chapter}`}
								render={
									<Link
										onClick={close}
										params={{ book: place.book.slug, chapter: place.chapter }}
										to="/bible/$book/$chapter"
									/>
								}
							>
								{place.label}
							</Chip>
						))}
					</ChipRow>
				</section>
			) : null}

			<section aria-labelledby="chapters-all">
				<h3 className="mb-2 font-bold text-[18px]" id="chapters-all">
					Chapters in {bookName}
				</h3>
				<ol className="grid grid-cols-5 gap-2">
					{Array.from({ length: chapterCount }, (_, index) => index + 1).map(
						(number) => {
							const current = number === chapter;
							return (
								<li key={number}>
									<Link
										aria-current={current ? "page" : undefined}
										aria-label={chapterLabel(bookName, number)}
										className={cn(
											"reader-focus flex h-14 items-center justify-center rounded-[10px] border-[1.5px] font-semibold text-[17px]",
											current
												? "border-primary bg-primary text-primary-foreground"
												: "border-border-strong bg-card text-foreground hover:bg-muted",
										)}
										onClick={close}
										params={{ book: bookSlug, chapter: number }}
										to="/bible/$book/$chapter"
									>
										{number}
									</Link>
								</li>
							);
						},
					)}
				</ol>
			</section>

			<div className="mt-4 border-border border-t pt-2">
				<Link
					className={readerButtonClass({ variant: "link" })}
					onClick={close}
					to="/bible"
				>
					Choose a different book
				</Link>
			</div>
		</BottomSheet>
	);
}
