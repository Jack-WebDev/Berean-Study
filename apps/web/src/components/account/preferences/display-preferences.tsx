import { Separator } from "@berean-study/ui/components/separator";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import { cn } from "@berean-study/ui/lib/utils";
import { MonitorIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PreferenceSectionHeader } from "./preference-section-header";
import type { ReadingWidth, TextSize, Theme } from "./types";

export function DisplayPreferences({
	theme,
	textSize,
	readingWidth,
	onThemeChange,
	onTextSizeChange,
	onReadingWidthChange,
}: {
	theme: Theme;
	textSize: TextSize;
	readingWidth: ReadingWidth;
	onThemeChange: (value: Theme) => void;
	onTextSizeChange: (value: TextSize) => void;
	onReadingWidthChange: (value: ReadingWidth) => void;
}) {
	return (
		<section className="rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-sm sm:px-6">
			<PreferenceSectionHeader
				description="Adjust how Berean Study looks and feels for you."
				icon={MonitorIcon}
				title="Display Preferences"
			/>
			<Separator className="my-5" />
			<div className="divide-y divide-border/60">
				<PreferenceRow
					label="Theme"
					description="Choose your preferred appearance."
				>
					<PreferenceToggle
						onValueChange={(value) => onThemeChange(value as Theme)}
						options={[
							{ label: "Light", value: "light" },
							{ label: "Dark", value: "dark" },
							{ label: "System", value: "system" },
						]}
						value={theme}
					/>
				</PreferenceRow>
				<PreferenceRow
					label="Text size"
					description="Adjust the default text size for reading Scripture."
				>
					<PreferenceToggle
						onValueChange={(value) => onTextSizeChange(value as TextSize)}
						options={[
							{ label: "A", value: "small" },
							{ label: "A", value: "default" },
							{ label: "A", value: "large" },
						]}
						textSizes
						value={textSize}
					/>
				</PreferenceRow>
				<PreferenceRow
					label="Reading width"
					description="Control the line length for a more comfortable reading experience."
				>
					<PreferenceToggle
						onValueChange={(value) =>
							onReadingWidthChange(value as ReadingWidth)
						}
						options={[
							{ label: "Narrow", value: "narrow" },
							{ label: "Default", value: "default" },
							{ label: "Wide", value: "wide" },
						]}
						value={readingWidth}
					/>
				</PreferenceRow>
			</div>
		</section>
	);
}

function PreferenceRow({
	label,
	description,
	children,
}: {
	label: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 pr-4">
				<p className="font-medium text-sm">{label}</p>
				<p className="mt-1 max-w-sm text-muted-foreground text-xs leading-5">
					{description}
				</p>
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}

function PreferenceToggle({
	options,
	value,
	onValueChange,
	textSizes = false,
}: {
	options: readonly { label: string; value: string }[];
	value: string;
	onValueChange: (value: string) => void;
	textSizes?: boolean;
}) {
	return (
		<ToggleGroup
			className="overflow-hidden rounded-lg border border-border/70 bg-background"
			multiple={false}
			onValueChange={(nextValue) => {
				const selectedValue = nextValue[0];
				if (selectedValue) onValueChange(selectedValue);
			}}
			spacing={0}
			value={[value]}
		>
			{options.map((option, index) => (
				<ToggleGroupItem
					className={cn(
						"h-9 min-w-16 rounded-none border-0 border-border/70 border-l px-3 text-muted-foreground first:border-l-0 data-pressed:bg-secondary data-pressed:text-secondary-foreground",
						textSizes &&
							(index === 0
								? "min-w-11 text-xs"
								: index === 1
									? "min-w-11 text-sm"
									: "min-w-11 text-base"),
						!textSizes && "text-xs",
					)}
					key={option.value}
					value={option.value}
				>
					{option.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
