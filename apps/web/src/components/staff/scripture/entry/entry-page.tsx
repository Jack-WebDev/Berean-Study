import { formatVerseList } from "@berean-study/db/verse-text-tools";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDownIcon } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

import {
	addChapter,
	addVerse,
	removeLastChapter,
	removeLastVerse,
	sendChapterForProofreading,
} from "@/functions/verse-entry";
import { formatStaffDateTime } from "@/lib/format";
import { entryChapterQueryOptions } from "@/queries/verse-text";

import { StaffButton, staffLinkClassName } from "../../staff-button";
import { StaffCard } from "../../staff-card";
import { StaffPage } from "../../staff-page";
import { useVerseTextMutation } from "../verse-text-display";
import { PastePanel } from "./paste-panel";
import { type DraftSaveState, useChapterDrafts } from "./use-chapter-drafts";
import { editableStatuses, VerseRow, verseFieldId } from "./verse-row";

type EntryInput = Parameters<typeof entryChapterQueryOptions>[0];
type EntryData = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof entryChapterQueryOptions>["queryFn"]>
		>
	>
>;

/** Long chapters open at the work still to do, with what's finished folded away. */
const FOLD_FINISHED_FROM = 5;

export function EntryPage({ input }: { input: EntryInput }) {
	const { data } = useSuspenseQuery(entryChapterQueryOptions(input));

	if (!data) {
		return (
			<StaffPage section="Contributor" title="Scripture entry">
				<StaffCard>
					<p className="text-sm" role="alert">
						The translations and books haven't been set up yet. Run
						db:scripture:sync.
					</p>
				</StaffCard>
			</StaffPage>
		);
	}

	if (data.chapter === null) {
		return (
			<EntryFrame data={data}>
				<StaffCard title={`No chapters of ${data.book.name} yet`}>
					<p className="max-w-[65ch] text-muted-foreground text-sm">
						Add chapter 1 to start. Chapters and verses are created as they're
						entered, and nothing is shown to readers until it has been proofread
						and published.
					</p>
				</StaffCard>
			</EntryFrame>
		);
	}

	return (
		<ChapterEditor
			chapter={data.chapter}
			data={data}
			key={`${data.translation.abbreviation}-${data.book.slug}-${data.chapter}`}
		/>
	);
}

function EntryFrame({
	actions,
	children,
	data,
}: {
	actions?: ReactNode;
	children: ReactNode;
	data: EntryData;
}) {
	return (
		<StaffPage
			actions={
				<>
					<Link
						className={staffLinkClassName}
						to="/work/scripture/proofreading"
					>
						Proofreading
					</Link>
					{actions}
				</>
			}
			description="Type or paste verses as they appear in print. Someone else checks them before readers see anything."
			section="Contributor"
			title="Scripture entry"
		>
			<TranslationLinks data={data} />
			<BookAndChapterBar data={data} />
			<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
				<div className="min-w-0 space-y-4">{children}</div>
				<EntrySidePanel data={data} />
			</div>
		</StaffPage>
	);
}

function TranslationLinks({ data }: { data: EntryData }) {
	return (
		<nav aria-label="Translation">
			<ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
				{data.translations.map((translation) => {
					const active =
						translation.abbreviation === data.translation.abbreviation;
					const share =
						translation.total > 0
							? (translation.entered / translation.total) * 100
							: 0;
					return (
						<li key={translation.abbreviation}>
							<Link
								aria-current={active ? "true" : undefined}
								className={cn(
									"flex h-full flex-col gap-1 rounded-xl border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									active
										? "border-accent bg-sidebar-accent"
										: "border-border bg-card hover:bg-muted",
								)}
								search={{
									book: data.book.slug,
									chapter: data.chapter ?? undefined,
									t: translation.abbreviation,
								}}
								to="/work/scripture"
							>
								<span className="font-bold">{translation.abbreviation}</span>
								<span className="text-muted-foreground text-xs">
									{translation.entered > 0
										? `${translation.entered} / ${translation.total} verses`
										: "Not started"}
								</span>
								<span
									aria-hidden="true"
									className="block h-1 overflow-hidden rounded-full bg-progress-not-started"
								>
									<span
										className="block h-full rounded-full bg-progress-published"
										style={{ width: `${share}%` }}
									/>
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

function BookAndChapterBar({ data }: { data: EntryData }) {
	const navigate = useNavigate();
	const bookId = useId();
	const { abbreviation } = data.translation;

	const add = useVerseTextMutation(
		() => addChapter({ data: { abbreviation, slug: data.book.slug } }),
		({ number }) =>
			void navigate({
				search: { book: data.book.slug, chapter: number, t: abbreviation },
				to: "/work/scripture",
			}),
	);

	return (
		<section
			aria-label="Book and chapter"
			className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-border bg-card p-4"
		>
			<div className="flex items-center gap-2">
				<label className="font-semibold text-sm" htmlFor={bookId}>
					Book
				</label>
				<div className="relative">
					<select
						className="h-11 appearance-none rounded-[0.625rem] border border-border bg-background pr-9 pl-3 font-medium text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						id={bookId}
						onChange={(event) =>
							void navigate({
								search: { book: event.target.value, t: abbreviation },
								to: "/work/scripture",
							})
						}
						value={data.book.slug}
					>
						{data.books.map(({ name, slug }) => (
							<option key={slug} value={slug}>
								{name}
							</option>
						))}
					</select>
					<ChevronDownIcon
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
				</div>
			</div>

			<nav aria-label="Chapter" className="min-w-0 flex-1 basis-64">
				<ul className="flex flex-wrap items-center gap-1.5">
					{data.chapters.map((chapter) => {
						const active = chapter.number === data.chapter;
						return (
							<li key={chapter.number}>
								<Link
									aria-current={active ? "true" : undefined}
									aria-label={`Chapter ${chapter.number}${chapter.state === "published" ? ", published" : ""}`}
									className={cn(
										"grid size-11 place-items-center rounded-[0.625rem] border font-bold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										active
											? "border-primary bg-primary text-primary-foreground"
											: chapter.state === "published"
												? "border-transparent bg-status-success text-status-success-foreground"
												: "border-border bg-background hover:bg-muted",
									)}
									search={{
										book: data.book.slug,
										chapter: chapter.number,
										t: abbreviation,
									}}
									to="/work/scripture"
								>
									{chapter.number}
								</Link>
							</li>
						);
					})}
					{data.nextChapter ? (
						<li>
							<StaffButton
								className="border-accent border-dashed"
								disabled={add.isPending}
								onClick={() => add.mutate(undefined)}
								variant="outline"
							>
								+ Add chapter {data.nextChapter}
							</StaffButton>
						</li>
					) : null}
				</ul>
			</nav>
		</section>
	);
}

function EntrySidePanel({ data }: { data: EntryData }) {
	const { abbreviation, publishingBlock } = data.translation;
	return (
		<aside className="space-y-4">
			<StaffCard title="This chapter">
				<ul>
					{data.translations.map(({ abbreviation, entered, total }) => {
						const short = entered > 0 && entered < total;
						return (
							<li
								className="flex items-center gap-2 border-border-subtle border-t py-1.5 text-sm first:border-t-0"
								key={abbreviation}
							>
								<span className="w-12 font-semibold">{abbreviation}</span>
								<span className="flex-1 text-muted-foreground">
									{entered === 0
										? "Not started"
										: `${entered} of ${total} verses`}
								</span>
								<span
									className={cn(
										"size-2.5 rounded-full",
										short ? "bg-accent" : "bg-progress-published",
										entered === 0 && "bg-progress-not-started",
									)}
								>
									{short ? (
										<span className="sr-only">
											Fewer verses than the chapter has
										</span>
									) : null}
								</span>
							</li>
						);
					})}
				</ul>
				<p className="mt-2 text-muted-foreground text-xs">
					Verse counts are compared across translations, so a skipped verse
					stands out.
				</p>
			</StaffCard>

			<StaffCard>
				<h2 className="font-semibold text-sm">What happens next</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Someone else proofreads the chapter against their copy. Once it
					passes, it can be published. Readers never see unchecked text.
				</p>
			</StaffCard>

			{publishingBlock === "permission_not_recorded" ? (
				<StaffCard>
					<h2 className="font-semibold text-sm">
						{abbreviation} needs permission to publish
					</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						You can enter and proofread it now. Publishing stays locked until
						the rights holder's permission is recorded on the Translations page.
					</p>
				</StaffCard>
			) : null}
			{publishingBlock === "licence_ended" ? (
				<StaffCard>
					<h2 className="font-semibold text-sm">
						The {abbreviation} licence has ended
					</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						You can keep entering and proofreading, but publishing stays locked
						until the licence is renewed.
					</p>
				</StaffCard>
			) : null}
		</aside>
	);
}

function saveStatusLabel(state: DraftSaveState, savedAt: Date | null) {
	if (state === "saving") return "Saving…";
	if (state === "pending") return "Unsaved changes";
	if (state === "failed") return "Not saved";
	return savedAt ? `Saved ${formatStaffDateTime(savedAt)}` : null;
}

function ChapterEditor({
	chapter,
	data,
}: {
	chapter: number;
	data: EntryData;
}) {
	const navigate = useNavigate();
	const { abbreviation } = data.translation;
	const address = { abbreviation, chapter, slug: data.book.slug };
	const reference = `${data.book.name} ${chapter}`;
	const [mode, setMode] = useState<"paste" | "verse">("verse");
	const [showFinished, setShowFinished] = useState(false);
	const drafts = useChapterDrafts(address, data.verses);
	const { flush, keepWording, setVerseText } = drafts;

	const pendingFocus = useRef<number | null>(null);
	const addButton = useRef<HTMLButtonElement>(null);

	const textOf = (verse: EntryData["verses"][number]) =>
		drafts.edits[verse.number] ?? verse.text;
	const isEditable = (verse: EntryData["verses"][number]) =>
		verse.needsOwnText && editableStatuses.includes(verse.status);

	const unsentCount = data.verses.filter(
		(verse) =>
			isEditable(verse) && verse.status !== "needs_fix" && textOf(verse).trim(),
	).length;
	const editableNumbers = data.verses.filter(isEditable).map((v) => v.number);
	const editableNumbersRef = useRef(editableNumbers);
	editableNumbersRef.current = editableNumbers;

	const focusNextVerse = useCallback((number: number) => {
		const next = editableNumbersRef.current.find((other) => other > number);
		if (next) document.getElementById(verseFieldId(next))?.focus();
		else addButton.current?.focus();
	}, []);

	const add = useVerseTextMutation(
		() => addVerse({ data: address }),
		() => {
			pendingFocus.current = data.nextVerse;
		},
	);
	const removeVerse = useVerseTextMutation((verse: number) =>
		removeLastVerse({ data: { ...address, verse } }),
	);
	const removeChapter = useVerseTextMutation(
		() => removeLastChapter({ data: address }),
		() =>
			void navigate({
				search: { book: data.book.slug, t: abbreviation },
				to: "/work/scripture",
			}),
	);
	const send = useVerseTextMutation(
		async () => {
			if (!(await flush())) {
				throw new Error("Your changes couldn't be saved, so nothing was sent.");
			}
			return sendChapterForProofreading({ data: address });
		},
		({ sent }) => {
			drafts.discard();
			toast.success(
				`Sent ${sent} ${sent === 1 ? "verse" : "verses"} for proofreading.`,
			);
		},
	);

	// A new verse's box only exists once the refreshed chapter has arrived.
	useEffect(() => {
		if (pendingFocus.current === null) return;
		const field = document.getElementById(verseFieldId(pendingFocus.current));
		if (field) {
			field.focus();
			pendingFocus.current = null;
		}
	});

	const firstUnfinished = data.verses.findIndex(isEditable);
	const finishedCount =
		firstUnfinished === -1 ? data.verses.length : firstUnfinished;
	const foldFinished = !showFinished && finishedCount >= FOLD_FINISHED_FROM;
	const visibleVerses = foldFinished
		? data.verses.slice(finishedCount)
		: data.verses;
	const lastVerse = data.verses.at(-1);
	const status = saveStatusLabel(drafts.state, drafts.savedAt);

	return (
		<EntryFrame
			actions={
				<>
					<StaffButton onClick={() => void flush()} variant="outline">
						Save draft
					</StaffButton>
					<StaffButton
						disabled={unsentCount === 0 || send.isPending}
						onClick={() => send.mutate(undefined)}
					>
						Send for proofreading
					</StaffButton>
				</>
			}
			data={data}
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-serif text-3xl tracking-[-0.01em]">
						{reference}{" "}
						<span className="text-muted-foreground text-xl">
							· {abbreviation}
						</span>
					</h2>
					{status ? (
						<p className="text-muted-foreground text-xs" role="status">
							{status}
						</p>
					) : null}
				</div>
				<fieldset className="flex gap-1 rounded-[0.625rem] border-0 bg-muted p-1">
					<legend className="sr-only">Entry mode</legend>
					{(
						[
							["verse", "Verse by verse"],
							["paste", "Paste a passage"],
						] as const
					).map(([value, label]) => (
						<button
							aria-pressed={mode === value}
							className={cn(
								"min-h-9 rounded-lg px-3 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								mode === value
									? "bg-card text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
							key={value}
							onClick={() => setMode(value)}
							type="button"
						>
							{label}
						</button>
					))}
				</fieldset>
			</div>

			{drafts.error ? (
				<div
					className="flex flex-wrap items-center justify-between gap-3 rounded-[0.625rem] bg-status-danger p-3 text-sm text-status-danger-foreground"
					role="alert"
				>
					<p className="min-w-0 flex-1 basis-64">{drafts.error}</p>
					<StaffButton onClick={() => void drafts.reload()} variant="outline">
						Discard my changes and reload
					</StaffButton>
				</div>
			) : null}

			{mode === "paste" ? (
				<PastePanel
					onApply={async (verses) => {
						const saved = await drafts.savePasted(verses);
						if (saved) setMode("verse");
						return saved;
					}}
					onCancel={() => setMode("verse")}
					reference={reference}
					verses={data.verses}
				/>
			) : (
				<StaffCard className="py-2 sm:py-2">
					{data.verses.length === 0 ? (
						<div className="space-y-3 py-5">
							<h3 className="font-serif text-xl">
								Chapter {chapter} is new and empty
							</h3>
							<p className="text-muted-foreground text-sm">
								Paste the whole chapter, or add verse 1 and type it in. Verses
								are created as you go.
							</p>
							<div className="flex flex-wrap gap-2">
								<StaffButton onClick={() => setMode("paste")}>
									Paste the chapter
								</StaffButton>
								{data.canRemoveChapter ? (
									<StaffButton
										disabled={removeChapter.isPending}
										onClick={() => removeChapter.mutate(undefined)}
										variant="outline"
									>
										Remove chapter {chapter}
									</StaffButton>
								) : null}
							</div>
						</div>
					) : null}

					{foldFinished ? (
						<p className="border-border-subtle border-b py-3 text-muted-foreground text-sm">
							Verses{" "}
							{formatVerseList(
								data.verses.slice(0, finishedCount).map(({ number }) => number),
							)}{" "}
							are finished or being checked.{" "}
							<button
								className="underline underline-offset-2"
								onClick={() => setShowFinished(true)}
								type="button"
							>
								Show
							</button>
						</p>
					) : null}

					{visibleVerses.map((verse) => (
						<VerseRow
							bookSlug={data.book.slug}
							chapter={chapter}
							key={verse.number}
							onEnterAtEnd={focusNextVerse}
							onKeepWording={keepWording}
							onTextChange={setVerseText}
							reference={reference}
							text={textOf(verse)}
							translation={abbreviation}
							verse={verse}
						/>
					))}

					<div className="flex flex-wrap items-center gap-3 py-3">
						<StaffButton
							className="border-dashed"
							disabled={add.isPending}
							onClick={() => add.mutate(undefined)}
							ref={addButton}
							variant="outline"
						>
							+ Add verse {data.nextVerse}
						</StaffButton>
						{data.canRemoveLastVerse && lastVerse ? (
							<StaffButton
								disabled={removeVerse.isPending}
								onClick={() => removeVerse.mutate(lastVerse.number)}
								variant="ghost"
							>
								Remove verse {lastVerse.number}
							</StaffButton>
						) : null}
						<span className="text-muted-foreground text-xs">
							Tip: press Enter at the end of a verse to start the next one.
						</span>
					</div>
				</StaffCard>
			)}
		</EntryFrame>
	);
}
