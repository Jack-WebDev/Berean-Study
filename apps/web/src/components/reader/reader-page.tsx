import type { ReaderChapter, ReadingPlace } from "@berean-study/db/reader";
import {
	chapterLabel,
	type ReadingPreferences,
	selectionLabel,
} from "@berean-study/db/reader-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	Columns2Icon,
	SlidersHorizontalIcon,
} from "lucide-react";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { BackLink } from "@/components/reader-ui/back-link";
import { ReaderButton } from "@/components/reader-ui/button";
import { Notice } from "@/components/reader-ui/notice";
import { ReaderSkeleton } from "@/components/reader-ui/reader-skeleton";
import {
	ReaderToastProvider,
	ReaderToastRegion,
	useReaderToast,
} from "@/components/reader-ui/reader-toast";
import {
	EmptyState,
	ErrorCard,
	NotAvailable,
} from "@/components/reader-ui/state-card";
import { ToolbarRow, ToolbarTile } from "@/components/reader-ui/toolbar-tile";
import {
	chapterMarksQueryOptions,
	readerChapterQueryOptions,
	readerTranslationsQueryOptions,
	readingPlaceQueryOptions,
	readingPreferencesQueryOptions,
} from "@/queries/reader";

import { ChapterSheet } from "./chapter-sheet";
import { CollectionSheet } from "./collection-sheet";
import { NoteSheet } from "./note-sheet";
import { OptionsSheet } from "./options-sheet";
import { useChangeReadingPreferences } from "./reading-preferences";
import { TextSizeSheet } from "./text-size-sheet";
import { TranslationSheet } from "./translation-sheet";
import { useReadingPlace } from "./use-reading-place";
import { type ChosenVerses, useVerseActions } from "./use-verse-actions";
import { VerseList } from "./verse-list";
import { VerseSheet } from "./verse-sheet";

/*
 * The reading page (HANDOFF Screens 1–3). It opens as just Scripture: the tools
 * sit in labelled buttons, and study only appears when asked for. Previous and
 * Next are always on screen, and the reader's place is saved as they go.
 */

type ReaderPageProps = {
	arrivedFromSearch: boolean;
	bookSlug: string;
	chapter: number;
	translationAbbreviation: string | undefined;
	verse: number | undefined;
};

export function ReaderPage(props: ReaderPageProps) {
	const preferences = useQuery(readingPreferencesQueryOptions());
	// Needed before the page opens, to know whether to pick up where they left off.
	const place = useQuery(readingPlaceQueryOptions());
	const chapterQuery = useQuery({
		...readerChapterQueryOptions({
			bookSlug: props.bookSlug,
			chapter: props.chapter,
			translationAbbreviation: props.translationAbbreviation,
		}),
		enabled: props.chapter > 0,
	});

	if (props.chapter < 1 || chapterQuery.data === null) {
		return (
			<ReaderMessage>
				<EmptyState
					description="Check the chapter number, or choose a book from the list."
					primaryAction={
						<ReaderButton render={<Link to="/bible" />} variant="primary">
							Choose a book
						</ReaderButton>
					}
					title="We can't find that chapter"
				/>
			</ReaderMessage>
		);
	}
	if (chapterQuery.isError || preferences.isError) {
		return (
			<ReaderMessage>
				<ErrorCard
					description="Check that you're connected to the internet, then try again."
					primaryAction={
						<ReaderButton
							onClick={() => {
								void chapterQuery.refetch();
								void preferences.refetch();
							}}
							variant="primary"
						>
							Try again
						</ReaderButton>
					}
					title="We couldn't open this chapter"
				/>
			</ReaderMessage>
		);
	}
	if (!chapterQuery.data || !preferences.data || place.isPending) {
		return (
			<ReaderMessage>
				<ReaderSkeleton label={`Opening chapter ${props.chapter}…`} />
			</ReaderMessage>
		);
	}

	return (
		<ReaderToastProvider>
			<ReaderView
				{...props}
				chapter={chapterQuery.data}
				place={place.data ?? null}
				preferences={preferences.data}
			/>
		</ReaderToastProvider>
	);
}

function ReaderMessage({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto w-full max-w-[680px] px-4 py-8">
			<BackLink className="mb-4" render={<Link to="/bible" />}>
				Books
			</BackLink>
			{children}
		</div>
	);
}

type Sheet =
	| "chapters"
	| "collection"
	| "note"
	| "options"
	| "size"
	| "translation"
	| "verse";

/** Sheets for the reader's tools. Opening one sets aside any chosen verses. */
type ToolSheet = "chapters" | "options" | "size" | "translation";

const lineLengthClasses = {
	default: "md:max-w-[680px]",
	narrow: "md:max-w-[560px]",
	wide: "md:max-w-[800px]",
} as const;

/** Where the page first scrolls to, worked out once when the chapter opens. */
function startingPlace(
	{
		arrivedFromSearch,
		bookSlug,
		chapter,
		verse,
	}: Omit<ReaderPageProps, "translationAbbreviation">,
	place: ReadingPlace | null,
) {
	const savedHere =
		place && place.book.slug === bookSlug && place.chapter === chapter
			? place.verse
			: null;
	if (verse && arrivedFromSearch) return { kind: "search" as const, verse };
	const resumeAt = verse ?? savedHere;
	if (resumeAt && resumeAt > 1)
		return { kind: "resume" as const, verse: resumeAt };
	return null;
}

function ReaderView({
	arrivedFromSearch,
	bookSlug,
	chapter,
	place,
	preferences,
	verse,
}: Omit<ReaderPageProps, "chapter"> & {
	chapter: ReaderChapter;
	place: ReadingPlace | null;
	preferences: ReadingPreferences;
}) {
	const navigate = useNavigate();
	const changePreferences = useChangeReadingPreferences();
	const translations = useQuery(readerTranslationsQueryOptions());
	const available = chapter.status === "available";
	const marks = useQuery({
		...chapterMarksQueryOptions({
			bookSlug,
			chapter: chapter.chapter,
			translationAbbreviation: chapter.translation.abbreviation,
		}),
		enabled: available,
	});

	const [sheet, setSheet] = useState<Sheet | null>(null);
	const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
	// Worked out once, so saving the place while reading doesn't move the page.
	const [start] = useState(() =>
		startingPlace(
			{ arrivedFromSearch, bookSlug, chapter: chapter.chapter, verse },
			place,
		),
	);
	const [notice, setNotice] = useState(start);
	const [target, setTarget] = useState(
		start?.kind === "search" ? start.verse : null,
	);

	const headerRef = useRef<HTMLElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const pageRef = useRef<HTMLDivElement>(null);

	useReadingPlace({
		bookSlug,
		chapter: chapter.chapter,
		enabled: available,
		headerRef,
		listRef,
		translationAbbreviation: chapter.translation.abbreviation,
	});

	// Keeps a verse scrolled into view clear of the sticky header, whatever its height.
	useLayoutEffect(() => {
		const header = headerRef.current;
		const page = pageRef.current;
		if (!header || !page) return;
		const update = () =>
			page.style.setProperty(
				"--reader-header-height",
				`${header.offsetHeight}px`,
			);
		update();
		const observer = new ResizeObserver(update);
		observer.observe(header);
		return () => observer.disconnect();
	}, []);

	// Opens at the saved or searched-for verse without asking. This waits two
	// frames because the router restores its own remembered scroll position just
	// after the page draws, which would otherwise undo this.
	useEffect(() => {
		if (!start) return;
		let frame = window.requestAnimationFrame(() => {
			frame = window.requestAnimationFrame(() =>
				document
					.getElementById(`v${start.verse}`)
					?.scrollIntoView({ behavior: "instant", block: "start" }),
			);
		});
		return () => window.cancelAnimationFrame(frame);
	}, [start]);

	// The notice and search mark also go when the reader scrolls. These are the
	// reader's own movements; the page's jump to their verse doesn't count.
	useEffect(() => {
		if (!notice && target === null) return;
		const clear = () => {
			setNotice(null);
			setTarget(null);
		};
		// Only keys that scroll, so Tab can still reach "Start at verse 1".
		const scrollKeys = new Set([
			"ArrowDown",
			"ArrowUp",
			"End",
			"Home",
			"PageDown",
			"PageUp",
		]);
		const onKey = (event: KeyboardEvent) => {
			if (scrollKeys.has(event.key)) clear();
		};
		window.addEventListener("wheel", clear, { passive: true });
		window.addEventListener("touchmove", clear, { passive: true });
		window.addEventListener("keydown", onKey);
		return () => {
			window.removeEventListener("wheel", clear);
			window.removeEventListener("touchmove", clear);
			window.removeEventListener("keydown", onKey);
		};
	}, [notice, target]);

	const verseMarks = useMemo(
		() => ({
			highlighted: new Set(marks.data?.highlighted ?? []),
			noted: new Set(marks.data?.noted ?? []),
			study: new Set(marks.data?.study.map((marker) => marker.verse) ?? []),
		}),
		[marks.data],
	);

	/** The search mark and the resume notice go once the reader does anything. */
	const settle = () => {
		setTarget(null);
		setNotice(null);
	};
	const openSheet = (next: ToolSheet) => {
		settle();
		setSelected(new Set());
		setSheet(next);
	};
	/** Tapping verses adds or removes them; the verse sheet shows while any are chosen. */
	const toggleVerse = (number: number) => {
		settle();
		const next = new Set(selected);
		if (next.has(number)) next.delete(number);
		else next.add(number);
		setSelected(next);
		setSheet(next.size > 0 ? "verse" : null);
	};
	const clearSelection = () => {
		setSelected(new Set());
		setSheet(null);
	};

	const verseActions = useVerseActions();
	const toast = useReaderToast();
	const chosenVerses = [...selected].sort((a, b) => a - b);
	const reference =
		chosenVerses.length > 0
			? selectionLabel(chapter.book.name, chapter.chapter, chosenVerses)
			: "";
	const verseTexts = useMemo(
		() =>
			new Map(
				chapter.status === "available"
					? chapter.verses.map((item) => [item.number, item.text])
					: [],
			),
		[chapter],
	);
	const chosen = (): ChosenVerses => ({
		bookName: chapter.book.name,
		bookSlug,
		chapter: chapter.chapter,
		translationAbbreviation: chapter.translation.abbreviation,
		verseTexts,
		verses: chosenVerses,
	});
	const allHighlighted =
		chosenVerses.length > 0 &&
		chosenVerses.every((number) => verseMarks.highlighted.has(number));
	const studyGroupCount =
		marks.data?.study.find((marker) => marker.verse === chosenVerses[0])?.groups
			.length ?? null;

	const lightSheetOpen = sheet === "size" || sheet === "verse";
	// A message about the last action would sit on top of a full-height sheet,
	// such as over the note box, so it goes when one opens.
	const { dismiss: dismissToast } = toast;
	useEffect(() => {
		if (sheet && sheet !== "size" && sheet !== "verse") dismissToast();
	}, [dismissToast, sheet]);

	const { book, translation } = chapter;
	const previousLabel = chapter.previous
		? chapterLabel(book.name, chapter.previous)
		: null;
	const nextLabel = chapter.next ? chapterLabel(book.name, chapter.next) : null;

	return (
		<div
			className={cn(
				"pb-24 md:pb-0",
				// Room to scroll the last verses above a sheet that leaves the page in view.
				lightSheetOpen && "pb-[340px] md:pb-[340px]",
			)}
			ref={pageRef}
		>
			{/* On short screens, such as at 200% zoom, the header scrolls away so the
			    text has room. Previous and Next stay at the bottom either way. */}
			<header
				className="sticky top-0 z-30 border-border border-b bg-background px-3 pt-1 pb-3 [@media(max-height:600px)]:static"
				ref={headerRef}
			>
				<div
					className={cn(
						"mx-auto w-full",
						lineLengthClasses[preferences.lineLength],
					)}
				>
					<div className="flex items-center justify-between gap-2">
						<BackLink render={<Link to="/bible" />}>Books</BackLink>
						<p className="truncate text-[15px] text-muted-foreground">
							{translation.name}
						</p>
					</div>
					<h1>
						<button
							aria-haspopup="dialog"
							aria-label={`${chapter.label}, choose a chapter`}
							className="reader-focus -ml-1 flex min-h-12 items-center gap-1 px-1 text-left font-serif text-[32px] text-foreground leading-tight"
							onClick={() => openSheet("chapters")}
							type="button"
						>
							{chapter.label}
							<ChevronDownIcon aria-hidden="true" className="size-6 shrink-0" />
						</button>
					</h1>
					<ToolbarRow className="mt-2">
						<ToolbarTile
							aria-expanded={sheet === "translation"}
							aria-haspopup="dialog"
							glyph={
								<>
									{translation.abbreviation}
									<ChevronDownIcon className="size-4!" />
								</>
							}
							label="Translation"
							onClick={() => openSheet("translation")}
						/>
						<ToolbarTile
							aria-expanded={sheet === "size"}
							aria-haspopup="dialog"
							glyph={<span className="font-serif">Aa</span>}
							label="Text size"
							onClick={() => openSheet("size")}
						/>
						<ToolbarTile
							glyph={<Columns2Icon />}
							label="Compare"
							render={<Link to="/study-tools/compare-passages" />}
						/>
						<ToolbarTile
							aria-expanded={sheet === "options"}
							aria-haspopup="dialog"
							glyph={<SlidersHorizontalIcon />}
							label="Options"
							onClick={() => openSheet("options")}
						/>
					</ToolbarRow>
					{/* In the header, so it's on screen whichever verse the page opens at. */}
					{notice?.kind === "resume" ? (
						<Notice
							action={
								<ReaderButton
									onClick={() => {
										settle();
										window.scrollTo({ behavior: "instant", top: 0 });
									}}
									size="compact"
								>
									Start at verse 1
								</ReaderButton>
							}
							className="mt-3"
							role="status"
							title="Picked up where you left off"
						>
							{chapter.label}, verse {notice.verse}
						</Notice>
					) : null}
					{notice?.kind === "search" ? (
						<Notice className="mt-3" role="status">
							<strong>
								{chapter.label}:{notice.verse}
							</strong>{" "}
							is marked below. Tap it to highlight, add a note or study it.
						</Notice>
					) : null}
				</div>
			</header>

			<div
				className={cn(
					"mx-auto w-full px-3 pt-4",
					lineLengthClasses[preferences.lineLength],
				)}
			>
				{chapter.status === "available" ? (
					<div ref={listRef}>
						<VerseList
							layout={preferences.verseLayout}
							marks={verseMarks}
							missingVerses={chapter.missingVerses}
							onToggleVerse={toggleVerse}
							selected={selected}
							showVerseNumbers={preferences.showVerseNumbers}
							target={target}
							textSize={preferences.textSize}
							verses={chapter.verses}
						/>
					</div>
				) : (
					<NotAvailable
						className="mt-4"
						description="We're adding the Bible one chapter at a time. Go back, or choose a chapter that's ready."
						primaryAction={
							chapter.nearestAvailable ? (
								<ReaderButton
									render={
										<Link
											params={{
												book: bookSlug,
												chapter: chapter.nearestAvailable,
											}}
											to="/bible/$book/$chapter"
										/>
									}
									variant="primary"
								>
									Back to {chapterLabel(book.name, chapter.nearestAvailable)}
								</ReaderButton>
							) : (
								<ReaderButton render={<Link to="/bible" />} variant="primary">
									Choose a different book
								</ReaderButton>
							)
						}
						secondaryAction={
							<ReaderButton onClick={() => openSheet("chapters")}>
								Choose another chapter
							</ReaderButton>
						}
						title={`${chapter.label} isn't available yet`}
					/>
				)}

				{available ? (
					<section
						aria-label="End of chapter"
						className="mt-8 mb-6 flex flex-col gap-3"
					>
						<p className="text-[15px] text-muted-foreground">
							End of {chapter.label}
						</p>
						<div className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
							{chapter.next ? (
								<ReaderButton
									className="lg:order-2"
									render={
										<Link
											params={{ book: bookSlug, chapter: chapter.next }}
											to="/bible/$book/$chapter"
										/>
									}
									variant="primary"
								>
									Next: {nextLabel}
									<ChevronRightIcon aria-hidden="true" />
								</ReaderButton>
							) : (
								<ReaderButton
									className="lg:order-2"
									render={<Link to="/bible" />}
									variant="primary"
								>
									Choose another book
								</ReaderButton>
							)}
							{chapter.previous ? (
								<ReaderButton
									className="lg:order-1"
									render={
										<Link
											params={{ book: bookSlug, chapter: chapter.previous }}
											to="/bible/$book/$chapter"
										/>
									}
								>
									<ChevronLeftIcon aria-hidden="true" />
									Previous: {previousLabel}
								</ReaderButton>
							) : null}
						</div>
						{translation.copyrightNotice ? (
							<p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
								{translation.copyrightNotice}
							</p>
						) : null}
					</section>
				) : null}
			</div>

			<nav
				aria-label="Chapters"
				className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-border border-t bg-background/95 px-3 py-2 backdrop-blur md:sticky md:bottom-0 md:py-1.5"
			>
				<div
					className={cn(
						"mx-auto grid w-full grid-cols-2 gap-2",
						lineLengthClasses[preferences.lineLength],
					)}
				>
					{previousLabel ? (
						<ReaderButton
							className="md:h-12"
							render={
								<Link
									params={{ book: bookSlug, chapter: chapter.previous ?? 1 }}
									to="/bible/$book/$chapter"
								/>
							}
						>
							<ChevronLeftIcon aria-hidden="true" />
							{previousLabel}
						</ReaderButton>
					) : (
						<ReaderButton className="md:h-12" disabled>
							First chapter
						</ReaderButton>
					)}
					{nextLabel ? (
						<ReaderButton
							className="md:h-12"
							render={
								<Link
									params={{ book: bookSlug, chapter: chapter.next ?? 1 }}
									to="/bible/$book/$chapter"
								/>
							}
						>
							{nextLabel}
							<ChevronRightIcon aria-hidden="true" />
						</ReaderButton>
					) : (
						<ReaderButton className="md:h-12" disabled>
							Last chapter
						</ReaderButton>
					)}
				</div>
			</nav>

			{/* Sits above the light sheets, which leave the page in view. */}
			<ReaderToastRegion bottom={lightSheetOpen ? 340 : 140} />

			<VerseSheet
				actions={{
					onAddNote: () => setSheet("note"),
					onAddToCollection: () => setSheet("collection"),
					onCopy: () => {
						verseActions.copy(chosen());
						clearSelection();
					},
					onHighlight: () => {
						verseActions.highlight(chosen(), !allHighlighted);
						clearSelection();
					},
					onSave: () => {
						verseActions.save(chosen());
						clearSelection();
					},
					onShare: () =>
						void navigate({
							search: {
								book: bookSlug,
								chapter: chapter.chapter,
								translation: translation.abbreviation,
								type: "verse",
								verses: chosenVerses.join(","),
							},
							to: "/community/share",
						}),
				}}
				allHighlighted={allHighlighted}
				onOpenChange={(open) => {
					if (!open) clearSelection();
				}}
				open={sheet === "verse"}
				reference={reference}
				studyGroupCount={studyGroupCount}
			/>
			<NoteSheet
				chosen={{
					bookSlug,
					chapter: chapter.chapter,
					translationAbbreviation: translation.abbreviation,
					verses: chosenVerses,
				}}
				onDone={(kept) => {
					if (kept) toast.show(`Note saved on ${reference}`);
					clearSelection();
				}}
				onOpenChange={(open) => setSheet(open ? "note" : "verse")}
				open={sheet === "note"}
				reference={reference}
			/>
			<CollectionSheet
				onChoose={(collection) => {
					verseActions.addToCollection(chosen(), collection);
					clearSelection();
				}}
				// Closing without choosing goes back to the verse actions.
				onOpenChange={(open) => setSheet(open ? "collection" : "verse")}
				open={sheet === "collection"}
				reference={reference}
			/>

			<TextSizeSheet
				onOpenChange={(open) => setSheet(open ? "size" : null)}
				onTextSizeChange={(textSize) => changePreferences({ textSize })}
				open={sheet === "size"}
				textSize={preferences.textSize}
			/>
			{translations.data ? (
				<TranslationSheet
					current={translation}
					onChoose={(abbreviation) => {
						setSheet(null);
						changePreferences({ translationAbbreviation: abbreviation });
						void navigate({
							params: { book: bookSlug, chapter: chapter.chapter },
							search: { translation: abbreviation },
							to: "/bible/$book/$chapter",
						});
					}}
					onOpenChange={(open) => setSheet(open ? "translation" : null)}
					open={sheet === "translation"}
					translations={translations.data}
				/>
			) : null}
			<ChapterSheet
				bookName={book.name}
				bookSlug={bookSlug}
				chapter={chapter.chapter}
				chapterCount={chapter.chapterCount}
				onOpenChange={(open) => setSheet(open ? "chapters" : null)}
				open={sheet === "chapters"}
			/>
			<OptionsSheet
				onChange={changePreferences}
				onOpenChange={(open) => setSheet(open ? "options" : null)}
				open={sheet === "options"}
				preferences={preferences}
			/>
		</div>
	);
}
