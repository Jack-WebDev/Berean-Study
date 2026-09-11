import {
	ArrowRight,
	Bookmark,
	BookOpen,
	FileText,
	Highlighter,
} from "lucide-react";

import { LibraryCard } from "./library-card";
import { ScriptureGroup } from "./scripture-group";
import { SectionHeader } from "./section-header";

const recentlyStudied = [
	{ book: "Romans 8", title: "Life in the Spirit", date: "Yesterday" },
	{ book: "Genesis 1", title: "The Creation Account", date: "3 days ago" },
	{ book: "Psalm 23", title: "The Lord Is My Shepherd", date: "5 days ago" },
	{ book: "Matthew 5", title: "Salt and Light", date: "1 week ago" },
];

export function ReturningUserHome() {
	return (
		<div className="px-6 py-10 md:px-10 md:py-12">
			<div className="mx-auto max-w-7xl">
				<ContinueReading />
				<RecentlyStudied />
				<Library />
				<BrowseScripture />
			</div>
		</div>
	);
}

function ContinueReading() {
	return (
		<section>
			<div className="flex items-start justify-between gap-6">
				<div>
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.16em]">
						Good evening,
					</p>
					<h1 className="mt-2 font-serif text-4xl text-foreground tracking-[-0.025em] md:text-5xl">
						Continue Reading
					</h1>
				</div>

				<blockquote className="hidden max-w-[280px] text-right lg:block">
					<p className="font-serif text-muted-foreground italic leading-6">
						Your word is a lamp to my feet
						<br />
						and a light to my path.
					</p>
					<footer className="mt-2 text-muted-foreground/70 text-xs">
						Psalm 119:105
					</footer>
				</blockquote>
			</div>

			<div className="relative mt-6 overflow-hidden rounded-[24px] bg-primary text-primary-foreground">
				<img
					src="https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1800&q=90"
					alt=""
					className="absolute inset-0 size-full object-cover"
				/>
				<div className="absolute inset-0 bg-linear-to-r from-primary via-primary/95 to-primary/15" />

				<div className="relative min-h-[330px] max-w-xl px-7 py-8 md:px-10 md:py-9">
					<p className="font-semibold text-primary-foreground/65 text-xs uppercase tracking-[0.18em]">
						John
					</p>
					<h2 className="mt-2 font-serif text-4xl">Chapter 3</h2>
					<p className="mt-1 font-serif text-primary-foreground/90 text-xl">
						Jesus and Nicodemus
					</p>
					<p className="mt-4 text-primary-foreground/65 text-sm">
						You were reading John 3:16
					</p>
					<p className="mt-4 max-w-md text-primary-foreground/90 leading-7">
						“For God so loved the world, that he gave his only Son, that whoever
						believes in him should not perish but have eternal life.”
					</p>
					<a
						href="/bible/john/3"
						className="mt-7 inline-flex items-center gap-3 rounded-xl bg-background px-5 py-3 font-medium text-foreground text-sm transition hover:bg-muted"
					>
						Continue Reading
						<ArrowRight className="size-4" />
					</a>
				</div>
			</div>
		</section>
	);
}

function RecentlyStudied() {
	return (
		<section className="mt-10">
			<SectionHeader title="Recently Studied" href="/history" />
			<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{recentlyStudied.map((item) => (
					<a
						key={item.book}
						href="/bible"
						className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
					>
						<div className="flex gap-3">
							<div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
								<BookOpen
									className="size-4 text-muted-foreground"
									strokeWidth={1.7}
								/>
							</div>
							<div>
								<h3 className="font-semibold text-sm">{item.book}</h3>
								<p className="mt-1 text-muted-foreground text-sm">
									{item.title}
								</p>
							</div>
						</div>
						<p className="mt-6 text-muted-foreground/70 text-xs">{item.date}</p>
					</a>
				))}
			</div>
		</section>
	);
}

function Library() {
	return (
		<section className="mt-10">
			<SectionHeader title="Your Library" href="/library" />
			<div className="mt-4 grid gap-4 md:grid-cols-3">
				<LibraryCard
					href="/library/notes"
					icon={<FileText className="size-5" />}
					label="Notes"
					count="128"
					description="Your observations and study notes"
				/>
				<LibraryCard
					href="/library/highlights"
					icon={<Highlighter className="size-5" />}
					label="Highlights"
					count="342"
					description="Passages you've marked"
				/>
				<LibraryCard
					href="/library/bookmarks"
					icon={<Bookmark className="size-5" />}
					label="Bookmarks"
					count="67"
					description="Saved passages"
				/>
			</div>
		</section>
	);
}

function BrowseScripture() {
	return (
		<section className="mt-10 pb-10">
			<SectionHeader
				title="Browse Scripture"
				href="/bible"
				label="View All Books"
			/>
			<div className="mt-4 grid gap-4 lg:grid-cols-2">
				<ScriptureGroup
					title="Old Testament"
					books={["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"]}
				/>
				<ScriptureGroup
					title="New Testament"
					books={["Matthew", "Mark", "Luke", "John", "Acts"]}
				/>
			</div>
		</section>
	);
}
