import {
	BookmarkIcon,
	ChevronRightIcon,
	Clock3Icon,
	HighlighterIcon,
	NotebookPenIcon,
} from "lucide-react";
import type { ComponentType } from "react";

type Icon = ComponentType<{
	className?: string;
	"aria-hidden"?: boolean | "true" | "false";
}>;

export function StudyJourney() {
	return (
		<section className="rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-sm">
			<header>
				<h2 className="font-serif text-xl tracking-[-0.015em]">
					Your Study Journey
				</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					A quick snapshot of your activity.
				</p>
			</header>
			<div className="mt-4 divide-y divide-border/60 border-border/60 border-t">
				<JourneyItem icon={NotebookPenIcon} label="Notes" value="0" />
				<JourneyItem
					accent
					icon={HighlighterIcon}
					label="Highlights"
					value="0"
				/>
				<JourneyItem icon={BookmarkIcon} label="Bookmarks" value="0" />
				<JourneyItem
					description="No reading position yet"
					icon={Clock3Icon}
					label="Continue Reading"
				/>
			</div>
		</section>
	);
}

function JourneyItem({
	icon: Icon,
	label,
	value,
	description,
	accent = false,
}: {
	icon: Icon;
	label: string;
	value?: string;
	description?: string;
	accent?: boolean;
}) {
	return (
		<div className="flex w-full items-center gap-3 py-4 text-left">
			<Icon
				aria-hidden="true"
				className={
					accent
						? "size-[1.1rem] shrink-0 text-accent"
						: "size-[1.1rem] shrink-0 text-foreground/80"
				}
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm">{label}</p>
				{description ? (
					<p className="mt-0.5 truncate text-muted-foreground text-xs">
						{description}
					</p>
				) : null}
			</div>
			{value ? <span className="text-sm">{value}</span> : null}
			<ChevronRightIcon
				aria-hidden="true"
				className="size-4 text-muted-foreground"
			/>
		</div>
	);
}

export function ScriptureCard() {
	return (
		<section className="relative hidden min-h-70 overflow-hidden rounded-2xl border border-border bg-secondary md:block">
			<div className="absolute inset-0 bg-linear-to-br from-card/70 to-transparent" />
			<div className="absolute inset-x-0 bottom-0 h-24 opacity-40">
				<div className="absolute -bottom-12 -left-8 h-28 w-56 rotate-[8deg] rounded-[50%] bg-muted-foreground" />
				<div className="absolute -right-10 -bottom-14 h-32 w-64 rotate-[-8deg] rounded-[50%] bg-foreground" />
				<div className="absolute -bottom-12 left-24 h-24 w-52 rounded-[50%] bg-accent" />
			</div>
			<blockquote className="relative z-10 px-7 py-7">
				<p className="font-serif text-[1.28rem] leading-[1.45] tracking-[-0.015em]">
					“Be diligent to present yourself approved to God, a worker who has no
					need to be ashamed, rightly dividing the word of truth.”
				</p>
				<footer className="mt-4 text-sm">2 Timothy 2:15</footer>
			</blockquote>
		</section>
	);
}
