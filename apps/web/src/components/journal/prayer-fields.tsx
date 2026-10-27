import { cn } from "@berean-study/ui/lib/utils";
import { useEffect, useId, useRef, useState } from "react";

import { suggestedPrayerCategories } from "./journal-copy";
import type { PrayerDraft } from "./journal-drafts";
import { fieldClassName } from "./journal-ui";

/**
 * Chips for the prayer's category. The suggested ones are only a starting
 * point; `allowCustom` lets the member type their own word.
 */
export function CategoryChips({
	allowCustom = false,
	compact = false,
	onChange,
	value,
}: {
	allowCustom?: boolean;
	compact?: boolean;
	onChange: (category: string) => void;
	value: string;
}) {
	const customId = useId();
	const [custom, setCustom] = useState("");
	const isCustom =
		Boolean(value) &&
		!suggestedPrayerCategories.some((category) => category === value);
	const chips = [...suggestedPrayerCategories, ...(isCustom ? [value] : [])];
	const addCustom = () => {
		const next = custom.trim();
		if (!next) return;
		onChange(next);
		setCustom("");
	};

	return (
		<fieldset className="flex min-w-0 flex-col gap-2.5">
			<legend className="mb-2.5 font-semibold text-[13px] text-foreground/80">
				Type of prayer
			</legend>
			<div className="flex flex-wrap gap-2">
				{chips.map((category) => (
					<button
						aria-pressed={category === value}
						className={cn(
							"rounded-full border border-input bg-card px-3.5 text-[13px] text-foreground/80 outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:font-medium aria-pressed:text-primary-foreground",
							compact ? "min-h-9 pointer-coarse:min-h-11" : "min-h-11",
						)}
						key={category}
						// Pressing the chosen chip again clears the category.
						onClick={() => onChange(category === value ? "" : category)}
						type="button"
					>
						{category}
					</button>
				))}
			</div>
			{allowCustom ? (
				<div className="flex gap-2">
					<label className="sr-only" htmlFor={customId}>
						Your own type
					</label>
					<input
						className={cn(fieldClassName, "h-10 text-sm")}
						id={customId}
						maxLength={50}
						onChange={(event) => setCustom(event.target.value)}
						onKeyDown={(event) => {
							if (event.key !== "Enter") return;
							event.preventDefault();
							addCustom();
						}}
						placeholder="Or type your own"
						value={custom}
					/>
					<button
						className="h-10 pointer-coarse:h-11 shrink-0 rounded-xl bg-secondary px-3.5 font-semibold text-[13px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
						disabled={!custom.trim()}
						onClick={addCustom}
						type="button"
					>
						Add
					</button>
				</div>
			) : null}
		</fieldset>
	);
}

export function PrayingForField({
	autoFocus = false,
	onChange,
	value,
}: {
	autoFocus?: boolean;
	onChange: (name: string) => void;
	value: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	// Focus once when the field first appears after "Praying for someone".
	useEffect(() => {
		if (autoFocus) inputRef.current?.focus();
	}, [autoFocus]);
	return (
		<label className="flex flex-col gap-2 font-semibold text-[13px] text-foreground/80">
			Praying for
			<input
				ref={inputRef}
				className={cn(fieldClassName, "font-normal text-sm")}
				maxLength={120}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Myself, or add a name"
				value={value}
			/>
		</label>
	);
}

/** The prayer fields sent to the server, with blanks turned into "none". */
export function toPrayerInput(draft: PrayerDraft) {
	return {
		category: draft.category.trim() || null,
		content: draft.content,
		prayingFor: draft.prayingFor.trim() || null,
		title: draft.title.trim(),
	};
}
