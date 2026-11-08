import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@berean-study/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";

/*
 * Pick one of a few choices, shown as large tiles (HANDOFF §4.7): text sizes,
 * page colours, verse layouts. Arrow keys move between tiles, as screen reader
 * users expect from a group of radio buttons.
 *
 * "filled" tiles turn navy when chosen. "outlined" tiles, used in the welcome,
 * get a tint and a gold ring instead.
 */

export function ChoiceGroup<Value extends string>({
	children,
	className,
	label,
	onValueChange,
	value,
}: {
	children: ReactNode;
	className?: string;
	/** Read out as the group's name, such as "Text size". */
	label: string;
	onValueChange: (value: Value) => void;
	value: Value;
}) {
	return (
		<RadioGroup
			aria-label={label}
			className={cn("grid gap-2", className)}
			onValueChange={(next) => onValueChange(next as Value)}
			value={value}
		>
			{children}
		</RadioGroup>
	);
}

export function ChoiceTile({
	children,
	className,
	description,
	label,
	value,
	variant = "filled",
}: {
	/** Shown above the label, such as a sized "A" or a colour swatch. */
	children?: ReactNode;
	className?: string;
	description?: string;
	label: string;
	value: string;
	variant?: "filled" | "outlined";
}) {
	return (
		<Radio.Root
			className={cn(
				"reader-focus group/choice relative flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--ios-control-radius)] border-[1.5px] px-3 py-2 text-center",
				variant === "filled"
					? "border-border-strong bg-card text-foreground data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground"
					: "border-border-strong bg-card text-foreground data-checked:border-verse-selected-ring data-checked:bg-verse-selected data-checked:shadow-[inset_0_0_0_2px_var(--verse-selected-ring)]",
				className,
			)}
			value={value}
		>
			{children}
			<span className="font-semibold text-[16px] leading-tight">{label}</span>
			{description ? (
				<span className="text-[15px] leading-snug opacity-90">
					{description}
				</span>
			) : null}
			<Radio.Indicator className="absolute top-1.5 right-1.5">
				<CheckIcon aria-hidden="true" className="size-4" strokeWidth={3} />
			</Radio.Indicator>
		</Radio.Root>
	);
}
