import { Button, buttonVariants } from "@berean-study/ui/components/button";
import { cn } from "@berean-study/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PlusIcon, QuoteIcon } from "lucide-react";
import type { ReactNode } from "react";

import { prayerJournalCountsQueryOptions } from "@/queries/prayer-journal";

import {
	categoryTone,
	type FeaturedVerse,
	type JournalTab,
	journalTabs,
	type TagTone,
} from "./journal-copy";

/** Shared sizes so every journal control is at least 44px tall. */
export const primaryButtonClassName =
	"h-11 rounded-xl px-5 font-semibold text-sm";
export const secondaryButtonClassName =
	"h-11 rounded-xl border-border bg-card px-5 font-semibold text-primary text-sm";
/**
 * Button styling for a link. Navigation stays a real link (not a button), so
 * it opens in a new tab and screen readers announce it as a link.
 */
export function buttonLinkClassName(
	variant: "default" | "outline",
	className: string,
) {
	return cn(buttonVariants({ variant }), className);
}
export const cardClassName =
	"rounded-[20px] border border-border bg-card shadow-[0_1px_2px_rgb(27_46_75/0.04),0_8px_24px_rgb(27_46_75/0.04)]";
export const fieldClassName =
	"h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3.5 text-[15px] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10";

const newEntryRoutes = {
	prayers: "/library/prayers/new",
	reflections: "/library/reflections/new",
	testimonies: "/library/testimonies/new",
} as const;

const tabRoutes = {
	prayers: "/library/prayers",
	reflections: "/library/reflections",
	testimonies: "/library/testimonies",
} as const;

/**
 * The Prayer Journal frame: title, the tab's "New …" button, and the three
 * tabs. Each tab is its own page, so it can be linked and Back works.
 */
export function JournalPage({
	beforeTabs,
	children,
	tab,
	tabsToolbar,
}: {
	beforeTabs?: ReactNode;
	children: ReactNode;
	tab: JournalTab;
	/** Filters shown on the right of the tab row. */
	tabsToolbar?: ReactNode;
}) {
	const counts = useQuery(prayerJournalCountsQueryOptions()).data;
	const current = journalTabs.find((item) => item.tab === tab);

	return (
		<div className="contain-[inline-size] min-h-full px-4 py-8 sm:px-8 lg:py-10">
			<main className="mx-auto flex w-full max-w-295 flex-col gap-6">
				<header className="flex flex-wrap items-end justify-between gap-5">
					<div className="flex flex-col gap-1.5">
						{/* TODO: the design uses Newsreader for display type; switching
						    the app's serif is a separate, app-wide decision. */}
						<h1 className="font-serif text-4xl text-primary leading-[1.05] tracking-[-0.03em] sm:text-5xl">
							Prayer Journal
						</h1>
						<p className="text-base text-muted-foreground">
							Bring your requests to God and keep a record of His faithfulness.
						</p>
					</div>
					<Link
						className={buttonLinkClassName("default", primaryButtonClassName)}
						to={newEntryRoutes[tab]}
					>
						<PlusIcon data-icon="inline-start" />
						{current?.newLabel}
					</Link>
				</header>
				{beforeTabs}
				<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-border border-b">
					<nav aria-label="Journal sections" className="flex gap-7">
						{journalTabs.map((item) => {
							const selected = item.tab === tab;
							const count = counts?.[item.tab];
							return (
								<Link
									aria-current={selected ? "page" : undefined}
									className={cn(
										"-mb-px flex min-h-11 items-center gap-2 border-b-2 py-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
										selected
											? "border-primary font-semibold text-primary"
											: "border-transparent text-muted-foreground hover:text-foreground",
									)}
									key={item.tab}
									to={tabRoutes[item.tab]}
								>
									{item.label}
									{count === undefined ? null : (
										<span
											className={cn(
												"rounded-full px-2 py-px font-normal text-xs",
												selected
													? "bg-primary text-primary-foreground"
													: "bg-secondary text-secondary-foreground",
											)}
										>
											<span className="sr-only">(</span>
											{count}
											<span className="sr-only"> entries)</span>
										</span>
									)}
								</Link>
							);
						})}
					</nav>
					{tabsToolbar ? (
						<div className="mb-2 flex flex-wrap items-center gap-2.5">
							{tabsToolbar}
						</div>
					) : null}
				</div>
				{children}
			</main>
		</div>
	);
}

/** A row of mutually exclusive buttons, like All / For me / For others. */
export function SegmentedControl<Value extends string>({
	label,
	onChange,
	options,
	value,
}: {
	label: string;
	onChange: (value: Value) => void;
	options: readonly { label: string; value: Value }[];
	value: Value;
}) {
	return (
		<fieldset className="flex min-w-0 gap-1 rounded-xl bg-secondary p-1">
			<legend className="sr-only">{label}</legend>
			{options.map((option) => (
				<button
					aria-pressed={option.value === value}
					className="min-h-9 pointer-coarse:min-h-11 rounded-[9px] px-3.5 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-primary aria-pressed:shadow-sm"
					key={option.value}
					onClick={() => onChange(option.value)}
					type="button"
				>
					{option.label}
				</button>
			))}
		</fieldset>
	);
}

/** A labelled native select styled to match the journal's controls. */
export function InlineSelect({
	children,
	label,
	onChange,
	value,
}: {
	children: ReactNode;
	label: string;
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<label className="flex h-11 items-center gap-2 rounded-xl border border-input bg-card px-3 text-[13px] text-muted-foreground focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
			{label}
			<select
				className="max-w-48 truncate bg-transparent text-foreground text-sm outline-none"
				onChange={(event) => onChange(event.target.value)}
				value={value}
			>
				{children}
			</select>
		</label>
	);
}

const tagToneClassNames: Record<TagTone, string> = {
	gold: "bg-scripture text-scripture-foreground",
	green: "bg-section-apply text-section-apply-foreground",
	navy: "bg-section-observe text-section-observe-foreground",
	neutral: "bg-secondary text-secondary-foreground",
};

export function Tag({
	children,
	tone = "neutral",
}: {
	children: ReactNode;
	tone?: TagTone;
}) {
	return (
		<span
			className={cn(
				"inline-flex w-fit items-center rounded-full px-2.5 py-0.5 font-semibold text-xs",
				tagToneClassNames[tone],
			)}
		>
			{children}
		</span>
	);
}

export function CategoryTag({ category }: { category: string }) {
	return <Tag tone={categoryTone(category)}>{category}</Tag>;
}

/** A small uppercase heading, like "Updates" or "Earlier". */
export function SectionLabel({
	as: Heading = "h2",
	children,
	className,
	id,
}: {
	as?: "h2" | "h3" | "span";
	children: ReactNode;
	className?: string;
	id?: string;
}) {
	return (
		<Heading
			className={cn(
				"font-semibold text-[13px] text-muted-foreground uppercase tracking-[0.08em]",
				className,
			)}
			id={id}
		>
			{children}
		</Heading>
	);
}

/**
 * A short verse set apart on the page. `featured` is the deep navy card;
 * `quiet` sits on the soft panel colour.
 */
export function VerseCard({
	className,
	variant = "featured",
	verse,
}: {
	className?: string;
	variant?: "featured" | "quiet";
	verse: FeaturedVerse;
}) {
	if (variant === "quiet")
		return (
			<figure
				className={cn(
					"flex flex-col justify-center gap-1 rounded-[14px] bg-secondary px-4.5 py-4",
					className,
				)}
			>
				<blockquote className="font-serif text-[15px] text-foreground/85 italic leading-snug">
					“{verse.text}”
				</blockquote>
				<figcaption className="font-semibold text-muted-foreground text-xs">
					{verse.reference}
				</figcaption>
			</figure>
		);
	return (
		<figure
			className={cn(
				// The navy card would turn light blue in dark mode, so it uses the
				// card colour there and keeps the gold reference readable.
				"flex flex-col gap-3.5 rounded-4xl bg-primary px-6.5 py-7 text-primary-foreground dark:border dark:border-border dark:bg-card dark:text-foreground",
				className,
			)}
		>
			<QuoteIcon
				aria-hidden="true"
				className="size-6 fill-accent text-accent dark:fill-scripture-accent dark:text-scripture-accent"
			/>
			<blockquote className="font-serif text-xl italic leading-[1.45]">
				{verse.text}
			</blockquote>
			<figcaption className="font-semibold text-[13px] text-accent tracking-[0.03em] dark:text-scripture-foreground">
				{verse.reference}
			</figcaption>
		</figure>
	);
}

/** A loading or error message in place of a tab's content. */
export function JournalState({
	action,
	children,
}: {
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				cardClassName,
				"flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground",
			)}
			role="status"
		>
			<p>{children}</p>
			{action}
		</div>
	);
}

export function RetryButton({ onRetry }: { onRetry: () => void }) {
	return (
		<Button
			className={secondaryButtonClassName}
			onClick={onRetry}
			variant="outline"
		>
			Try again
		</Button>
	);
}
