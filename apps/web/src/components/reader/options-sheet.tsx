import type {
	LineLength,
	PageColour,
	ReadingPreferences,
	VerseLayout,
} from "@berean-study/db/reader-catalogue";
import type { ReactNode } from "react";

import { BottomSheet } from "@/components/reader-ui/bottom-sheet";
import { ChoiceGroup, ChoiceTile } from "@/components/reader-ui/choice-group";
import { SwitchRow } from "@/components/reader-ui/switch-row";
import { readerFlags } from "@/lib/reader-flags";

import type { ReadingPreferenceChanges } from "./reading-preferences";
import { NotePencil, StudyDot } from "./verse-list";

const pageColours: Array<{ label: string; swatch: string; value: PageColour }> =
	[
		{ label: "Light", swatch: "bg-[oklch(0.985_0.008_85)]", value: "light" },
		{ label: "Dark", swatch: "bg-[oklch(0.17_0.025_255)]", value: "dark" },
		{
			label: "Match my device",
			swatch:
				"bg-[linear-gradient(135deg,oklch(0.985_0.008_85)_50%,oklch(0.17_0.025_255)_50%)]",
			value: "system",
		},
	];

const lineLengths: Array<{ label: string; value: LineLength }> = [
	{ label: "Short", value: "narrow" },
	{ label: "Medium", value: "default" },
	{ label: "Long", value: "wide" },
];

function SheetSection({
	children,
	id,
	title,
}: {
	children: ReactNode;
	id: string;
	title: string;
}) {
	return (
		<section
			aria-labelledby={id}
			className="border-border border-b py-4 first:pt-0"
		>
			<h3 className="mb-3 font-bold text-[18px]" id={id}>
				{title}
			</h3>
			{children}
		</section>
	);
}

/** Reading options (HANDOFF Screen 1). Every change applies and saves straight away. */
export function OptionsSheet({
	onChange,
	onOpenChange,
	open,
	preferences,
}: {
	onChange: (changes: ReadingPreferenceChanges) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	preferences: ReadingPreferences;
}) {
	return (
		<BottomSheet
			kind="tall"
			onOpenChange={onOpenChange}
			open={open}
			title="Reading options"
		>
			<SheetSection id="options-colour" title="Page colour">
				<ChoiceGroup
					className="grid-cols-3"
					label="Page colour"
					onValueChange={(pageColour: PageColour) => onChange({ pageColour })}
					value={preferences.pageColour}
				>
					{pageColours.map((colour) => (
						<ChoiceTile
							className="min-h-[92px]"
							key={colour.value}
							label={colour.label}
							value={colour.value}
						>
							<span
								aria-hidden="true"
								className={`size-7 rounded-full border border-border-strong ${colour.swatch}`}
							/>
						</ChoiceTile>
					))}
				</ChoiceGroup>
			</SheetSection>

			<SheetSection id="options-layout" title="How verses appear">
				<ChoiceGroup
					className="grid-cols-2"
					label="How verses appear"
					onValueChange={(verseLayout: VerseLayout) =>
						onChange({ verseLayout })
					}
					value={preferences.verseLayout}
				>
					<ChoiceTile label="One verse per line" value="verse" />
					<ChoiceTile label="As a paragraph" value="paragraph" />
				</ChoiceGroup>
				<SwitchRow
					checked={preferences.showVerseNumbers}
					className="mt-2"
					label="Show verse numbers"
					onCheckedChange={(showVerseNumbers) => onChange({ showVerseNumbers })}
				/>
				{readerFlags.sectionHeadings ? (
					<SwitchRow
						checked={preferences.showSectionHeadings}
						help="Short headings written by Berean Study. They are not part of the Bible text."
						label="Show section headings"
						onCheckedChange={(showSectionHeadings) =>
							onChange({ showSectionHeadings })
						}
					/>
				) : null}
			</SheetSection>

			{/* Phones are narrow enough already, so line length is for wider screens. */}
			<div className="hidden md:block">
				<SheetSection id="options-line-length" title="Line length">
					<ChoiceGroup
						className="grid-cols-3"
						label="Line length"
						onValueChange={(lineLength: LineLength) => onChange({ lineLength })}
						value={preferences.lineLength}
					>
						{lineLengths.map((length) => (
							<ChoiceTile
								key={length.value}
								label={length.label}
								value={length.value}
							/>
						))}
					</ChoiceGroup>
				</SheetSection>
			</div>

			<SheetSection id="options-marks" title="What the small marks mean">
				<dl className="flex flex-col gap-3 text-[16px]">
					<div className="flex items-start gap-3">
						<dt className="flex w-6 shrink-0 justify-center pt-2">
							<StudyDot />
							<span className="sr-only">A small dot</span>
						</dt>
						<dd>
							This verse has study notes. Tap it, then choose Study this verse.
						</dd>
					</div>
					<div className="flex items-start gap-3">
						<dt className="flex w-6 shrink-0 justify-center pt-1.5">
							<NotePencil />
							<span className="sr-only">A small pencil</span>
						</dt>
						<dd>You wrote a note on this verse.</dd>
					</div>
				</dl>
			</SheetSection>

			<p className="pt-4 text-[15px] text-muted-foreground">
				Your place is saved automatically.
			</p>
		</BottomSheet>
	);
}
