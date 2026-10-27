import type { PrayerSummary } from "@berean-study/db/prayers";
import {
	getExcerpt,
	hasRichTextContent,
} from "@berean-study/rich-text-editor/document";
import { Button } from "@berean-study/ui/components/button";
import { cn } from "@berean-study/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { UserRoundIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useFormDraft } from "@/components/form-drafts";
import { createPrayer } from "@/functions/prayers";
import { invalidatePrayerJournal } from "@/queries/prayer-journal";
import { prayersQueryOptions } from "@/queries/prayers";
import { formatRelativeDay } from "@/utils/dates";
import { journalVerses } from "./journal-copy";
import { emptyPrayerDraft } from "./journal-drafts";
import { JournalEditor } from "./journal-editor";
import { getPrimaryReference } from "./journal-format";
import {
	CategoryTag,
	cardClassName,
	fieldClassName,
	JournalPage,
	JournalState,
	primaryButtonClassName,
	RetryButton,
	SectionLabel,
	SegmentedControl,
	VerseCard,
} from "./journal-ui";
import { PrayerDetail } from "./prayer-detail";
import { CategoryChips, PrayingForField, toPrayerInput } from "./prayer-fields";

export type PrayersSearch = {
	filter?: "mine" | "others";
	prayer?: number;
};

const filterOptions = [
	{ label: "All", value: "all" },
	{ label: "For me", value: "mine" },
	{ label: "For others", value: "others" },
] as const;

export function PrayersTab({
	onSearchChange,
	search,
}: {
	onSearchChange: (
		next: PrayersSearch,
		options?: { replace?: boolean },
	) => void;
	search: PrayersSearch;
}) {
	const prayersQuery = useQuery(prayersQueryOptions());
	const prayers = prayersQuery.data;

	if (prayersQuery.isError)
		return (
			<JournalPage tab="prayers">
				<JournalState
					action={<RetryButton onRetry={() => void prayersQuery.refetch()} />}
				>
					We couldn’t load your prayers.
				</JournalState>
			</JournalPage>
		);
	if (!prayers)
		return (
			<JournalPage tab="prayers">
				<JournalState>Loading prayers…</JournalState>
			</JournalPage>
		);
	if (prayers.length === 0)
		return (
			<JournalPage tab="prayers">
				<PrayersEmptyState
					onCreated={(id) => onSearchChange({ prayer: id }, { replace: true })}
				/>
			</JournalPage>
		);

	const filter = search.filter ?? "all";
	const shown = prayers.filter((prayer) =>
		filter === "mine"
			? !prayer.prayingFor
			: filter === "others"
				? Boolean(prayer.prayingFor)
				: true,
	);
	const selected =
		shown.find((prayer) => prayer.id === search.prayer) ?? shown[0] ?? null;

	return (
		<JournalPage
			beforeTabs={
				<div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
					<div className="flex flex-col gap-0.5 rounded-[14px] border border-border bg-card px-4.5 py-4">
						<span className="text-[13px] text-muted-foreground">
							Praying for
						</span>
						<span className="font-serif text-3xl text-primary">
							{prayers.length}
						</span>
					</div>
					<VerseCard variant="quiet" verse={journalVerses.keepPraying} />
				</div>
			}
			tab="prayers"
			tabsToolbar={
				<SegmentedControl
					label="Filter prayers"
					onChange={(value) =>
						onSearchChange(
							{
								...search,
								filter: value === "all" ? undefined : value,
								prayer: undefined,
							},
							{ replace: true },
						)
					}
					options={filterOptions}
					value={filter}
				/>
			}
		>
			{shown.length === 0 ? (
				<JournalState>
					{filter === "mine"
						? "No prayers for yourself yet."
						: "No prayers for others yet. Add a name under “Praying for” to see them here."}
				</JournalState>
			) : (
				<PrayerListAndDetail
					onSelect={(id) =>
						onSearchChange({ ...search, prayer: id }, { replace: true })
					}
					prayers={shown}
					selected={selected}
				/>
			)}
		</JournalPage>
	);
}

function PrayerListAndDetail({
	onSelect,
	prayers,
	selected,
}: {
	onSelect: (id: number) => void;
	prayers: PrayerSummary[];
	selected: PrayerSummary | null;
}) {
	const detailRef = useRef<HTMLElement>(null);
	const [scrollRequest, setScrollRequest] = useState(0);
	// On narrow screens the detail sits below the list, so bring it into view.
	useEffect(() => {
		if (!scrollRequest) return;
		if (window.matchMedia?.("(max-width: 860px)").matches)
			detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [scrollRequest]);

	return (
		<div className="flex flex-wrap items-start gap-6">
			<ul
				aria-label="Prayers"
				className="flex min-w-0 flex-[1_1_340px] flex-col gap-2.5"
			>
				{prayers.map((prayer) => (
					<li key={prayer.id}>
						<PrayerCard
							onSelect={() => {
								onSelect(prayer.id);
								setScrollRequest((count) => count + 1);
							}}
							prayer={prayer}
							selected={prayer.id === selected?.id}
						/>
					</li>
				))}
			</ul>
			{selected ? <PrayerDetail prayer={selected} ref={detailRef} /> : null}
		</div>
	);
}

function PrayerCard({
	onSelect,
	prayer,
	selected,
}: {
	onSelect: () => void;
	prayer: PrayerSummary;
	selected: boolean;
}) {
	const reference = getPrimaryReference(prayer.content, prayer.passages);
	return (
		<button
			aria-current={selected ? "true" : undefined}
			className={cn(
				"flex w-full flex-col gap-2 rounded-2xl border bg-card px-5 py-4.5 text-left outline-none transition-[border-color,box-shadow] focus-visible:ring-4 focus-visible:ring-primary/15",
				selected
					? "border-primary ring-[3px] ring-primary/12"
					: "border-border hover:border-primary/40",
			)}
			onClick={onSelect}
			type="button"
		>
			<span className="flex items-center justify-between gap-2">
				{prayer.category ? (
					<CategoryTag category={prayer.category} />
				) : (
					<span />
				)}
				<span className="text-muted-foreground text-xs">
					{formatRelativeDay(prayer.createdAt)}
				</span>
			</span>
			<span className="font-semibold text-base text-foreground">
				{prayer.title}
			</span>
			<span className="line-clamp-2 text-muted-foreground text-sm leading-normal">
				{getExcerpt(prayer.content, 220)}
			</span>
			{reference || prayer.prayingFor ? (
				<span className="flex flex-wrap gap-3.5 text-muted-foreground text-xs">
					{prayer.prayingFor ? <span>For {prayer.prayingFor}</span> : null}
					{reference ? <span>{reference}</span> : null}
				</span>
			) : null}
		</button>
	);
}

/** First visit: write a prayer right here, beside how the journal works. */
function PrayersEmptyState({ onCreated }: { onCreated: (id: number) => void }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [draft, setDraft] = useFormDraft(
		"journal.prayer.new",
		emptyPrayerDraft,
	);
	const [showPrayingFor, setShowPrayingFor] = useState(
		Boolean(draft.prayingFor),
	);
	const [error, setError] = useState<string | null>(null);
	const save = useMutation({
		mutationFn: () => createPrayer({ data: toPrayerInput(draft) }),
		onSuccess: async (prayer) => {
			setDraft(emptyPrayerDraft);
			await invalidatePrayerJournal(queryClient);
			onCreated(prayer.id);
		},
		onError: () => setError("We couldn’t save your prayer. Please try again."),
	});
	const submit = () => {
		if (!draft.title.trim()) return setError("Give your prayer a title.");
		if (!hasRichTextContent(draft.content))
			return setError("Write your prayer before saving.");
		setError(null);
		save.mutate();
	};

	return (
		<div className="flex flex-wrap items-start gap-6">
			<section
				aria-labelledby="compose-prayer-heading"
				className={cn(
					cardClassName,
					"flex min-w-0 flex-[2_1_480px] flex-col gap-5 p-6 sm:p-8",
				)}
			>
				<div className="flex flex-col gap-1.5">
					<h2
						className="font-serif text-[28px] text-primary leading-tight"
						id="compose-prayer-heading"
					>
						What’s on your heart today?
					</h2>
					<p className="text-muted-foreground text-sm">
						Write your first prayer. You can come back to it, add updates as
						things change, and look back on what God has done.
					</p>
				</div>
				<label className="flex flex-col gap-2 font-semibold text-[13px] text-foreground/80">
					Title
					<input
						className={cn(fieldClassName, "font-normal")}
						maxLength={200}
						onChange={(event) =>
							setDraft((current) => ({ ...current, title: event.target.value }))
						}
						placeholder="e.g. Wisdom for the new job"
						value={draft.title}
					/>
				</label>
				<div className="flex flex-col gap-2">
					<span className="font-semibold text-[13px] text-foreground/80">
						Prayer
					</span>
					<JournalEditor
						ariaLabel="Prayer"
						className="rounded-xl!"
						contentClassName={inlineEditorContentClassName}
						onChange={(content) =>
							setDraft((current) => ({ ...current, content }))
						}
						onExpand={() => void navigate({ to: "/library/prayers/new" })}
						onPersonNamed={(name) => {
							setShowPrayingFor(true);
							setDraft((current) => ({ ...current, prayingFor: name }));
						}}
						placeholder="Lord, I bring before you…"
						toolbar="compact"
						value={draft.content}
					/>
				</div>
				<CategoryChips
					onChange={(category) =>
						setDraft((current) => ({ ...current, category }))
					}
					value={draft.category}
				/>
				{showPrayingFor ? (
					<PrayingForField
						autoFocus={!draft.prayingFor}
						onChange={(prayingFor) =>
							setDraft((current) => ({ ...current, prayingFor }))
						}
						value={draft.prayingFor}
					/>
				) : null}
				<div className="flex flex-wrap items-center justify-between gap-3 border-border/70 border-t pt-5">
					{showPrayingFor ? (
						<span />
					) : (
						<button
							className="flex h-11 items-center gap-2 rounded-xl border border-input border-dashed px-3.5 text-foreground/80 text-sm outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/50"
							onClick={() => setShowPrayingFor(true)}
							type="button"
						>
							<UserRoundIcon aria-hidden="true" className="size-4" />
							Praying for someone
						</button>
					)}
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
							{save.isPending ? "Saving…" : "Save prayer"}
						</Button>
					</div>
				</div>
			</section>
			<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
				<VerseCard verse={journalVerses.prayers} />
				<section
					aria-labelledby="journal-grows-heading"
					className="flex flex-col gap-4.5 rounded-4xl bg-secondary p-6"
				>
					<SectionLabel id="journal-grows-heading">
						How your journal grows
					</SectionLabel>
					<ol className="flex flex-col gap-4">
						{[
							["Pray", "Record requests, thanks and people on your heart."],
							[
								"Keep praying",
								"Come back to it and add updates as things change.",
							],
							[
								"Look back",
								"Write reflections on what you’re learning, and record testimonies of His faithfulness.",
							],
						].map(([title, description], index) => (
							<li className="flex items-start gap-3.5" key={title}>
								<span
									aria-hidden="true"
									className={cn(
										"flex size-7.5 flex-none items-center justify-center rounded-full font-semibold text-[13px] text-primary",
										index === 2 ? "bg-accent" : "bg-card",
									)}
								>
									{index + 1}
								</span>
								<span className="flex flex-col gap-0.5">
									<span className="font-semibold text-[15px] text-foreground">
										{title}
									</span>
									<span className="text-[13px] text-muted-foreground leading-normal">
										{description}
									</span>
								</span>
							</li>
						))}
					</ol>
				</section>
			</aside>
		</div>
	);
}

/** A shorter writing area for the inline composers. */
export const inlineEditorContentClassName =
	"text-[15px]! leading-relaxed! [&_.ProseMirror>*:first-child]:mt-0! [&_.ProseMirror]:min-h-36! [&_.ProseMirror]:px-4! [&_.ProseMirror]:py-3.5!";
