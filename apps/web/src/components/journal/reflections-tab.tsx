import type { PrayerSummary, Reflection } from "@berean-study/db/prayers";
import { getExcerpt } from "@berean-study/rich-text-editor/document";
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
import { Link } from "@tanstack/react-router";
import {
	HandHeartIcon,
	MessageCircleQuestionIcon,
	PencilIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { setReflectionReminder } from "@/functions/prayer-journal";
import { prayerJournalKeys } from "@/queries/keys";
import { reflectionReminderQueryOptions } from "@/queries/prayer-journal";
import {
	prayersQueryOptions,
	prayersReadyForReflectionQueryOptions,
} from "@/queries/prayers";
import { reflectionsQueryOptions } from "@/queries/reflections";
import { formatMonth, formatShortDate } from "@/utils/dates";
import { guidingQuestions, journalVerses, promptForDay } from "./journal-copy";
import { getPrimaryReference } from "./journal-format";
import {
	buttonLinkClassName,
	cardClassName,
	InlineSelect,
	JournalPage,
	JournalState,
	primaryButtonClassName,
	RetryButton,
	SectionLabel,
	secondaryButtonClassName,
	Tag,
	VerseCard,
} from "./journal-ui";

export type ReflectionsSearch = { prayer?: number };

export function ReflectionsTab({
	onSearchChange,
	search,
}: {
	onSearchChange: (
		next: ReflectionsSearch,
		options?: { replace?: boolean },
	) => void;
	search: ReflectionsSearch;
}) {
	const reflectionsQuery = useQuery(reflectionsQueryOptions());
	const prayers = useQuery(prayersQueryOptions()).data ?? [];
	const reflections = reflectionsQuery.data;

	if (reflectionsQuery.isError)
		return (
			<JournalPage tab="reflections">
				<JournalState
					action={
						<RetryButton onRetry={() => void reflectionsQuery.refetch()} />
					}
				>
					We couldn’t load your reflections.
				</JournalState>
			</JournalPage>
		);
	if (!reflections)
		return (
			<JournalPage tab="reflections">
				<JournalState>Loading reflections…</JournalState>
			</JournalPage>
		);
	if (reflections.length === 0)
		return (
			<JournalPage tab="reflections">
				<ReflectionsEmptyState prayers={prayers} />
			</JournalPage>
		);

	// Only prayers that have reflections are worth filtering by.
	const reflectedPrayers = [
		...new Map(
			reflections.flatMap((reflection) =>
				reflection.prayer
					? [[reflection.prayer.id, reflection.prayer] as const]
					: [],
			),
		).values(),
	];
	const shown = search.prayer
		? reflections.filter(
				(reflection) => reflection.prayer?.id === search.prayer,
			)
		: reflections;

	return (
		<JournalPage
			tab="reflections"
			tabsToolbar={
				reflectedPrayers.length ? (
					<InlineSelect
						label="Prayer"
						onChange={(value) =>
							onSearchChange(
								{ prayer: value ? Number(value) : undefined },
								{ replace: true },
							)
						}
						value={search.prayer ? String(search.prayer) : ""}
					>
						<option value="">All prayers</option>
						{reflectedPrayers.map((prayer) => (
							<option key={prayer.id} value={prayer.id}>
								{prayer.title}
							</option>
						))}
					</InlineSelect>
				) : null
			}
		>
			<div className="flex flex-wrap items-start gap-7">
				<div className="flex min-w-0 flex-[2_1_480px] flex-col gap-7">
					{shown.length ? (
						groupByMonth(shown).map(([month, items]) => (
							<section className="flex flex-col gap-3.5" key={month}>
								<SectionLabel>{month}</SectionLabel>
								{items.map((reflection) => (
									<ReflectionCard key={reflection.id} reflection={reflection} />
								))}
							</section>
						))
					) : (
						<JournalState>No reflections on this prayer yet.</JournalState>
					)}
				</div>
				<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
					<ReadyToLookBack />
					<TodaysPrompt />
					<VerseCard verse={journalVerses.reflections} />
				</aside>
			</div>
		</JournalPage>
	);
}

function groupByMonth(reflections: Reflection[]) {
	const groups = new Map<string, Reflection[]>();
	for (const reflection of reflections) {
		const month = formatMonth(reflection.createdAt);
		groups.set(month, [...(groups.get(month) ?? []), reflection]);
	}
	return [...groups];
}

function ReflectionCard({ reflection }: { reflection: Reflection }) {
	const reference = getPrimaryReference(
		reflection.content,
		reflection.passages,
	);
	return (
		<article className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-card px-5 py-5 sm:px-6.5 sm:py-6">
			<div className="flex flex-wrap items-center justify-between gap-2.5">
				{reflection.prayer ? (
					<Link
						className="flex min-h-11 items-center gap-2 rounded-full bg-section-observe px-3 font-semibold text-[13px] text-section-observe-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
						search={{ prayer: reflection.prayer.id }}
						to="/library/prayers"
					>
						<HandHeartIcon aria-hidden="true" className="size-4" />
						<span>
							<span className="font-normal">Looking back on:</span>{" "}
							{reflection.prayer.title}
						</span>
					</Link>
				) : (
					<Tag>Free reflection</Tag>
				)}
				<span className="flex items-center gap-1">
					<span className="text-[13px] text-muted-foreground">
						{formatShortDate(reflection.createdAt)}
					</span>
					<Link
						aria-label="Edit reflection"
						className="flex size-11 items-center justify-center rounded-xl text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
						params={{ reflectionId: reflection.id }}
						to="/library/reflections/$reflectionId/edit"
					>
						<PencilIcon aria-hidden="true" className="size-4" />
					</Link>
				</span>
			</div>
			{reflection.prompt ? (
				<p className="border-section-apply-foreground/30 border-l-2 pl-3.5 font-serif text-base text-section-apply-foreground italic">
					{reflection.prompt}
				</p>
			) : null}
			<p className="line-clamp-6 text-base text-foreground/90 leading-[1.7]">
				{getExcerpt(reflection.content, 900, { skipHeadings: true })}
			</p>
			{reference ? (
				<span className="font-semibold text-[13px] text-scripture-foreground">
					{reference}
				</span>
			) : null}
		</article>
	);
}

/** Prayers carried for a few weeks with no reflection yet. */
function ReadyToLookBack() {
	const headingId = useId();
	const ready = useQuery(prayersReadyForReflectionQueryOptions()).data;
	return (
		<section
			aria-labelledby={headingId}
			className="flex flex-col gap-3.5 rounded-4xl border border-border bg-card p-6"
		>
			<div className="flex flex-col gap-1">
				<h2 className="font-serif text-[22px] text-primary" id={headingId}>
					Ready to look back on
				</h2>
				<p className="text-[13px] text-muted-foreground leading-normal">
					Prayers you’ve carried for a while and haven’t reflected on yet.
				</p>
			</div>
			{ready?.length ? (
				<ul className="flex flex-col gap-2.5">
					{ready.map((prayer) => (
						<li
							className="flex items-center gap-3 rounded-[14px] bg-background p-3.5"
							key={prayer.id}
						>
							<span className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="truncate font-semibold text-[15px] text-foreground">
									{prayer.title}
								</span>
								<span className="text-muted-foreground text-xs">
									Since {formatShortDate(prayer.createdAt)}
									{prayer.updateCount
										? ` · ${prayer.updateCount} ${prayer.updateCount === 1 ? "update" : "updates"}`
										: ""}
								</span>
							</span>
							<Link
								aria-label={`Reflect on ${prayer.title}`}
								className={buttonLinkClassName(
									"outline",
									"h-11 flex-none rounded-[10px] border-primary bg-card px-3.5 font-semibold text-[13px] text-primary",
								)}
								search={{ prayerId: prayer.id }}
								to="/library/reflections/new"
							>
								Reflect
							</Link>
						</li>
					))}
				</ul>
			) : ready ? (
				<p className="text-muted-foreground text-sm">
					Nothing waiting right now. Prayers you’ve carried for three weeks will
					show up here.
				</p>
			) : null}
		</section>
	);
}

function TodaysPrompt() {
	const headingId = useId();
	const prompt = promptForDay(new Date());
	return (
		<section
			aria-labelledby={headingId}
			className="flex flex-col gap-3 rounded-[20px] bg-section-apply p-6"
		>
			<SectionLabel className="text-section-apply-foreground" id={headingId}>
				Today’s prompt
			</SectionLabel>
			<p className="font-serif text-foreground text-xl leading-snug">
				{prompt}
			</p>
			<Link
				className={buttonLinkClassName(
					"default",
					"h-11 w-fit rounded-xl bg-section-apply-foreground px-4 font-semibold text-sm text-white hover:bg-section-apply-foreground/90 dark:text-background",
				)}
				search={{ prompt }}
				to="/library/reflections/new"
			>
				Start with this prompt
			</Link>
		</section>
	);
}

/** First visit: what a reflection is, and two ways to begin. */
function ReflectionsEmptyState({ prayers }: { prayers: PrayerSummary[] }) {
	const [choosing, setChoosing] = useState(false);
	return (
		<div className="flex flex-wrap items-start gap-6">
			<section
				aria-labelledby="reflections-intro-heading"
				className={cn(
					cardClassName,
					"flex min-w-0 flex-[2_1_480px] flex-col gap-6 p-6 sm:p-8",
				)}
			>
				<div className="flex flex-col gap-1.5">
					<span className="font-semibold text-section-apply-foreground text-xs uppercase tracking-[0.08em]">
						Reflections
					</span>
					<h2
						className="font-serif text-[28px] text-primary leading-tight"
						id="reflections-intro-heading"
					>
						Pause and remember
					</h2>
					<p className="max-w-[560px] text-muted-foreground text-sm leading-relaxed">
						A reflection is a look back at a prayer: what has changed, what
						you’re learning, and what you’ve seen along the way. Pick a prayer
						and we’ll guide you with a question.
					</p>
				</div>
				<div className="flex flex-col gap-2.5">
					<span className="font-semibold text-[13px] text-foreground/80">
						Questions to guide you
					</span>
					<div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
						{guidingQuestions.map((question) => (
							<div
								className="flex flex-col gap-2 rounded-[14px] bg-section-apply p-4.5"
								key={question}
							>
								<MessageCircleQuestionIcon
									aria-hidden="true"
									className="size-5 text-section-apply-foreground"
								/>
								<span className="font-serif text-[17px] text-foreground leading-snug">
									{question}
								</span>
							</div>
						))}
					</div>
				</div>
				<div className="flex flex-wrap gap-2.5 border-border/70 border-t pt-5.5">
					{prayers.length ? (
						<Button
							className={primaryButtonClassName}
							onClick={() => setChoosing(true)}
						>
							Choose a prayer to reflect on
						</Button>
					) : (
						<Link
							className={buttonLinkClassName("default", primaryButtonClassName)}
							to="/library/prayers"
						>
							Choose a prayer to reflect on
						</Link>
					)}
					<Link
						className={buttonLinkClassName("outline", secondaryButtonClassName)}
						to="/library/reflections/new"
					>
						Write a free reflection
					</Link>
				</div>
			</section>
			<aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
				<VerseCard verse={journalVerses.reflections} />
				<ReminderPanel />
			</aside>
			<ChoosePrayerDialog
				onOpenChange={setChoosing}
				open={choosing}
				prayers={prayers}
			/>
		</div>
	);
}

function ChoosePrayerDialog({
	onOpenChange,
	open,
	prayers,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
	prayers: PrayerSummary[];
}) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[80svh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						Which prayer would you like to look back on?
					</DialogTitle>
					<DialogDescription>
						Your reflection will be linked to it.
					</DialogDescription>
				</DialogHeader>
				<ul className="flex flex-col gap-2">
					{prayers.map((prayer) => (
						<li key={prayer.id}>
							<Link
								className="flex min-h-11 flex-col rounded-xl border border-border px-3.5 py-2.5 outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/50"
								search={{ prayerId: prayer.id }}
								to="/library/reflections/new"
							>
								<span className="font-semibold text-sm">{prayer.title}</span>
								<span className="text-muted-foreground text-xs">
									Since {formatShortDate(prayer.createdAt)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			</DialogContent>
		</Dialog>
	);
}

function ReminderPanel() {
	const headingId = useId();
	const queryClient = useQueryClient();
	const reminder = useQuery(reflectionReminderQueryOptions());
	const update = useMutation({
		mutationFn: (enabled: boolean) =>
			setReflectionReminder({ data: { enabled } }),
		onMutate: (enabled) =>
			queryClient.setQueryData(prayerJournalKeys.reflectionReminder(), enabled),
		onError: () => {
			toast.error("We couldn’t save that setting. Please try again.");
			void queryClient.invalidateQueries({
				queryKey: prayerJournalKeys.reflectionReminder(),
			});
		},
	});
	return (
		<section
			aria-labelledby={headingId}
			className="flex flex-col gap-2.5 rounded-[20px] bg-secondary p-6"
		>
			<SectionLabel id={headingId}>A gentle rhythm</SectionLabel>
			<p className="text-foreground/80 text-sm leading-relaxed">
				Once you’ve prayed for something for a few weeks, we’ll suggest it here
				so you can pause and look back.
			</p>
			<label className="flex min-h-11 items-center gap-2.5 text-foreground/90 text-sm">
				<input
					checked={reminder.data ?? false}
					className="size-4.5 accent-primary"
					disabled={reminder.isPending}
					onChange={(event) => update.mutate(event.target.checked)}
					type="checkbox"
				/>
				Remind me to reflect monthly
			</label>
		</section>
	);
}
