import type { Testimony } from "@berean-study/db/testimonies";
import {
	getDocumentSectionTexts,
	getDocumentVerseReferences,
	getExcerpt,
	hasRichTextContent,
} from "@berean-study/rich-text-editor/document";
import { Button } from "@berean-study/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import { cn } from "@berean-study/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { PencilIcon, QuoteIcon } from "lucide-react";
import { type Ref, useId, useRef, useState } from "react";

import { useFormDraft } from "@/components/form-drafts";
import { createTestimony } from "@/functions/testimonies";
import { invalidatePrayerJournal } from "@/queries/prayer-journal";
import { testimoniesQueryOptions } from "@/queries/testimonies";
import {
	formatFullDate,
	formatHappenedOn,
	fromMonthInput,
} from "@/utils/dates";
import { journalVerses, testimonyStarters } from "./journal-copy";
import { createEmptyTestimonyDraft, testimonyPrompt } from "./journal-drafts";
import { JournalEditor, JournalEntryBody } from "./journal-editor";
import { getPrimaryReference } from "./journal-format";
import {
	buttonLinkClassName,
	cardClassName,
	fieldClassName,
	InlineSelect,
	JournalPage,
	JournalState,
	primaryButtonClassName,
	RetryButton,
	SectionLabel,
	SegmentedControl,
	secondaryButtonClassName,
	Tag,
	VerseCard,
} from "./journal-ui";
import { inlineEditorContentClassName } from "./prayers-tab";
import { QuotedVerse } from "./quoted-verse";
import { useShareTestimony } from "./testimony-sharing";

export type TestimoniesSearch = {
	filter?: "private" | "shared";
	sort?: "happened" | "oldest";
	testimony?: number;
};

const filterOptions = [
	{ label: "All", value: "all" },
	{ label: "Private", value: "private" },
	{ label: "Shared", value: "shared" },
] as const;

export function TestimoniesTab({
	onSearchChange,
	search,
}: {
	onSearchChange: (
		next: TestimoniesSearch,
		options?: { replace?: boolean },
	) => void;
	search: TestimoniesSearch;
}) {
	const testimoniesQuery = useQuery(testimoniesQueryOptions());
	const testimonies = testimoniesQuery.data;
	const featuredRef = useRef<HTMLElement>(null);

	if (testimoniesQuery.isError)
		return (
			<JournalPage tab="testimonies">
				<JournalState
					action={
						<RetryButton onRetry={() => void testimoniesQuery.refetch()} />
					}
				>
					We couldn’t load your testimonies.
				</JournalState>
			</JournalPage>
		);
	if (!testimonies)
		return (
			<JournalPage tab="testimonies">
				<JournalState>Loading testimonies…</JournalState>
			</JournalPage>
		);
	if (testimonies.length === 0)
		return (
			<JournalPage tab="testimonies">
				<TestimoniesEmptyState
					onCreated={(id) =>
						onSearchChange({ testimony: id }, { replace: true })
					}
				/>
			</JournalPage>
		);

	const filter = search.filter ?? "all";
	const sort = search.sort ?? "newest";
	const shown = sortTestimonies(
		testimonies.filter((testimony) =>
			filter === "all"
				? true
				: (filter === "shared") === testimony.sharedToCommunity,
		),
		sort,
	);
	const featured =
		shown.find((testimony) => testimony.id === search.testimony) ?? shown[0];
	const earlier = shown.filter((testimony) => testimony !== featured);

	return (
		<JournalPage
			tab="testimonies"
			tabsToolbar={
				<>
					<SegmentedControl
						label="Filter testimonies"
						onChange={(value) =>
							onSearchChange(
								{
									...search,
									filter: value === "all" ? undefined : value,
									testimony: undefined,
								},
								{ replace: true },
							)
						}
						options={filterOptions}
						value={filter}
					/>
					<InlineSelect
						label="Sort"
						onChange={(value) =>
							onSearchChange(
								{
									...search,
									sort:
										value === "newest"
											? undefined
											: (value as TestimoniesSearch["sort"]),
									testimony: undefined,
								},
								{ replace: true },
							)
						}
						value={sort}
					>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
						<option value="happened">When it happened</option>
					</InlineSelect>
				</>
			}
		>
			{featured ? (
				<>
					<FeaturedTestimony
						isLatest={featured === shown[0] && sort === "newest"}
						ref={featuredRef}
						testimony={featured}
					/>
					{earlier.length ? (
						<section
							aria-labelledby="earlier-testimonies"
							className="flex flex-col gap-3.5"
						>
							<SectionLabel id="earlier-testimonies">
								{sort === "newest" ? "Earlier" : "More testimonies"}
							</SectionLabel>
							<ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
								{earlier.map((testimony) => (
									<li className="min-w-0" key={testimony.id}>
										<TestimonyCard
											onSelect={() => {
												onSearchChange(
													{ ...search, testimony: testimony.id },
													{ replace: true },
												);
												featuredRef.current?.scrollIntoView({
													behavior: "smooth",
													block: "start",
												});
											}}
											testimony={testimony}
										/>
									</li>
								))}
							</ul>
						</section>
					) : null}
				</>
			) : (
				<JournalState>
					{filter === "shared"
						? "You haven’t shared a testimony with your community yet."
						: "Every testimony you’ve written is shared with your community."}
				</JournalState>
			)}
		</JournalPage>
	);
}

function sortTestimonies(testimonies: Testimony[], sort: string) {
	const time = (value: Date | string) => new Date(value).getTime();
	return [...testimonies].sort((left, right) => {
		if (sort === "oldest") return time(left.createdAt) - time(right.createdAt);
		if (sort === "happened")
			return (
				time(right.happenedOn ?? right.createdAt) -
				time(left.happenedOn ?? left.createdAt)
			);
		return time(right.createdAt) - time(left.createdAt);
	});
}

function testimonyDate(testimony: Testimony) {
	return testimony.happenedOn
		? formatHappenedOn(testimony.happenedOn)
		: formatFullDate(testimony.createdAt);
}

function VisibilityTag({ shared }: { shared: boolean }) {
	return (
		<Tag tone={shared ? "navy" : "neutral"}>
			{shared ? "Shared" : "Private"}
		</Tag>
	);
}

function FeaturedTestimony({
	isLatest,
	ref,
	testimony,
}: {
	isLatest: boolean;
	ref: Ref<HTMLElement>;
	testimony: Testimony;
}) {
	const headingId = useId();
	const [reading, setReading] = useState(false);
	const share = useShareTestimony();
	const sections = getDocumentSectionTexts(testimony.content).filter(
		(section) => section.text,
	);
	const verse = getDocumentVerseReferences(testimony.content)[0]?.attributes;

	return (
		<article
			aria-labelledby={headingId}
			className={cn(
				cardClassName,
				"flex scroll-mt-6 flex-wrap overflow-hidden rounded-[22px]",
			)}
			ref={ref}
		>
			<div className="flex min-w-0 flex-[3_1_420px] flex-col gap-4.5 p-6 sm:p-8">
				<div className="flex flex-wrap items-center gap-2.5">
					<span className="font-semibold text-scripture-foreground text-xs uppercase tracking-[0.08em]">
						{isLatest ? "Latest testimony" : "Testimony"}
					</span>
					<span className="text-[13px] text-muted-foreground">
						· {testimonyDate(testimony)}
					</span>
					<VisibilityTag shared={testimony.sharedToCommunity} />
				</div>
				<h2
					className="font-serif text-3xl text-primary leading-[1.12] sm:text-4xl"
					id={headingId}
				>
					{testimony.title}
				</h2>
				{sections.some((section) => section.heading) ? (
					<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
						{sections.slice(0, 3).map((section) => (
							<div className="flex flex-col gap-1.5" key={section.heading}>
								<span className="font-semibold text-muted-foreground text-xs">
									{section.heading.replace(/\?$/, "")}
								</span>
								<p className="line-clamp-5 text-[15px] text-foreground/90 leading-relaxed">
									{section.text}
								</p>
							</div>
						))}
					</div>
				) : (
					<p className="line-clamp-5 text-[15px] text-foreground/90 leading-relaxed">
						{getExcerpt(testimony.content, 600)}
					</p>
				)}
				<div className="flex flex-wrap gap-2.5">
					<Button
						className={primaryButtonClassName}
						onClick={() => setReading(true)}
					>
						Read in full
					</Button>
					{testimony.sharedToCommunity ? (
						<p className="flex h-11 items-center text-muted-foreground text-sm">
							Shared with your community
						</p>
					) : (
						<Button
							className={secondaryButtonClassName}
							disabled={share.isPending}
							onClick={() => share.mutate(testimony)}
							variant="outline"
						>
							Share with community
						</Button>
					)}
				</div>
			</div>
			<figure className="flex min-w-0 flex-[1_1_260px] flex-col justify-center gap-3 bg-scripture p-6 sm:p-8">
				<QuoteIcon
					aria-hidden="true"
					className="size-6 fill-scripture-accent text-scripture-accent"
				/>
				{verse ? (
					<QuotedVerse verse={verse} />
				) : (
					<>
						<blockquote className="font-serif text-foreground/90 text-lg italic leading-[1.45]">
							{journalVerses.testimonies.text}
						</blockquote>
						<figcaption className="font-semibold text-[13px] text-scripture-foreground">
							{journalVerses.testimonies.reference}
						</figcaption>
					</>
				)}
			</figure>
			<Dialog onOpenChange={setReading} open={reading}>
				<DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="font-serif text-2xl text-primary">
							{testimony.title}
						</DialogTitle>
						<DialogDescription>{testimonyDate(testimony)}</DialogDescription>
					</DialogHeader>
					<JournalEntryBody
						ariaLabel="Testimony"
						document={testimony.content}
					/>
					<Link
						className={buttonLinkClassName(
							"outline",
							cn(secondaryButtonClassName, "w-fit"),
						)}
						params={{ testimonyId: testimony.id }}
						to="/library/testimonies/$testimonyId/edit"
					>
						<PencilIcon data-icon="inline-start" />
						Edit testimony
					</Link>
				</DialogContent>
			</Dialog>
		</article>
	);
}

function TestimonyCard({
	onSelect,
	testimony,
}: {
	onSelect: () => void;
	testimony: Testimony;
}) {
	const reference = getPrimaryReference(testimony.content, testimony.passages);
	return (
		<button
			className="flex h-full w-full flex-col gap-2.5 rounded-[18px] border border-border bg-card p-5.5 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-4 focus-visible:ring-primary/15"
			onClick={onSelect}
			type="button"
		>
			<span className="flex items-center justify-between gap-2">
				<span className="text-muted-foreground text-xs">
					{testimonyDate(testimony)}
				</span>
				<VisibilityTag shared={testimony.sharedToCommunity} />
			</span>
			<span className="font-serif text-[22px] text-primary leading-tight">
				{testimony.title}
			</span>
			<span className="line-clamp-3 text-muted-foreground text-sm leading-normal">
				{getExcerpt(testimony.content, 260, { skipHeadings: true })}
			</span>
			{reference ? (
				<span className="mt-auto pt-2 font-semibold text-[13px] text-scripture-foreground">
					{reference}
				</span>
			) : null}
		</button>
	);
}

/** First visit: a guided composer with the three testimony questions. */
function TestimoniesEmptyState({
	onCreated,
}: {
	onCreated: (id: number) => void;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const titleRef = useRef<HTMLInputElement>(null);
	const [draft, setDraft] = useFormDraft(
		"journal.testimony.new",
		createEmptyTestimonyDraft(),
	);
	const [error, setError] = useState<string | null>(null);
	const share = useShareTestimony();
	const save = useMutation({
		mutationFn: () =>
			createTestimony({
				data: {
					content: draft.content,
					happenedOn: fromMonthInput(draft.happenedMonth),
					title: draft.title.trim(),
				},
			}),
		onSuccess: async (testimony) => {
			const shouldShare = draft.share;
			setDraft(createEmptyTestimonyDraft());
			if (shouldShare)
				await share.mutateAsync(testimony).catch(() => undefined);
			await invalidatePrayerJournal(queryClient);
			onCreated(testimony.id);
		},
		onError: () =>
			setError("We couldn’t save your testimony. Please try again."),
	});
	const submit = () => {
		if (!draft.title.trim()) {
			setError("Give your testimony a title.");
			titleRef.current?.focus();
			return;
		}
		if (!hasRichTextContent(draft.content)) {
			setError("Write your story before saving.");
			return;
		}
		setError(null);
		save.mutate();
	};

	return (
		<div className="flex flex-wrap items-start gap-6">
			<section
				aria-labelledby="compose-testimony-heading"
				className={cn(
					cardClassName,
					"flex min-w-0 flex-[2_1_480px] flex-col gap-5 p-6 sm:p-8",
				)}
			>
				<div className="flex flex-col gap-1.5">
					<span className="font-semibold text-scripture-foreground text-xs uppercase tracking-[0.08em]">
						Your first testimony
					</span>
					<h2
						className="font-serif text-[28px] text-primary leading-tight"
						id="compose-testimony-heading"
					>
						Tell of what God has done
					</h2>
					<p className="text-muted-foreground text-sm">
						A testimony is a story worth remembering. Write it in your own
						words.
					</p>
				</div>
				<label className="flex flex-col gap-2 font-semibold text-[13px] text-foreground/80">
					Give it a title
					<input
						className={cn(fieldClassName, "font-normal")}
						maxLength={200}
						onChange={(event) =>
							setDraft((current) => ({ ...current, title: event.target.value }))
						}
						placeholder="e.g. Provision when the car broke down"
						ref={titleRef}
						value={draft.title}
					/>
				</label>
				<div className="flex flex-col gap-2">
					<span className="flex flex-wrap items-baseline justify-between gap-2">
						<span className="font-semibold text-[13px] text-foreground/80">
							Your story
						</span>
					</span>
					<JournalEditor
						ariaLabel="Your story"
						className="rounded-xl!"
						contentClassName={inlineEditorContentClassName}
						onChange={(content) =>
							setDraft((current) => ({ ...current, content }))
						}
						onExpand={() => void navigate({ to: "/library/testimonies/new" })}
						placeholder={testimonyPrompt}
						toolbar="compact"
						value={draft.content}
					/>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-3 border-border/70 border-t pt-5">
					<label className="flex min-h-11 items-center gap-2.5 text-foreground/80 text-sm">
						<input
							checked={draft.share}
							className="size-4.5 accent-primary"
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									share: event.target.checked,
								}))
							}
							type="checkbox"
						/>
						Share with my community
					</label>
					<div className="flex items-center gap-3">
						{error ? (
							<p className="text-destructive text-sm" role="alert">
								{error}
							</p>
						) : null}
						<Button
							className={primaryButtonClassName}
							disabled={save.isPending}
							onClick={submit}
						>
							{save.isPending ? "Saving…" : "Save testimony"}
						</Button>
					</div>
				</div>
			</section>
			<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
				<VerseCard verse={journalVerses.testimonies} />
				<section
					aria-labelledby="testimony-ideas-heading"
					className="flex flex-col gap-3.5 rounded-[20px] bg-secondary p-6"
				>
					<SectionLabel id="testimony-ideas-heading">
						Not sure where to start?
					</SectionLabel>
					<ul className="flex flex-col gap-2">
						{testimonyStarters.map((starter) => (
							<li key={starter}>
								<button
									className="min-h-11 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-foreground/90 text-sm outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
									onClick={() => {
										setDraft((current) => ({ ...current, title: starter }));
										titleRef.current?.focus();
									}}
									type="button"
								>
									{starter}
								</button>
							</li>
						))}
					</ul>
				</section>
			</aside>
		</div>
	);
}
