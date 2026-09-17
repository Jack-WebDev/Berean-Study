import { Separator } from "@berean-study/ui/components/separator";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	BookmarkIcon,
	BookOpenIcon,
	FileTextIcon,
	FolderIcon,
	HeartIcon,
	LibraryIcon,
} from "lucide-react";

const recentPassages = [
	{ reference: "John 15", detail: "Abide in me" },
	{ reference: "Psalm 23", detail: "The Lord is my shepherd" },
	{ reference: "Romans 8", detail: "Life in the Spirit" },
] as const;

const libraryDestinations = [
	{
		description: "Your personal observations and study notes.",
		icon: FileTextIcon,
		label: "Notes",
		to: "/library/notes",
	},
	{
		description: "Groups of material gathered for deeper study.",
		icon: FolderIcon,
		label: "Collections",
		to: "/library/collections",
	},
	{
		description: "Highlights and bookmarks you want to return to.",
		icon: BookmarkIcon,
		label: "Saved",
		to: "/library/saved",
	},
	{
		description: "Personal records of prayer and God’s faithfulness.",
		icon: HeartIcon,
		label: "Prayers & Testimonies",
		to: "/library/prayers",
	},
] as const;

const recentlyStudied = [
	{ label: "The vine and the branches", reference: "John 15:1–17" },
	{ label: "A prayer for guidance", reference: "Psalm 25" },
	{ label: "Freedom in Christ", reference: "Romans 8:1–17" },
] as const;

export function LibraryPage() {
	return (
		<div className="min-h-full px-5 py-8 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-5xl flex-col gap-12">
				<header>
					<h1 className="font-serif text-3xl tracking-[-0.02em] sm:text-4xl">
						Library
					</h1>
					<p className="mt-2 max-w-2xl text-muted-foreground">
						Your saved studies, notes, prayers, and reading activity.
					</p>
				</header>

				<ContinueReading />
				<RecentPassages />
				<LibraryDestinations />
				<RecentlyStudied />
			</main>
		</div>
	);
}

function ContinueReading() {
	return (
		<section aria-labelledby="continue-reading-heading" className="max-w-3xl">
			<h2
				className="font-serif text-2xl tracking-[-0.015em]"
				id="continue-reading-heading"
			>
				Continue Reading
			</h2>
			<Link
				className="mt-4 flex items-center gap-4 border-border border-y py-5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				to="/bible"
			>
				<BookOpenIcon
					aria-hidden="true"
					className="size-5 text-muted-foreground"
				/>
				<span className="min-w-0 flex-1">
					<span className="block font-serif text-xl">John 15</span>
					<span className="mt-1 block text-muted-foreground text-sm">
						The vine and the branches
					</span>
				</span>
				<ArrowRightIcon
					aria-hidden="true"
					className="size-4 text-muted-foreground"
				/>
			</Link>
		</section>
	);
}

function RecentPassages() {
	return (
		<section aria-labelledby="recent-heading" className="max-w-3xl">
			<h2
				className="font-serif text-2xl tracking-[-0.015em]"
				id="recent-heading"
			>
				Recent
			</h2>
			<div className="mt-4">
				{recentPassages.map((passage, index) => (
					<div key={passage.reference}>
						{index > 0 ? <Separator /> : null}
						<Link
							className="flex items-center gap-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							to="/bible"
						>
							<BookOpenIcon
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
							<span className="min-w-0 flex-1">
								<span className="block font-medium text-sm">
									{passage.reference}
								</span>
								<span className="mt-0.5 block truncate text-muted-foreground text-sm">
									{passage.detail}
								</span>
							</span>
							<ArrowRightIcon
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
						</Link>
					</div>
				))}
			</div>
		</section>
	);
}

function LibraryDestinations() {
	return (
		<section aria-labelledby="your-library-heading">
			<div className="flex items-center gap-3">
				<LibraryIcon
					aria-hidden="true"
					className="size-5 text-muted-foreground"
				/>
				<h2
					className="font-serif text-2xl tracking-[-0.015em]"
					id="your-library-heading"
				>
					Your Library
				</h2>
			</div>
			<div className="mt-4 grid border-border border-y sm:grid-cols-2 sm:divide-x">
				{libraryDestinations.map((destination, index) => {
					const Icon = destination.icon;

					return (
						<Link
							className={cn(
								"group flex items-start gap-3 border-border py-5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5",
								index === 1 && "border-t sm:border-t-0",
								index >= 2 && "border-t",
							)}
							key={destination.to}
							to={destination.to}
						>
							<Icon
								aria-hidden="true"
								className="mt-0.5 size-4 shrink-0 text-muted-foreground"
							/>
							<span className="min-w-0 flex-1">
								<span className="block font-medium text-sm">
									{destination.label}
								</span>
								<span className="mt-1 block text-muted-foreground text-sm leading-5">
									{destination.description}
								</span>
							</span>
							<ArrowRightIcon
								aria-hidden="true"
								className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
							/>
						</Link>
					);
				})}
			</div>
		</section>
	);
}

function RecentlyStudied() {
	return (
		<section aria-labelledby="recently-studied-heading" className="max-w-3xl">
			<h2
				className="font-serif text-2xl tracking-[-0.015em]"
				id="recently-studied-heading"
			>
				Recently Studied
			</h2>
			<div className="mt-4">
				{recentlyStudied.map((study, index) => (
					<div key={study.reference}>
						{index > 0 ? <Separator /> : null}
						<Link
							className="flex items-center gap-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							to="/bible"
						>
							<span className="min-w-0 flex-1">
								<span className="block font-medium text-sm">{study.label}</span>
								<span className="mt-0.5 block text-muted-foreground text-sm">
									{study.reference}
								</span>
							</span>
							<ArrowRightIcon
								aria-hidden="true"
								className="size-4 text-muted-foreground"
							/>
						</Link>
					</div>
				))}
			</div>
		</section>
	);
}
