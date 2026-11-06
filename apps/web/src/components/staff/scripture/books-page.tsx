import { bookGroups } from "@berean-study/db/scripture-catalogue";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { scriptureBooksQueryOptions } from "@/queries/scripture-data";

import { StaffPage } from "../staff-page";
import { chapterProgressLabel, verseCountLabel } from "./scripture-access";

/** Every book in the catalogue, grouped the way the Bible is usually divided. */
export function BooksPage() {
	const { data: books } = useSuspenseQuery(scriptureBooksQueryOptions());

	return (
		<StaffPage
			description="The books the Bible is built from. Chapters and verses appear here as your team enters them."
			section="Management"
			title="Scripture data"
		>
			<div className="space-y-8">
				{bookGroups.map((group) => {
					const inGroup = books.filter((book) => book.group === group);
					if (inGroup.length === 0) return null;
					return (
						<section aria-labelledby={`group-${group}`} key={group}>
							<h2
								className="font-serif text-xl tracking-[-0.01em]"
								id={`group-${group}`}
							>
								{group}
							</h2>
							<ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
								{inGroup.map((book) => (
									<li key={book.id}>
										<Link
											className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											params={{ bookSlug: book.slug }}
											to="/admin/scripture/$bookSlug"
										>
											<span className="block font-medium text-sm">
												{book.name}
											</span>
											<span className="mt-1 block text-muted-foreground text-xs">
												{chapterProgressLabel(
													book.chapters,
													book.expectedChapters,
												)}
												, {verseCountLabel(book.verses)}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</section>
					);
				})}
			</div>
		</StaffPage>
	);
}
