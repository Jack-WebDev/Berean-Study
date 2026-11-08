import { Dialog } from "@base-ui/react/dialog";
import type {
	StudyItem,
	StudyPanelGroup,
	StudyPassage,
	StudySource,
	VerseStudy,
} from "@berean-study/db/reader-study";
import { cn } from "@berean-study/ui/lib/utils";
import type { UseQueryResult } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeftIcon, XIcon } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { ReaderButton, readerButtonClass } from "@/components/reader-ui/button";
import { Chip, ChipRow } from "@/components/reader-ui/chip";
import { ReaderSkeleton } from "@/components/reader-ui/reader-skeleton";
import { useReaderToast } from "@/components/reader-ui/reader-toast";
import { EmptyState, ErrorCard } from "@/components/reader-ui/state-card";
import { StudyGroup } from "@/components/reader-ui/study-group";
import { TrustLine } from "@/components/reader-ui/trust-line";

import { type ReportedNote, ReportProblemSheet } from "./report-problem-sheet";
import { countCitations, StudyWriting } from "./study-writing";
import { VerseActionGrid, type VerseActions } from "./verse-sheet";

/*
 * The study panel (HANDOFF Screen 3). On a phone or tablet it fills the screen,
 * with Back to reading. On a computer it sits beside the text, so the verse stays
 * in view, with the verse actions at its top. Only kinds of notes the verses have
 * are shown, in a fixed order, and the first starts open.
 */

const languageCodes = { greek: "grc", hebrew: "he" } as const;
const languageNames = { greek: "Greek", hebrew: "Hebrew" } as const;

/** What the panel shows: notes, or why there are none yet. */
export type StudyState =
	| { kind: "none" }
	| { kind: "query"; query: UseQueryResult<VerseStudy | null> };

type VerseText = { number: number; text: string };

function Pill({ children }: { children: ReactNode }) {
	return (
		<span className="inline-flex min-h-7 items-center rounded-full bg-muted px-2.5 py-0.5 font-semibold text-[14px] text-foreground">
			{children}
		</span>
	);
}

function ReportLink({ onReport }: { onReport: () => void }) {
	return (
		<ReaderButton
			aria-haspopup="dialog"
			className="mt-3 justify-start px-0 text-[15px] text-muted-foreground"
			onClick={onReport}
			size="compact"
			variant="link"
		>
			Report a problem with this note
		</ReaderButton>
	);
}

/** "Source 1" chips under a note, each opening a card with the source and a short quote. */
function Sources({
	idPrefix,
	onToggle,
	openSource,
	sources,
}: {
	idPrefix: string;
	onToggle: (number: number) => void;
	openSource: number | null;
	sources: readonly StudySource[];
}) {
	if (sources.length === 0) return null;
	return (
		<div className="mt-4">
			<ChipRow>
				{sources.map((source) => (
					<Chip
						aria-controls={`${idPrefix}-${source.number}`}
						aria-expanded={openSource === source.number}
						className={cn(
							openSource === source.number &&
								"border-primary bg-primary text-primary-foreground hover:bg-primary",
						)}
						key={source.number}
						onClick={() => onToggle(source.number)}
					>
						Source {source.number}
					</Chip>
				))}
			</ChipRow>
			{sources.map((source) => (
				<section
					aria-label={`Source ${source.number}`}
					className="mt-3 rounded-xl bg-muted px-4 py-3"
					hidden={openSource !== source.number}
					id={`${idPrefix}-${source.number}`}
					key={source.number}
				>
					<p className="font-bold text-[14px] text-muted-foreground">
						Source {source.number}
					</p>
					<p className="mt-1 font-serif text-[17px] text-foreground">
						{source.title}
					</p>
					{source.byline ? (
						<p className="mt-1 text-[15px] text-muted-foreground">
							{source.byline}
						</p>
					) : null}
					{source.detail ? (
						<p className="text-[15px] text-muted-foreground">{source.detail}</p>
					) : null}
					{source.quote ? (
						source.isSummary ? (
							<p className="mt-2 text-[16px] leading-normal">
								<span className="font-semibold">In our words: </span>
								{source.quote}
							</p>
						) : (
							<blockquote className="mt-2 text-[16px] italic leading-normal">
								“{source.quote}”
							</blockquote>
						)
					) : null}
				</section>
			))}
		</div>
	);
}

/** Which source card is open, shared by a note's citation numbers and its chips. */
function useOpenSource() {
	const idPrefix = useId();
	const [openSource, setOpenSource] = useState<number | null>(null);
	const toggle = (number: number) =>
		setOpenSource((current) => (current === number ? null : number));
	return { idPrefix, openSource, toggle };
}

function citationNumbers(
	writings: readonly {
		firstCitation: number;
		document: Parameters<typeof countCitations>[0];
	}[],
) {
	const numbers = new Set<number>();
	for (const writing of writings) {
		const total = countCitations(writing.document);
		for (let offset = 0; offset < total; offset += 1) {
			numbers.add(writing.firstCitation + offset);
		}
	}
	return numbers;
}

function ExplanationItem({
	item,
	onReport,
}: {
	item: Extract<StudyItem, { kind: "explanation" }>;
	onReport: () => void;
}) {
	const sources = useOpenSource();
	const [full, setFull] = useState(false);
	const shown = item.sections.filter(
		(section) => full || section.aboutChosenVerses,
	);
	const hasMore = shown.length < item.sections.length || full;
	const visibleNumbers = citationNumbers(
		shown.map((section) => section.writing),
	);
	return (
		<article>
			<h4 className="font-serif text-[20px] leading-snug">{item.title}</h4>
			<div className="mt-2 flex flex-col gap-4">
				{shown.map((section) => (
					<section key={section.key}>
						{shown.length > 1 && section.title ? (
							<h5 className="mb-1 font-bold text-[17px]">{section.title}</h5>
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
			{hasMore ? (
				<ReaderButton
					aria-expanded={full}
					className="mt-3"
					onClick={() => setFull(!full)}
					size="compact"
				>
					{full ? "Show less" : "Read the full explanation"}
				</ReaderButton>
			) : null}
			<Sources
				idPrefix={sources.idPrefix}
				onToggle={sources.toggle}
				openSource={sources.openSource}
				sources={item.sources.filter((source) =>
					visibleNumbers.has(source.number),
				)}
			/>
			<ReportLink onReport={onReport} />
		</article>
	);
}

function WordMeaningItem({
	item,
	onReport,
}: {
	item: Extract<StudyItem, { kind: "word_meaning" }>;
	onReport: () => void;
}) {
	const sources = useOpenSource();
	const lang = languageCodes[item.language];
	const dir = item.language === "hebrew" ? "rtl" : undefined;
	return (
		<article className="rounded-xl border border-border px-4 py-3">
			<p className="text-[15px] text-muted-foreground">
				{languageNames[item.language]} word
			</p>
			<p
				className="mt-1 font-serif text-[26px] leading-snug"
				dir={dir}
				lang={lang}
			>
				{item.word}
			</p>
			<p className="mt-2 text-[17px] leading-normal">
				<strong>Means:</strong> {item.gloss}
			</p>
			{item.lemma || item.parsing ? (
				<p className="mt-1 text-[15px] text-muted-foreground leading-normal">
					{item.lemma ? (
						<>
							Dictionary form:{" "}
							<span dir={dir} lang={lang}>
								{item.lemma}
							</span>
							{item.parsing ? ` · ${item.parsing}` : ""}
						</>
					) : (
						item.parsing
					)}
				</p>
			) : null}
			<StudyWriting
				className="mt-3 text-[16px]"
				onCitation={sources.toggle}
				openSource={sources.openSource}
				sourceIdPrefix={sources.idPrefix}
				writing={item.note}
			/>
			<Sources
				idPrefix={sources.idPrefix}
				onToggle={sources.toggle}
				openSource={sources.openSource}
				sources={item.sources}
			/>
			<ReportLink onReport={onReport} />
		</article>
	);
}

function DifferentViewsItem({
	item,
	onReport,
}: {
	item: Extract<StudyItem, { kind: "different_views" }>;
	onReport: () => void;
}) {
	const sources = useOpenSource();
	const preferredIndex = item.views.findIndex((view) => view.preferred);
	const preferred = item.views[preferredIndex];
	return (
		<article>
			<h4 className="font-serif text-[20px] leading-snug">{item.question}</h4>
			{item.whyItMatters ? (
				<p className="mt-2 text-[16px] text-muted-foreground leading-normal">
					<strong className="text-foreground">Why it matters:</strong>{" "}
					{item.whyItMatters}
				</p>
			) : null}
			{/* Every view gets the same card, in the order stored, so none looks
			    more important. A preferred view is labelled in words. */}
			<ol className="mt-3 grid gap-2.5">
				{item.views.map((view, index) => (
					<li
						className="rounded-xl border-[1.5px] border-border-strong bg-card px-4 py-3"
						key={view.key}
					>
						<p className="font-bold text-[14px] text-muted-foreground">
							View {index + 1}
							{view.preferred ? " · Preferred by Berean Study" : ""}
						</p>
						<h5 className="mt-1 font-serif text-[18px] leading-snug">
							{view.name}
						</h5>
						<StudyWriting
							className="mt-2 text-[16px]"
							onCitation={sources.toggle}
							openSource={sources.openSource}
							sourceIdPrefix={sources.idPrefix}
							writing={view.argument}
						/>
						{view.heldBy.length > 0 ? (
							<p className="mt-2 text-[15px] text-muted-foreground">
								Held by: {view.heldBy.join("; ")}
							</p>
						) : null}
					</li>
				))}
			</ol>
			<p className="mt-3 rounded-xl bg-muted px-4 py-3 text-[16px] leading-normal">
				{item.takesNoSide || !preferred
					? `Berean Study presents ${item.views.length === 2 ? "both" : "these"} views without taking a side.`
					: `Berean Study prefers View ${preferredIndex + 1}, “${preferred.name}”. The other ${item.views.length === 2 ? "view is" : "views are"} shown fairly, so you can weigh them yourself.`}
			</p>
			<Sources
				idPrefix={sources.idPrefix}
				onToggle={sources.toggle}
				openSource={sources.openSource}
				sources={item.sources}
			/>
			<ReportLink onReport={onReport} />
		</article>
	);
}

function PassageBlock({
	children,
	heading,
	passage,
}: {
	/** Shown under the verses' words, before the button to read them. */
	children?: ReactNode;
	heading?: string;
	passage: StudyPassage;
}) {
	return (
		<div>
			{heading ? (
				<p className="font-bold text-[14px] text-muted-foreground">{heading}</p>
			) : null}
			<h4 className="font-serif text-[18px] leading-snug">{passage.label}</h4>
			{passage.text ? (
				<p className="mt-1 font-serif text-[16px] leading-[1.6]">
					{passage.text}
				</p>
			) : (
				<p className="mt-1 text-[15px] text-muted-foreground">
					These verses aren't available to read yet.
				</p>
			)}
			{children}
			{passage.isChosen ? null : (
				<ReaderButton
					className="mt-2"
					render={
						<Link
							params={{ book: passage.bookSlug, chapter: passage.chapter }}
							search={{ verse: passage.verse }}
							to="/bible/$book/$chapter"
						/>
					}
					size="compact"
				>
					Read {passage.label}
				</ReaderButton>
			)}
		</div>
	);
}

function RelatedVerseItem({
	item,
	onReport,
}: {
	item: Extract<StudyItem, { kind: "related_verse" }>;
	onReport: () => void;
}) {
	return (
		<article className="rounded-xl border border-border px-4 py-3">
			{item.kindLabel ? (
				<div className="mb-1">
					<Pill>{item.kindLabel}</Pill>
				</div>
			) : null}
			<PassageBlock passage={item.passage}>
				{item.note ? (
					<p className="mt-2 text-[15px] text-muted-foreground leading-normal">
						{item.note}
					</p>
				) : null}
			</PassageBlock>
			<ReportLink onReport={onReport} />
		</article>
	);
}

function TestamentLinkItem({
	item,
	onReport,
}: {
	item: Extract<StudyItem, { kind: "testament_link" }>;
	onReport: () => void;
}) {
	return (
		<article className="rounded-xl border border-border px-4 py-3">
			{item.kindLabel ? (
				<div className="mb-2">
					<Pill>{item.kindLabel}</Pill>
				</div>
			) : null}
			{/* Side by side once the panel is wide enough, stacked otherwise. */}
			<div className="grid @[36rem]:grid-cols-2 gap-4">
				<PassageBlock heading="Old Testament" passage={item.oldTestament} />
				<PassageBlock heading="New Testament" passage={item.newTestament} />
			</div>
			{item.note ? (
				<p className="mt-3 text-[16px] leading-normal">{item.note}</p>
			) : null}
			<ReportLink onReport={onReport} />
		</article>
	);
}

function TextNoteItem({
	item,
	onReport,
}: {
	item: Extract<StudyItem, { kind: "text_note" }>;
	onReport: () => void;
}) {
	const sources = useOpenSource();
	return (
		<article>
			<h4 className="font-serif text-[20px] leading-snug">{item.heading}</h4>
			<StudyWriting
				className="mt-2"
				onCitation={sources.toggle}
				openSource={sources.openSource}
				sourceIdPrefix={sources.idPrefix}
				writing={item.note}
			/>
			<Sources
				idPrefix={sources.idPrefix}
				onToggle={sources.toggle}
				openSource={sources.openSource}
				sources={item.sources}
			/>
			<ReportLink onReport={onReport} />
		</article>
	);
}

function TextVariantItem({
	item,
	onReport,
}: {
	item: Extract<StudyItem, { kind: "text_variant" }>;
	onReport: () => void;
}) {
	const sources = useOpenSource();
	const lang = languageCodes[item.language];
	const dir = item.language === "hebrew" ? "rtl" : undefined;
	return (
		<article className="rounded-xl border border-border px-4 py-3">
			<p className="font-bold text-[14px] text-muted-foreground">
				Where old copies differ
			</p>
			<h4 className="mt-1 font-serif text-[19px] leading-snug">
				{item.location}
			</h4>
			{item.confidenceLabel ? (
				<div className="mt-2">
					<Pill>{item.confidenceLabel}</Pill>
				</div>
			) : null}
			<ul className="mt-3 grid gap-2">
				{item.readings.map((reading) => (
					<li
						className="rounded-xl border border-border bg-card px-3 py-2"
						key={reading.key}
					>
						<div className="flex flex-wrap items-center gap-2">
							<p className="font-serif text-[19px]" dir={dir} lang={lang}>
								{reading.text}
							</p>
							{reading.preferred ? <Pill>Preferred</Pill> : null}
						</div>
						{reading.meaning ? (
							<p className="mt-1 text-[16px] leading-normal">
								<strong>Meaning:</strong> {reading.meaning}
							</p>
						) : null}
						{reading.manuscripts.length > 0 ? (
							<p className="mt-1 text-[15px] text-muted-foreground">
								Found in: {reading.manuscripts.join(", ")}
							</p>
						) : null}
					</li>
				))}
			</ul>
			<p className="mt-3 font-bold text-[16px]">Why one reading is preferred</p>
			<StudyWriting
				className="mt-1 text-[16px]"
				onCitation={sources.toggle}
				openSource={sources.openSource}
				sourceIdPrefix={sources.idPrefix}
				writing={item.reason}
			/>
			<Sources
				idPrefix={sources.idPrefix}
				onToggle={sources.toggle}
				openSource={sources.openSource}
				sources={item.sources}
			/>
			<ReportLink onReport={onReport} />
		</article>
	);
}

function StudyItemView({
	item,
	onReport,
}: {
	item: StudyItem;
	onReport: (note: ReportedNote) => void;
}) {
	const report = () =>
		onReport({ label: item.reportLabel, revisionId: item.revisionId });
	switch (item.kind) {
		case "explanation":
			return <ExplanationItem item={item} onReport={report} />;
		case "word_meaning":
			return <WordMeaningItem item={item} onReport={report} />;
		case "different_views":
			return <DifferentViewsItem item={item} onReport={report} />;
		case "related_verse":
			return <RelatedVerseItem item={item} onReport={report} />;
		case "testament_link":
			return <TestamentLinkItem item={item} onReport={report} />;
		case "text_note":
			return <TextNoteItem item={item} onReport={report} />;
		case "text_variant":
			return <TextVariantItem item={item} onReport={report} />;
	}
}

function StudyGroups({
	groups,
	onReport,
}: {
	groups: readonly StudyPanelGroup[];
	onReport: (note: ReportedNote) => void;
}) {
	// The first group starts open; the reader opens and closes the rest.
	const [open, setOpen] = useState<ReadonlySet<string>>(
		() => new Set(groups[0] ? [groups[0].key] : []),
	);
	return (
		<div className="mt-3 flex flex-col gap-3">
			{groups.map((group) => (
				<StudyGroup
					count={group.items.length}
					hint={group.hint}
					key={group.key}
					name={group.name}
					onOpenChange={(next) => {
						const changed = new Set(open);
						if (next) changed.add(group.key);
						else changed.delete(group.key);
						setOpen(changed);
					}}
					open={open.has(group.key)}
				>
					<div className="flex flex-col gap-5">
						{group.items.map((item) => (
							<StudyItemView item={item} key={item.key} onReport={onReport} />
						))}
					</div>
				</StudyGroup>
			))}
		</div>
	);
}

/** Notes for the chosen verses, or a kind message when there are none, or it failed. */
function StudyNotes({
	reference,
	state,
	verseCount,
}: {
	reference: string;
	state: StudyState;
	verseCount: number;
}) {
	const toast = useReaderToast();
	const [reporting, setReporting] = useState<ReportedNote | null>(null);
	// The page's own message sits outside a full-screen panel, where screen
	// readers can't hear it, so the panel says it too.
	const [sent, setSent] = useState(false);
	const these = verseCount > 1 ? "these verses" : "this verse";

	const empty = (
		<EmptyState
			className="mt-4"
			description="We're adding notes over time."
			secondaryAction={
				<ReaderButton render={<Link to="/study-tools" />}>
					Explore Study Tools
				</ReaderButton>
			}
			title={`No study notes for ${these} yet`}
		/>
	);
	if (state.kind === "none") return empty;

	const { query } = state;
	if (query.isPending) {
		return (
			<ReaderSkeleton
				className="mt-4"
				label={`Finding notes for ${reference}…`}
				lines={4}
			/>
		);
	}
	if (query.isError) {
		return (
			<ErrorCard
				className="mt-4"
				description="Check that you're connected to the internet, then try again."
				primaryAction={
					<ReaderButton onClick={() => void query.refetch()} variant="primary">
						Try again
					</ReaderButton>
				}
				title="We couldn't load the notes"
			/>
		);
	}
	if (!query.data || query.data.groups.length === 0) return empty;

	return (
		<>
			<TrustLine className="mt-4" />
			{/* A fresh set of open groups for each choice of verses. */}
			<StudyGroups
				groups={query.data.groups}
				key={reference}
				onReport={setReporting}
			/>
			<p className="sr-only" role="status">
				{sent ? "Thank you. Your report has gone to our editors." : ""}
			</p>
			<p className="mx-1 mt-4 text-[15px] text-muted-foreground leading-normal">
				Only the kinds of notes written for {these} are shown. We add more over
				time.
			</p>
			<ReportProblemSheet
				note={reporting}
				onOpenChange={(next) => {
					if (!next) setReporting(null);
				}}
				onSent={() => {
					setReporting(null);
					setSent(true);
					toast.show("Thank you. Your report has gone to our editors.");
				}}
			/>
		</>
	);
}

/** The chosen verses' words, numbered when there's more than one. */
function ChosenWords({ verses }: { verses: readonly VerseText[] }) {
	return (
		<blockquote className="mt-3 whitespace-pre-line rounded-2xl bg-reader-notice px-4 py-3 font-serif text-[18px] text-reader-notice-foreground leading-[1.7]">
			{verses.map((verse, index) => (
				<span key={verse.number}>
					{index > 0 ? " " : null}
					{verses.length > 1 ? (
						<sup className="me-1 font-bold font-sans text-[13px]">
							{verse.number}
						</sup>
					) : null}
					{verse.text}
				</span>
			))}
		</blockquote>
	);
}

/** Full screen on phones and tablets, with Back to reading. */
export function PhoneStudyPanel({
	firstVerse,
	onClose,
	open,
	reference,
	state,
	verses,
}: {
	firstVerse: number | undefined;
	onClose: () => void;
	open: boolean;
	reference: string;
	state: StudyState;
	verses: readonly VerseText[];
}) {
	return (
		<Dialog.Root
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
			open={open}
		>
			<Dialog.Portal>
				<Dialog.Popup
					aria-label={`Study ${reference}`}
					className="fixed inset-0 z-50 flex flex-col bg-background text-foreground outline-none"
					// Back to the verse they were studying, at the same place on the page.
					finalFocus={() =>
						firstVerse ? document.getElementById(`v${firstVerse}`) : true
					}
				>
					<div className="flex shrink-0 items-center border-border border-b px-3 py-2">
						<Dialog.Close
							className={cn(
								readerButtonClass({ size: "compact", variant: "secondary" }),
								"pr-4 pl-2.5",
							)}
						>
							<ChevronLeftIcon aria-hidden="true" />
							Back to reading
						</Dialog.Close>
					</div>
					<div className="@container min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
						<div className="mx-auto w-full max-w-[680px]">
							<p className="font-semibold text-[15px] text-muted-foreground">
								Studying
							</p>
							<h2 className="mt-0.5 font-serif text-[28px] leading-tight">
								{reference}
							</h2>
							<ChosenWords verses={verses} />
							<StudyNotes
								reference={reference}
								state={state}
								verseCount={verses.length}
							/>
						</div>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

/**
 * Beside the text on a computer, while verses are chosen. The verse actions sit
 * at the top instead of in a sheet, and the notes follow.
 */
export function DesktopStudyPanel({
	actions,
	allHighlighted,
	className,
	onClose,
	reference,
	state,
	verseCount,
}: {
	actions: VerseActions;
	allHighlighted: boolean;
	className?: string;
	onClose: () => void;
	reference: string;
	state: StudyState;
	verseCount: number;
}) {
	const headingId = useId();
	return (
		<aside
			aria-label={`Study ${reference}`}
			className={cn(
				"@container sticky top-0 h-dvh w-[420px] shrink-0 overflow-y-auto border-border border-l bg-card px-6 pt-6 pb-10 xl:w-[460px]",
				className,
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-semibold text-[14px] text-muted-foreground">
						Selected
					</p>
					<h2 className="mt-0.5 font-serif text-[26px] leading-tight">
						{reference}
					</h2>
				</div>
				<ReaderButton
					className="shrink-0 px-4"
					onClick={onClose}
					size="compact"
				>
					<XIcon aria-hidden="true" />
					Close
				</ReaderButton>
			</div>
			<p className="mt-1 mb-3 text-[15px] text-muted-foreground">
				Tap other verses to add them.
			</p>
			<VerseActionGrid
				actions={actions}
				allHighlighted={allHighlighted}
				compact
			/>
			<section aria-labelledby={headingId} className="mt-6">
				<h3 className="font-bold text-[18px]" id={headingId}>
					{verseCount > 1 ? "Study these verses" : "Study this verse"}
				</h3>
				<StudyNotes
					reference={reference}
					state={state}
					verseCount={verseCount}
				/>
			</section>
		</aside>
	);
}
