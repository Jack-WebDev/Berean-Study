import {
	RadioGroup,
	RadioGroupItem,
} from "@berean-study/ui/components/radio-group";
import { Separator } from "@berean-study/ui/components/separator";
import { cn } from "@berean-study/ui/lib/utils";
import { BookOpenIcon, CheckIcon, ChevronDownIcon } from "lucide-react";

import { PreferenceSectionHeader } from "./preference-section-header";
import {
	type Tradition,
	type Translation,
	traditions,
	translations,
} from "./types";

export function ScripturePreferences({
	tradition,
	translation,
	onTraditionChange,
	onTranslationChange,
}: {
	tradition: Tradition;
	translation: Translation;
	onTraditionChange: (value: Tradition) => void;
	onTranslationChange: (value: Translation) => void;
}) {
	return (
		<section className="rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-sm sm:px-6">
			<PreferenceSectionHeader
				description="Choose how Berean Study presents Scripture to you."
				icon={BookOpenIcon}
				title="Scripture Preferences"
			/>
			<Separator className="my-5" />
			<fieldset>
				<legend className="font-medium text-sm">Bible tradition</legend>
				<p className="mt-1 text-muted-foreground text-xs leading-5">
					Controls which books Berean Study shows in your Bible by default.
				</p>
				<RadioGroup
					className="mt-4 grid gap-2.5 sm:grid-cols-2"
					onValueChange={(value) => onTraditionChange(value as Tradition)}
					value={tradition}
				>
					{traditions.map((option) => (
						<TraditionCard
							key={option.value}
							option={option}
							selected={tradition === option.value}
						/>
					))}
				</RadioGroup>
			</fieldset>
			<Separator className="my-5" />
			<div>
				<label className="font-medium text-sm" htmlFor="translation">
					Preferred translation
				</label>
				<p className="mt-1 text-muted-foreground text-xs leading-5">
					Sets your default Bible translation throughout the app.
				</p>
				<div className="relative mt-3">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center border-border/60 border-r">
						<BookOpenIcon
							aria-hidden="true"
							className="size-4 text-primary"
							strokeWidth={1.7}
						/>
					</div>
					<select
						className="h-11 w-full appearance-none rounded-lg border border-border/70 bg-background py-2 pr-10 pl-14 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
						id="translation"
						onChange={(event) =>
							onTranslationChange(event.target.value as Translation)
						}
						value={translation}
					>
						{translations.map((availableTranslation) => (
							<option key={availableTranslation} value={availableTranslation}>
								{availableTranslation}
							</option>
						))}
					</select>
					<ChevronDownIcon
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
				</div>
				<p className="mt-2 text-muted-foreground text-xs">
					You can still read any available translation at any time.
				</p>
			</div>
		</section>
	);
}

function TraditionCard({
	option,
	selected,
}: {
	option: (typeof traditions)[number];
	selected: boolean;
}) {
	return (
		<label
			className={cn(
				"group relative cursor-pointer rounded-xl border p-4 transition-[border-color,background-color,box-shadow]",
				option.value === "unsure" && "sm:col-span-2",
				selected
					? "border-accent bg-secondary shadow-sm"
					: "border-border/70 bg-background hover:border-border hover:bg-muted/20",
			)}
			htmlFor={`tradition-${option.value}`}
		>
			<RadioGroupItem
				aria-label={option.title}
				className="sr-only"
				id={`tradition-${option.value}`}
				value={option.value}
			/>
			<div className="flex gap-4">
				<div className="min-w-0 flex-1">
					<p className="font-medium font-serif text-base leading-5 tracking-[-0.01em]">
						{option.title}
					</p>
					<p className="mt-1.5 max-w-sm text-muted-foreground text-xs leading-5">
						{option.description}
					</p>
					{"meta" in option && option.meta ? (
						<p className="mt-1 text-muted-foreground text-xs">{option.meta}</p>
					) : null}
				</div>
				<div
					aria-hidden="true"
					className={cn(
						"grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
						selected
							? "border-primary bg-primary text-primary-foreground"
							: "border-border bg-background",
					)}
				>
					{selected ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
				</div>
			</div>
		</label>
	);
}
