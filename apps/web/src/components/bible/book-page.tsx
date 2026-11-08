import { chapterLabel } from "@berean-study/db/reader-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, InfoIcon } from "lucide-react";
import type { ReactNode } from "react";

import { BackLink } from "@/components/reader-ui/back-link";
import { ReaderButton } from "@/components/reader-ui/button";
import { ReaderSkeleton } from "@/components/reader-ui/reader-skeleton";
import { EmptyState, ErrorCard } from "@/components/reader-ui/state-card";
import { bookPageQueryOptions } from "@/queries/reader";

/*
 * Choose a chapter (HANDOFF Screen 5): the book, a sentence about it, a way into
 * About this book, and every chapter. Chapters that can't be read yet are still
 * listed and still open, where the reading page explains they're coming.
 */

function Page({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto w-full max-w-[720px] px-4 pt-2 pb-28 md:pb-12">
			<BackLink render={<Link to="/bible" />}>Books</BackLink>
			{children}
		</div>
	);
}

const testamentNames = { new: "New Testament", old: "Old Testament" } as const;

export function BookPage({ bookSlug }: { bookSlug: string }) {
	const page = useQuery(bookPageQueryOptions(bookSlug));

	if (page.isError) {
		return (
			<Page>
				<ErrorCard
					className="mt-4"
					description="Check that you're connected to the internet, then try again."
					primaryAction={
						<ReaderButton onClick={() => void page.refetch()} variant="primary">
							Try again
						</ReaderButton>
					}
					title="We couldn't open this book"
				/>
			</Page>
		);
	}
	if (page.isPending) {
		return (
			<Page>
				<ReaderSkeleton className="mt-4" label="Opening the book…" />
			</Page>
		);
	}
	if (!page.data) {
		return (
			<Page>
				<EmptyState
					className="mt-4"
					description="Check the name, or choose a book from the list."
					primaryAction={
						<ReaderButton render={<Link to="/bible" />} variant="primary">
							Choose a book
						</ReaderButton>
					}
					title="We can't find that book"
				/>
			</Page>
		);
	}

	const { availableChapters, book, chapterCount, hasAbout, lastRead, summary } =
		page.data;
	const ready = new Set(availableChapters);
	const someMissing = ready.size < chapterCount;

	return (
		<Page>
			<p className="mt-2 font-semibold text-[15px] text-muted-foreground">
				{testamentNames[book.testament]} · {book.group}
			</p>
			<h1 className="mt-1 font-serif text-[38px] leading-[1.1] md:text-[42px]">
				{book.name}
			</h1>
			{summary ? (
				<p className="mt-3 text-[18px] text-foreground leading-relaxed">
					{summary}
				</p>
			) : null}
			{hasAbout ? (
				<Link
					className="reader-focus mt-5 flex min-h-[60px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 hover:bg-muted"
					params={{ book: book.slug }}
					to="/bible/$book/about"
				>
					<InfoIcon aria-hidden="true" className="size-[22px] shrink-0" />
					<span className="min-w-0 flex-1">
						<span className="block font-bold text-[17px]">About this book</span>
						<span className="block text-[15px] text-muted-foreground">
							Who wrote it, when, and why
						</span>
					</span>
					<ChevronRightIcon
						aria-hidden="true"
						className="size-5 shrink-0 text-muted-foreground"
					/>
				</Link>
			) : null}

			<section aria-labelledby="chapters-heading">
				<h2 className="mt-7 mb-1 font-bold text-[20px]" id="chapters-heading">
					Choose a chapter
				</h2>
				<p className="mb-3 text-[15px] text-muted-foreground leading-normal">
					{chapterSentence(book.name, chapterCount, lastRead)}
					{someMissing
						? ready.size === 0
							? ` None of ${book.name} can be read yet. We're adding the Bible one chapter at a time.`
							: " Chapters with a dashed edge can't be read yet."
						: ""}
				</p>
				<ol className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
					{Array.from({ length: chapterCount }, (_, index) => index + 1).map(
						(number) => {
							const isLast = number === lastRead;
							const isReady = ready.has(number);
							const label = chapterLabel(book.name, number);
							return (
								<li key={number}>
									<Link
										aria-label={`${label}${isLast ? ", last read" : ""}${isReady ? "" : ", not available yet"}`}
										className={cn(
											"reader-focus flex h-[72px] flex-col items-center justify-center rounded-[10px] border-[1.5px] font-bold text-[22px] leading-none",
											isLast
												? "border-primary bg-primary text-primary-foreground"
												: isReady
													? "border-border-strong bg-card text-foreground hover:bg-muted"
													: "border-border-strong border-dashed bg-transparent text-muted-foreground hover:bg-muted",
										)}
										params={{ book: book.slug, chapter: number }}
										to="/bible/$book/$chapter"
									>
										{number}
										{isLast ? (
											<span
												aria-hidden="true"
												className="mt-1 font-semibold text-[12px]"
											>
												Last read
											</span>
										) : null}
									</Link>
								</li>
							);
						},
					)}
				</ol>
			</section>
		</Page>
	);
}

/** "John has 21 chapters. You were last reading chapter 3." */
function chapterSentence(
	bookName: string,
	count: number,
	lastRead: number | null,
) {
	const has = `${bookName} has ${count} ${count === 1 ? "chapter" : "chapters"}.`;
	return lastRead ? `${has} You were last reading chapter ${lastRead}.` : has;
}
