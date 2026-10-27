import {
	getDocumentVerseReferences,
	getWordCount,
	type RichTextDocument,
} from "@berean-study/rich-text-editor/document";
import { Button } from "@berean-study/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
	buttonLinkClassName,
	JournalState,
	primaryButtonClassName,
} from "./journal-ui";
import type { AutosaveState, useJournalAutosave } from "./use-journal-autosave";

/*
 * The full-screen editor's page, shared by prayers, testimonies and
 * reflections: a top bar, the writing on the page itself (no box), the
 * labelled toolbar docked below it, and a footer with the word count and
 * the verses used.
 */

export type EntryKind = "prayer" | "reflection" | "testimony";

const tabRoutes = {
	prayer: "/library/prayers",
	reflection: "/library/reflections",
	testimony: "/library/testimonies",
} as const;

/** What the layout reads from an entry editor; it never changes the fields. */
export type EntryEditorView = {
	autosave: ReturnType<typeof useJournalAutosave>;
	canSave: boolean;
	isNew: boolean;
	savedId: number | null;
	values: { content: RichTextDocument };
};

export function EntryEditorLayout({
	aside,
	children,
	doneSearch,
	entry,
	incompleteMessage,
	kind,
	meta,
	title,
	topBarActions,
}: {
	/** Shown beside the writing on wide screens and below it on narrow ones. */
	aside?: ReactNode;
	children: ReactNode;
	doneSearch: Record<string, number>;
	entry: EntryEditorView;
	incompleteMessage: string;
	kind: EntryKind;
	meta: string;
	title?: ReactNode;
	/** Extra buttons placed before "Done", such as Hide prayer. */
	topBarActions?: ReactNode;
}) {
	const navigate = useNavigate();
	const content = entry.values.content;
	const verses = getDocumentVerseReferences(content);
	const words = getWordCount(content);
	const leave = useMutation({
		mutationFn: () => entry.autosave.flush(),
		onSettled: () => void navigate({ search: doneSearch, to: tabRoutes[kind] }),
	});
	// The type can only change before the entry exists. Reflections look back
	// on a prayer, so they don't offer the switch.
	const showTypeSwitch =
		kind !== "reflection" && entry.isNew && entry.savedId === null;

	return (
		<div className="flex min-h-svh flex-col bg-background">
			<header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-border/70 border-b bg-background/95 px-4 py-2.5 backdrop-blur sm:px-7">
				<Link
					className="flex min-h-11 items-center gap-2 rounded-lg font-semibold text-primary text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					onClick={(event) => {
						event.preventDefault();
						leave.mutate();
					}}
					to={tabRoutes[kind]}
				>
					<ArrowLeftIcon aria-hidden="true" className="size-4" />
					Prayer Journal
				</Link>
				{showTypeSwitch ? <TypeSwitch kind={kind} /> : null}
				<div className="flex flex-wrap items-center gap-2">
					<SaveStatus
						canSave={entry.canSave}
						incompleteMessage={incompleteMessage}
						onRetry={entry.autosave.retry}
						state={entry.autosave.state}
						wasSaved={entry.autosave.lastSavedAt !== null || !entry.isNew}
					/>
					{topBarActions}
					<Button
						className={primaryButtonClassName}
						disabled={leave.isPending}
						onClick={() => leave.mutate()}
					>
						Done
					</Button>
				</div>
			</header>
			<div className="flex flex-1 flex-wrap items-stretch">
				<div className="flex min-w-0 flex-[1_1_640px] justify-center px-4 pt-10 pb-10 sm:px-8 sm:pt-14">
					<main className="flex w-full min-w-0 max-w-170 flex-col gap-5">
						<span className="text-[13px] text-muted-foreground">{meta}</span>
						{title}
						{children}
						<footer className="flex flex-wrap items-center justify-between gap-3 border-border/70 border-t pt-4 text-[13px] text-muted-foreground">
							<span>{words === 1 ? "1 word" : `${words} words`}</span>
							{verses.length ? (
								<span className="flex flex-wrap items-center gap-2">
									Verses
									{verses.map((verse) => (
										<Link
											className="flex min-h-8 pointer-coarse:min-h-11 items-center rounded-full bg-scripture px-2.5 font-semibold text-scripture-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
											key={`${verse.label}|${verse.translation}`}
											search={{ passage: verse.passageId }}
											target="_blank"
											title={`${verse.label} (${verse.translation}), opens in Browse Scripture`}
											to="/bible"
										>
											{verse.label}
										</Link>
									))}
								</span>
							) : null}
						</footer>
					</main>
				</div>
				{aside}
			</div>
		</div>
	);
}

function TypeSwitch({ kind }: { kind: EntryKind }) {
	const options = [
		{ kind: "prayer", label: "Prayer", to: "/library/prayers/new" },
		{ kind: "testimony", label: "Testimony", to: "/library/testimonies/new" },
		{ kind: "reflection", label: "Reflection", to: "/library/reflections/new" },
	] as const;
	return (
		<nav
			aria-label="Entry type"
			className="flex gap-1 rounded-xl bg-secondary p-1"
		>
			{options.map((option) => (
				<Link
					aria-current={option.kind === kind ? "page" : undefined}
					className="flex min-h-9 pointer-coarse:min-h-11 items-center rounded-[9px] px-4 text-[13px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current=page]:bg-card aria-[current=page]:font-semibold aria-[current=page]:text-primary aria-[current=page]:shadow-sm"
					key={option.kind}
					replace
					to={option.to}
				>
					{option.label}
				</Link>
			))}
		</nav>
	);
}

function SaveStatus({
	canSave,
	incompleteMessage,
	onRetry,
	state,
	wasSaved,
}: {
	canSave: boolean;
	incompleteMessage: string;
	onRetry: () => void;
	state: AutosaveState;
	wasSaved: boolean;
}) {
	return (
		<span
			aria-live="polite"
			className="mr-2 flex items-center gap-1.5 text-[13px] text-muted-foreground"
			role="status"
		>
			{state === "failed" ? (
				<button
					className="min-h-11 rounded-sm text-destructive underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
					onClick={onRetry}
					type="button"
				>
					Couldn’t save — retry
				</button>
			) : state === "saving" || (state === "pending" && canSave) ? (
				"Saving…"
			) : state === "pending" ? (
				incompleteMessage
			) : wasSaved ? (
				<>
					<CheckIcon aria-hidden="true" className="size-4 text-success" />
					Saved
				</>
			) : (
				"Saves as you write"
			)}
		</span>
	);
}

export function TitleInput({
	onChange,
	placeholder = "Untitled",
	value,
}: {
	onChange: (value: string) => void;
	placeholder?: string;
	value: string;
}) {
	return (
		<label className="flex flex-col">
			<span className="sr-only">Title</span>
			<input
				className="w-full min-w-0 rounded-md border-none bg-transparent p-0 font-serif text-[30px] text-primary leading-[1.15] tracking-[-0.02em] outline-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-[34px]"
				maxLength={200}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				value={value}
			/>
		</label>
	);
}

/** The details column beside a prayer or testimony. */
export function SettingsAside({ children }: { children: ReactNode }) {
	return (
		<aside
			aria-label="Details"
			className="flex min-w-0 flex-[0_1_380px] flex-col gap-4.5 px-5 pb-10 sm:px-8 min-[1060px]:pt-14"
		>
			<section className="flex flex-col gap-4.5 rounded-[18px] border border-border bg-card p-5.5">
				{children}
			</section>
		</aside>
	);
}

export function LoadingEntry() {
	return (
		<div className="mx-auto max-w-3xl p-8">
			<JournalState>Loading…</JournalState>
		</div>
	);
}

export function MissingEntry({ kind }: { kind: EntryKind }) {
	return (
		<div className="mx-auto max-w-3xl p-8">
			<JournalState
				action={
					<Link
						className={buttonLinkClassName("default", primaryButtonClassName)}
						to={tabRoutes[kind]}
					>
						Back to Prayer Journal
					</Link>
				}
			>
				We couldn’t find that {kind}. It may have been deleted.
			</JournalState>
		</div>
	);
}

/**
 * The editor sits straight on the page: no border, box or fixed height. The
 * body is set in the serif at reading size, and the prompt shows in italics.
 */
export const pageEditorClassName =
	"overflow-visible! rounded-none! border-0! bg-transparent! shadow-none! focus-within:ring-0!";

export const documentClassName =
	"font-serif text-[18px]! leading-[1.75]! [&_.ProseMirror]:min-h-[280px]! [&_.ProseMirror]:max-w-none! [&_.ProseMirror]:p-0! [&_.ProseMirror>*:first-child]:mt-0! [&_.ProseMirror_p.is-editor-empty:first-child::before]:italic";
