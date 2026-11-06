import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import { Label } from "@berean-study/ui/components/label";
import { Textarea } from "@berean-study/ui/components/textarea";
import type { FormEvent, ReactNode } from "react";
import { useId } from "react";

import { StaffButton } from "./staff-button";

/** A small form in a dialog, for the decisions staff have to explain. */
export function StaffFormDialog({
	canSubmit,
	children,
	description,
	destructive = false,
	onOpenChange,
	onSubmit,
	open,
	pending,
	submitLabel,
	title,
}: {
	canSubmit: boolean;
	children: ReactNode;
	description?: ReactNode;
	destructive?: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: () => void;
	open: boolean;
	pending: boolean;
	submitLabel: string;
	title: string;
}) {
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (canSubmit && !pending) onSubmit();
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-2xl p-6 sm:max-w-lg">
				<DialogHeader className="text-left">
					<DialogTitle className="font-serif text-xl tracking-[-0.01em]">
						{title}
					</DialogTitle>
					{description ? (
						<DialogDescription>{description}</DialogDescription>
					) : null}
				</DialogHeader>
				<form onSubmit={submit}>
					<div className="mt-5 space-y-5">{children}</div>
					<DialogFooter className="mt-6 gap-2">
						<StaffButton
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</StaffButton>
						<StaffButton
							disabled={!canSubmit || pending}
							type="submit"
							variant={destructive ? "destructive" : "default"}
						>
							{submitLabel}
						</StaffButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function ReasonField({
	hint,
	label = "Reason",
	onChange,
	value,
}: {
	hint?: string;
	label?: string;
	onChange: (value: string) => void;
	value: string;
}) {
	const id = useId();
	const hintId = useId();

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Textarea
				aria-describedby={hint ? hintId : undefined}
				className="min-h-24 rounded-[0.625rem] text-sm"
				id={id}
				maxLength={1000}
				onChange={(event) => onChange(event.target.value)}
				required
				value={value}
			/>
			{hint ? (
				<p className="text-muted-foreground text-xs" id={hintId}>
					{hint}
				</p>
			) : null}
		</div>
	);
}
