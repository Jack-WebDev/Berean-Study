import { Tabs } from "@base-ui/react/tabs";
import type { CanonBook, listCanonBooks } from "@berean-study/db/reader";
import {
	type BrowseTestament,
	chapterLabel,
	includedByLabel,
	readerBookGroupAbout,
} from "@berean-study/db/reader-catalogue";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRightIcon, SearchIcon } from "lucide-react";
import { useId, useState } from "react";

import { useChangeReadingPreferences } from "@/components/reader/reading-preferences";
import { ReaderButton } from "@/components/reader-ui/button";
import { ListGroup, ListRow } from "@/components/reader-ui/card";
import { Chip, ChipRow } from "@/components/reader-ui/chip";
import { Notice } from "@/components/reader-ui/notice";
import { ReaderSkeleton } from "@/components/reader-ui/reader-skeleton";
import { ErrorCard } from "@/components/reader-ui/state-card";
import {
	canonBooksQueryOptions,
	continueReadingQueryOptions,
	readingPreferencesQueryOptions,
	recentChaptersQueryOptions,
} from "@/queries/reader";

import { type FindResult, findInBible } from "./find-in-bible";
import { TraditionSheet } from "./tradition-sheet";

/*
 * Browse Scripture (HANDOFF Screen 4): find a book or verse, carry on where you
 * left off, or choose a book. The books, their order, headings and chapter counts
 * all come from the book list of the reader's church tradition.
 */

export function BrowsePage({
	passageNotFound = false,
}: {
	/** An older link pointed at verses that can't be found any more. */
	passageNotFound?: boolean;
}) {
	const books = useQuery(canonBooksQueryOptions());
	const preferences = useQuery(readingPreferencesQueryOptions());

	return (
		<div className="mx-auto w-full max-w-[720px] px-4 pt-6 pb-28 md:pb-12">
			<h1 className="font-serif text-[36px] leading-[1.15] lg:text-[44px]">
				Bible
			</h1>
			{passageNotFound ? (
				<Notice className="mt-4" role="status">
					We couldn't find those verses. Choose a book below, or search for a
					verse.
				</Notice>
			) : null}
			<FindBox books={books.data?.books ?? []} />
			<ContinueReading />
			<section aria-labelledby="books-heading" className="mt-8">
				<h2 className="font-serif text-[26px] leading-tight" id="books-heading">
					Books of the Bible
				</h2>
				{books.isError || preferences.isError ? (
					<ErrorCard
						className="mt-4"
						description="Check that you're connected to the internet, then try again."
						primaryAction={
							<ReaderButton
								onClick={() => {
									void books.refetch();
									void preferences.refetch();
								}}
								variant="primary"
							>
								Try again
							</ReaderButton>
						}
						title="We couldn't load the books"
					/>
				) : !books.data || !preferences.data ? (
					<ReaderSkeleton className="mt-4" label="Opening the books…" />
				) : (
					<BookList
						list={books.data}
						testament={preferences.data.browseTestament}
					/>
				)}
			</section>
		</div>
	);
}

function resultHref(result: FindResult) {
	return result.kind === "book"
		? ({ params: { book: result.bookSlug }, to: "/bible/$book" } as const)
		: ({
				params: { book: result.bookSlug, chapter: result.chapter },
				search: result.verse
					? { from: "search" as const, verse: result.verse }
					: {},
				to: "/bible/$book/$chapter",
			} as const);
}

/** Finds a book or verse as the reader types. Enter opens the first result. */
function FindBox({ books }: { books: readonly CanonBook[] }) {
	const navigate = useNavigate();
	const inputId = useId();
	const resultsId = useId();
	const [query, setQuery] = useState("");
	const results = findInBible(query, books);
	const typed = query.trim();

	return (
		<search className="mt-6 block">
			<label className="mb-2 block font-semibold text-[16px]" htmlFor={inputId}>
				Find a book or verse
			</label>
			<div className="relative">
				<SearchIcon
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-4 size-[22px] -translate-y-1/2 text-muted-foreground"
				/>
				<input
					aria-controls={typed ? resultsId : undefined}
					autoComplete="off"
					className="reader-focus h-14 w-full rounded-[var(--ios-control-radius)] border-[1.5px] border-border-strong bg-card pr-4 pl-12 text-[18px] text-foreground placeholder:text-muted-foreground"
					id={inputId}
					onChange={(event) => setQuery(event.target.value)}
					onKeyDown={(event) => {
						const first = results[0];
						if (event.key === "Enter" && first) {
							event.preventDefault();
							void navigate(resultHref(first));
						}
					}}
					placeholder="For example, John 3:16"
					type="search"
					value={query}
				/>
			</div>
			{typed ? (
				<div
					className="mt-2 overflow-hidden rounded-2xl border border-border bg-card"
					id={resultsId}
				>
					{results.length > 0 ? (
						<ul aria-label="Results" className="divide-y divide-border">
							{results.map((result) => (
								<li key={`${result.kind}-${result.label}`}>
									<Link
										className="reader-focus flex min-h-[60px] items-center gap-3 px-4 py-2 hover:bg-muted"
										{...resultHref(result)}
									>
										<span className="min-w-0 flex-1">
											<span className="block font-serif text-[19px]">
												{result.label}
											</span>
											<span className="mt-0.5 block text-[15px] text-muted-foreground">
												{result.kind === "book"
													? chaptersText(result.chapterCount)
													: result.verse
														? "Go straight to this verse"
														: "Go straight to this chapter"}
											</span>
										</span>
										<ChevronRightIcon
											aria-hidden="true"
											className="size-5 shrink-0 text-muted-foreground"
										/>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p className="p-4 text-[16px] text-muted-foreground leading-normal">
							Nothing matches “{typed}”. Try a book name, like John, or a verse,
							like John 3:16.
						</p>
					)}
				</div>
			) : null}
			{/* Screen readers hear how many results there are as they type. */}
			<p aria-live="polite" className="sr-only">
				{typed
					? results.length === 0
						? "No results"
						: `${results.length} ${results.length === 1 ? "result" : "results"}`
					: ""}
			</p>
		</search>
	);
}

function chaptersText(count: number | null) {
	if (!count) return "Chapters coming soon";
	return `${count} ${count === 1 ? "chapter" : "chapters"}`;
}

/** Continue reading for returning readers; a gentle place to start for new ones. */
function ContinueReading() {
	const place = useQuery(continueReadingQueryOptions());
	const recent = useQuery(recentChaptersQueryOptions());
	if (place.isPending) return null;

	if (!place.data) {
		return (
			<section
				aria-labelledby="start-heading"
				className="mt-6 rounded-2xl bg-reader-notice px-5 py-5 text-reader-notice-foreground"
			>
				<h2 className="font-serif text-[24px] leading-snug" id="start-heading">
					Not sure where to start?
				</h2>
				<p className="mt-2 text-[17px] leading-normal">
					Many people begin with the Gospel of John. It tells the story of Jesus
					in plain, simple words.
				</p>
				<ReaderButton
					className="mt-4 w-full sm:w-auto"
					render={<Link params={{ book: "john" }} to="/bible/$book" />}
					variant="primary"
				>
					Start with John
				</ReaderButton>
			</section>
		);
	}

	const { label, place: at, start, translationName } = place.data;
	const others = (recent.data ?? []).filter(
		(chapter) =>
			chapter.book.slug !== at.bookSlug || chapter.chapter !== at.chapter,
	);
	return (
		<section
			aria-labelledby="continue-heading"
			className="mt-6 rounded-2xl border border-border bg-card px-5 py-5"
		>
			<h2
				className="font-semibold text-[15px] text-muted-foreground"
				id="continue-heading"
			>
				Continue reading
			</h2>
			<p className="mt-1 font-serif text-[28px] leading-tight">{label}</p>
			{start ? (
				<p className="mt-2 font-serif text-[17px] leading-relaxed">“{start}”</p>
			) : null}
			<p className="mt-2 text-[15px] text-muted-foreground">
				Verse {at.verse}
				{translationName ? ` · ${translationName}` : ""}
			</p>
			<ReaderButton
				className="mt-4 w-full sm:w-auto"
				render={
					<Link
						params={{ book: at.bookSlug, chapter: at.chapter }}
						search={{ verse: at.verse }}
						to="/bible/$book/$chapter"
					/>
				}
				variant="primary"
			>
				Carry on reading
			</ReaderButton>
			{others.length > 0 ? (
				<>
					<p className="mt-5 font-semibold text-[15px] text-muted-foreground">
						Also read recently
					</p>
					<ChipRow className="mt-2">
						{others.map((chapter) => (
							<Chip
								key={`${chapter.book.slug}-${chapter.chapter}`}
								render={
									<Link
										params={{
											book: chapter.book.slug,
											chapter: chapter.chapter,
										}}
										to="/bible/$book/$chapter"
									/>
								}
							>
								{chapterLabel(chapter.book.name, chapter.chapter)}
							</Chip>
						))}
					</ChipRow>
				</>
			) : null}
		</section>
	);
}

type BookListData = Awaited<ReturnType<typeof listCanonBooks>>;

/** Groups books under their headings, in the order the list first reaches each. */
function groupBooks(books: readonly CanonBook[]) {
	const groups = new Map<string, CanonBook[]>();
	for (const book of books) {
		groups.set(book.group, [...(groups.get(book.group) ?? []), book]);
	}
	return [...groups];
}

function BookList({
	list,
	testament,
}: {
	list: BookListData;
	testament: BrowseTestament;
}) {
	const changePreferences = useChangeReadingPreferences();
	const [choosingList, setChoosingList] = useState(false);
	const testaments = [
		{ label: "Old Testament", value: "old" },
		{ label: "New Testament", value: "new" },
	] as const;

	return (
		<>
			<div className="mt-1 flex flex-wrap items-center gap-x-1 text-[15px] text-muted-foreground">
				<span>Showing the {list.tradition.name} list.</span>
				<ReaderButton
					aria-haspopup="dialog"
					className="px-1 text-[15px]"
					onClick={() => setChoosingList(true)}
					size="compact"
					variant="link"
				>
					Change
				</ReaderButton>
			</div>
			{list.usingFallbackList ? (
				<Notice className="mt-2">
					The {list.tradition.name} list isn't ready yet, so these are the books
					of the Protestant list.
				</Notice>
			) : null}

			<Tabs.Root
				className="mt-4"
				// Remembered on the account, so Browse opens on the same testament.
				onValueChange={(value) =>
					changePreferences({ browseTestament: value as BrowseTestament })
				}
				value={testament}
			>
				<Tabs.List
					aria-label="Testament"
					className="grid grid-cols-2 gap-1 rounded-[var(--ios-control-radius)] bg-muted p-1"
				>
					{testaments.map((tab) => (
						<Tabs.Tab
							className="reader-focus h-12 rounded-[calc(var(--ios-control-radius)-4px)] font-semibold text-[16px] text-muted-foreground data-[active]:bg-card data-[active]:text-foreground data-[active]:shadow-sm"
							key={tab.value}
							value={tab.value}
						>
							{tab.label}
						</Tabs.Tab>
					))}
				</Tabs.List>
				{testaments.map((tab) => (
					<Tabs.Panel key={tab.value} value={tab.value}>
						{groupBooks(
							list.books.filter((book) => book.testament === tab.value),
						).map(([group, books]) => (
							<section className="mt-6" key={group}>
								<h3 className="font-bold text-[17px]">{group}</h3>
								{readerBookGroupAbout[group] ? (
									<p className="mt-0.5 mb-2 text-[15px] text-muted-foreground">
										{readerBookGroupAbout[group]}
									</p>
								) : (
									<div className="mb-2" />
								)}
								<ListGroup>
									{books.map((book) => (
										<ListRow
											description={bookDescription(book)}
											key={book.slug}
											meta={chaptersText(book.chapterCount)}
											render={
												<Link params={{ book: book.slug }} to="/bible/$book" />
											}
											title={book.name}
										/>
									))}
								</ListGroup>
							</section>
						))}
					</Tabs.Panel>
				))}
			</Tabs.Root>

			<TraditionSheet
				current={list.tradition.slug}
				onChoose={(traditionSlug) => changePreferences({ traditionSlug })}
				onOpenChange={setChoosingList}
				open={choosingList}
				traditions={list.traditions}
			/>
		</>
	);
}

/** Quiet notes under a book's name: which Bibles have it, and if it can be read yet. */
function bookDescription(book: CanonBook) {
	const notes = [
		includedByLabel(book.includedBy),
		book.hasText ? null : "Not available yet",
	].filter(Boolean);
	return notes.length > 0 ? notes.join(" · ") : undefined;
}
