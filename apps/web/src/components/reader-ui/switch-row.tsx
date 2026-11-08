import { cn } from "@berean-study/ui/lib/utils";
import { useId } from "react";

/**
 * A setting that's on or off (HANDOFF §4.6). The whole row is the switch, so
 * there's a large target, and its label and help line are read out with it.
 */
export function SwitchRow({
	checked,
	className,
	help,
	label,
	onCheckedChange,
}: {
	checked: boolean;
	className?: string;
	help?: string;
	label: string;
	onCheckedChange: (checked: boolean) => void;
}) {
	const labelId = useId();
	const helpId = useId();
	return (
		<button
			aria-checked={checked}
			aria-describedby={help ? helpId : undefined}
			aria-labelledby={labelId}
			className={cn(
				"reader-focus flex min-h-[60px] w-full items-center gap-4 py-2 text-left",
				className,
			)}
			onClick={() => onCheckedChange(!checked)}
			role="switch"
			type="button"
		>
			<span className="min-w-0 flex-1">
				<span
					className="block font-semibold text-[17px] text-foreground"
					id={labelId}
				>
					{label}
				</span>
				{help ? (
					<span
						className="mt-0.5 block text-[15px] text-muted-foreground"
						id={helpId}
					>
						{help}
					</span>
				) : null}
			</span>
			<span
				aria-hidden="true"
				className={cn(
					"flex h-8 w-[52px] shrink-0 items-center rounded-full p-1",
					checked
						? "justify-end bg-primary"
						: "justify-start bg-muted-foreground",
				)}
			>
				<span className="size-6 rounded-full bg-background shadow-sm" />
			</span>
		</button>
	);
}
