import { Separator } from "@berean-study/ui/components/separator";
import { Switch } from "@berean-study/ui/components/switch";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@berean-study/ui/components/toggle-group";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ReadingSettingsPanel({
	icon: Icon,
	title,
	description,
	children,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="rounded-xl border border-border/60 bg-card px-5 py-4 shadow-sm sm:px-6 sm:py-5">
			<header className="flex items-center gap-4">
				<div className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary">
					<Icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
				</div>
				<div>
					<h2 className="font-serif text-xl tracking-[-0.015em]">{title}</h2>
					<p className="mt-0.5 text-muted-foreground text-sm">{description}</p>
				</div>
			</header>
			<Separator className="my-4" />
			<div className="divide-y divide-border/60">{children}</div>
		</section>
	);
}

export function ReadingSettingsRow({
	label,
	description,
	children,
}: {
	label: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
			<div className="min-w-0">
				<p className="font-medium text-sm">{label}</p>
				<p className="mt-0.5 text-muted-foreground text-xs leading-5">
					{description}
				</p>
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}

export function BooleanReadingSetting({
	label,
	description,
	checked,
	onCheckedChange,
}: {
	label: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<ReadingSettingsRow description={description} label={label}>
			<Switch checked={checked} onCheckedChange={onCheckedChange} />
		</ReadingSettingsRow>
	);
}

export function ReadingSettingToggle<Value extends string>({
	options,
	value,
	onValueChange,
}: {
	options: readonly { label: string; value: Value }[];
	value: Value;
	onValueChange: (value: Value) => void;
}) {
	return (
		<ToggleGroup
			className="overflow-hidden rounded-lg border border-border/70 bg-background"
			multiple={false}
			onValueChange={(nextValue) => {
				const selectedValue = nextValue[0];
				if (selectedValue) onValueChange(selectedValue as Value);
			}}
			spacing={0}
			value={[value]}
		>
			{options.map((option) => (
				<ToggleGroupItem
					className="h-8 min-w-15 rounded-none border-0 border-border/70 border-l px-2.5 text-muted-foreground text-xs first:border-l-0 data-pressed:bg-secondary data-pressed:text-secondary-foreground"
					key={option.value}
					value={option.value}
				>
					{option.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
