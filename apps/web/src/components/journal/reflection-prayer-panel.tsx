import type { PrayerDetail } from "@berean-study/db/prayers";
import {
	getDocumentVerseReferences,
	getExcerpt,
} from "@berean-study/rich-text-editor/document";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@berean-study/ui/components/sheet";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, PanelRightIcon } from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useState,
	useSyncExternalStore,
} from "react";

import { formatShortDate } from "@/utils/dates";
import { CategoryTag, SectionLabel } from "./journal-ui";
import { QuotedVerse } from "./quoted-verse";

const storageKey = "berean.journal.prayer-panel";
const wideQuery = "(min-width: 1200px)";

/**
 * Whether the prayer panel is showing. On wide screens it sits beside the
 * writing and the member's choice is remembered on this device (open unless
 * they hid it). Narrower screens have no room beside the writing, so the
 * button opens it as a sheet instead, closed each time the page loads.
 */
export function usePrayerPanel() {
	const isWide = useMediaQuery(wideQuery);
	const [hidden, setHidden] = useState(false);
	const [sheetOpen, setSheetOpen] = useState(false);

	useEffect(() => {
		setHidden(readStoredChoice() === "hidden");
	}, []);

	const open = isWide ? !hidden : sheetOpen;
	const toggle = () => {
		if (!isWide) return setSheetOpen((current) => !current);
		setHidden(!hidden);
		storeChoice(hidden ? "shown" : "hidden");
	};
	return { isWide, open, setSheetOpen, toggle };
}

export function PrayerPanelToggle({
	onToggle,
	open,
}: {
	onToggle: () => void;
	open: boolean;
}) {
	return (
		<button
			aria-pressed={open}
			className="flex h-11 items-center gap-2 rounded-xl border border-input bg-card px-3.5 font-semibold text-primary text-sm outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50"
			onClick={onToggle}
			type="button"
		>
			<PanelRightIcon aria-hidden="true" className="size-4" />
			{open ? "Hide prayer" : "Show prayer"}
		</button>
	);
}

/** The panel beside the writing on wide screens. */
export function PrayerPanelAside({ prayer }: { prayer: PrayerDetail }) {
	const headingId = useId();
	return (
		<aside
			aria-labelledby={headingId}
			className="flex min-w-75 flex-[0_1_400px] flex-col gap-5.5 border-border/70 border-l bg-card/45 px-8 py-10"
		>
			<PrayerPanelContent headingId={headingId} prayer={prayer} />
		</aside>
	);
}

/** The same panel as a sheet, for screens too narrow to show it beside the writing. */
export function PrayerPanelSheet({
	onOpenChange,
	open,
	prayer,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
	prayer: PrayerDetail;
}) {
	const headingId = useId();
	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent className="w-[min(92vw,420px)] gap-0 overflow-y-auto bg-background text-sm sm:max-w-105">
				<SheetHeader className="sr-only">
					<SheetTitle>The prayer you’re looking back on</SheetTitle>
				</SheetHeader>
				<div className="flex flex-col gap-5.5 px-6 pt-12 pb-8">
					<PrayerPanelContent headingId={headingId} prayer={prayer} />
				</div>
			</SheetContent>
		</Sheet>
	);
}

function PrayerPanelContent({
	headingId,
	prayer,
}: {
	headingId: string;
	prayer: PrayerDetail;
}) {
	const verse = getDocumentVerseReferences(prayer.content)[0]?.attributes;
	const excerpt = getExcerpt(prayer.content, 360);
	const days = Math.floor(
		(Date.now() - new Date(prayer.createdAt).getTime()) / (24 * 60 * 60 * 1000),
	);

	return (
		<>
			<div className="flex flex-col gap-2.5">
				<SectionLabel as="span" className="text-xs">
					Looking back on
				</SectionLabel>
				<h2
					className="font-serif text-2xl text-primary leading-tight"
					id={headingId}
				>
					{prayer.title}
				</h2>
				<span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
					{prayer.category ? <CategoryTag category={prayer.category} /> : null}
					Prayed since {formatShortDate(prayer.createdAt)} ·{" "}
					{days < 1 ? "started today" : days === 1 ? "1 day" : `${days} days`}
				</span>
			</div>
			{excerpt ? (
				<p className="font-serif text-base text-foreground/90 leading-relaxed">
					“{excerpt}”
				</p>
			) : null}
			{verse ? (
				<figure className="flex flex-col gap-1 rounded-xl bg-scripture px-4 py-3.5">
					<QuotedVerse size="small" verse={verse} />
				</figure>
			) : null}
			{prayer.updates.length ? (
				<section
					aria-labelledby={`${headingId}-updates`}
					className="flex flex-col gap-3"
				>
					<SectionLabel as="h3" className="text-xs" id={`${headingId}-updates`}>
						Along the way
					</SectionLabel>
					<ol className="flex flex-col gap-3">
						{prayer.updates.map((update) => (
							<li className="flex gap-3" key={update.id}>
								<span
									aria-hidden="true"
									className="mt-1.75 size-2 flex-none rounded-full bg-scripture-accent"
								/>
								<span className="flex flex-col gap-0.5">
									<span className="text-muted-foreground text-xs">
										{formatShortDate(update.createdAt)}
									</span>
									<span className="text-foreground/90 text-sm leading-relaxed">
										{update.text}
									</span>
								</span>
							</li>
						))}
					</ol>
				</section>
			) : null}
			<Link
				className="flex min-h-11 w-fit items-center gap-1.5 rounded-lg font-semibold text-primary text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
				search={{ prayer: prayer.id }}
				to="/library/prayers"
			>
				Open prayer
				<ArrowRightIcon aria-hidden="true" className="size-4" />
			</Link>
		</>
	);
}

function useMediaQuery(query: string) {
	const subscribe = useCallback(
		(onChange: () => void) => {
			const media = window.matchMedia(query);
			media.addEventListener("change", onChange);
			return () => media.removeEventListener("change", onChange);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		// The server can't know the screen size; render the narrow layout.
		() => false,
	);
}

// Browser storage can be unavailable (private windows, blocked site data);
// the panel then simply falls back to its default.
function readStoredChoice() {
	try {
		return window.localStorage.getItem(storageKey);
	} catch {
		return null;
	}
}

function storeChoice(choice: "hidden" | "shown") {
	try {
		window.localStorage.setItem(storageKey, choice);
	} catch {
		// Ignore: the choice just won't be remembered.
	}
}
