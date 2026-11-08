import type { AboutBook, ReaderPlace } from "@berean-study/db/reader-books";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Sources, useOpenSource } from "@/components/reader/study-panel";
import { StudyWriting } from "@/components/reader/study-writing";
import { BackLink } from "@/components/reader-ui/back-link";
import { ReaderButton } from "@/components/reader-ui/button";
import { ReaderSkeleton } from "@/components/reader-ui/reader-skeleton";
import { EmptyState, ErrorCard } from "@/components/reader-ui/state-card";
import { TrustLine } from "@/components/reader-ui/trust-line";
import { aboutBookQueryOptions } from "@/queries/reader";

/*
 * About this book (HANDOFF Screen 6): who wrote it, when, where from and for
 * whom; a key verse; themes; how it's laid out; and an introduction. It joins the
 * book overview and the book introduction staff write, and leaves out any part
 * that has nothing in it.
 */

function Page({
	bookName,
	bookSlug,
	children,
}: {
	bookName: string | null;
	bookSlug: string;
	children: ReactNode;
}) {
	return (
		<div className="mx-auto w-full max-w-[720px] px-4 pt-2 pb-28 md:pb-12">
			<BackLink render={<Link params={{ book: bookSlug }} to="/bible/$book" />}>
				{bookName ?? "Back"}
			</BackLink>
			{children}
		</div>
	);
}

function SectionHeading({ children, id }: { children: ReactNode; id: string }) {
	return (
		<h2 className="mt-7 mb-2 font-bold text-[20px]" id={id}>
			{children}
		</h2>
	);
}

/** A link to a place in the book, for the key verse and the outline. */
function placeLink(bookSlug: string, place: ReaderPlace) {
	return (
		<Link
			params={{ book: bookSlug, chapter: place.chapter }}
			search={place.verse ? { verse: place.verse } : {}}
			to="/bible/$book/$chapter"
		/>
	);
}

export function AboutBookPage({ bookSlug }: { bookSlug: string }) {
	const about = useQuery(aboutBookQueryOptions(bookSlug));

	if (about.isError) {
		return (
			<Page bookName={null} bookSlug={bookSlug}>
				<ErrorCard
					className="mt-4"
					description="Check that you're connected to the internet, then try again."
					primaryAction={
						<ReaderButton
							onClick={() => void about.refetch()}
							variant="primary"
						>
							Try again
						</ReaderButton>
					}
					title="We couldn't open this page"
				/>
			</Page>
		);
	}
	if (about.isPending) {
		return (
			<Page bookName={null} bookSlug={bookSlug}>
				<ReaderSkeleton className="mt-4" label="Opening About this book…" />
			</Page>
		);
	}
	if (!about.data) {
		return (
			<Page bookName={null} bookSlug={bookSlug}>
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

	return <AboutContent about={about.data} />;
}

function AboutContent({ about }: { about: AboutBook }) {
	const { book, details, introduction, keyVerse, outline, summary, themes } =
		about;
	const sources = useOpenSource();
	const startReading = (
		<ReaderButton
			className="mt-8 w-full sm:w-auto"
			render={
				<Link
					params={{ book: book.slug, chapter: 1 }}
					to="/bible/$book/$chapter"
				/>
			}
			variant="primary"
		>
			Start reading {book.name}
		</ReaderButton>
	);
	const isEmpty =
		!summary &&
		details.length === 0 &&
		!keyVerse &&
		themes.length === 0 &&
		outline.length === 0 &&
		!introduction;

	return (
		<Page bookName={book.name} bookSlug={book.slug}>
			<p className="mt-2 font-semibold text-[15px] text-muted-foreground">
				About this book
			</p>
			<h1 className="mt-1 font-serif text-[38px] leading-[1.1] md:text-[42px]">
				{book.name}
			</h1>

			{isEmpty ? (
				<EmptyState
					className="mt-6"
					description="We're adding these over time."
					primaryAction={startReading}
					title={`We haven't written about ${book.name} yet`}
				/>
			) : (
				<>
					{summary ? (
						<p className="mt-3 font-serif text-[19px] leading-relaxed">
							{summary}
						</p>
					) : null}

					{details.length > 0 ? (
						<dl className="mt-5 grid grid-cols-2 gap-2.5">
							{details.map((detail) => (
								<div
									className="rounded-xl border border-border bg-card px-4 py-3"
									key={detail.label}
								>
									<dt className="font-bold text-[14px] text-muted-foreground">
										{detail.label}
									</dt>
									<dd className="mt-1 text-[17px] leading-snug">
										{detail.value}
									</dd>
								</div>
							))}
						</dl>
					) : null}

					{keyVerse ? (
						<section aria-labelledby="key-verse">
							<SectionHeading id="key-verse">Key verse</SectionHeading>
							<figure className="rounded-xl bg-reader-notice px-4 py-4 text-reader-notice-foreground">
								{keyVerse.text ? (
									<blockquote className="font-serif text-[18px] leading-[1.65]">
										{keyVerse.text}
									</blockquote>
								) : null}
								<figcaption
									className={
										keyVerse.text
											? "mt-2 font-semibold text-[15px]"
											: "font-semibold text-[17px]"
									}
								>
									{keyVerse.place ? (
										<ReaderButton
											className="h-auto min-h-12 justify-start px-0 text-inherit"
											render={placeLink(book.slug, keyVerse.place)}
											size="compact"
											variant="link"
										>
											{keyVerse.label}
											{keyVerse.text && keyVerse.translationAbbreviation
												? ` · ${keyVerse.translationAbbreviation}`
												: ""}
										</ReaderButton>
									) : (
										keyVerse.label
									)}
								</figcaption>
								{keyVerse.text ? null : (
									<p className="text-[15px]">
										Its words will show here once that chapter is ready to read.
									</p>
								)}
							</figure>
						</section>
					) : null}

					{themes.length > 0 ? (
						<section aria-labelledby="key-themes">
							<SectionHeading id="key-themes">Key themes</SectionHeading>
							<ul className="flex flex-wrap gap-2">
								{themes.map((theme) => (
									<li
										className="inline-flex min-h-10 items-center rounded-full border-[1.5px] border-border-strong bg-card px-4 font-semibold text-[16px]"
										key={theme}
									>
										{theme}
									</li>
								))}
							</ul>
						</section>
					) : null}

					{outline.length > 0 ? (
						<section aria-labelledby="layout">
							<SectionHeading id="layout">
								How the book is laid out
							</SectionHeading>
							<ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
								{outline.map((part) => {
									const content = (
										<>
											<span className="w-[92px] shrink-0 font-bold text-[15px] text-verse-number">
												{part.range}
											</span>
											<span className="text-[17px] leading-snug">
												{part.heading}
											</span>
										</>
									);
									return (
										<li key={`${part.range}-${part.heading}`}>
											{part.place ? (
												<Link
													className="reader-focus flex min-h-12 items-baseline gap-3.5 px-4 py-3 hover:bg-muted"
													params={{
														book: book.slug,
														chapter: part.place.chapter,
													}}
													search={
														part.place.verse ? { verse: part.place.verse } : {}
													}
													to="/bible/$book/$chapter"
												>
													{content}
												</Link>
											) : (
												<div className="flex items-baseline gap-3.5 px-4 py-3">
													{content}
												</div>
											)}
										</li>
									);
								})}
							</ol>
						</section>
					) : null}

					{introduction ? (
						<section aria-labelledby="introduction">
							<SectionHeading id="introduction">Introduction</SectionHeading>
							<div className="flex flex-col gap-5">
								{introduction.sections.map((section) => (
									<section key={section.key}>
										{introduction.sections.length > 1 && section.title ? (
											<h3 className="mb-1 font-bold text-[17px]">
												{section.title}
											</h3>
										) : null}
										<StudyWriting
											onCitation={sources.toggle}
											openSource={sources.openSource}
											sourceIdPrefix={sources.idPrefix}
											writing={section.writing}
										/>
									</section>
								))}
							</div>
							<Sources
								idPrefix={sources.idPrefix}
								onToggle={sources.toggle}
								openSource={sources.openSource}
								sources={introduction.sources}
							/>
						</section>
					) : null}

					<TrustLine
						className="mt-5"
						sourceCount={
							new Set(introduction?.sources.map((source) => source.title)).size
						}
					/>
					{startReading}
				</>
			)}
		</Page>
	);
}
