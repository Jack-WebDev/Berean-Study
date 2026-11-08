import { cn } from "@berean-study/ui/lib/utils";
import { ShieldCheckIcon } from "lucide-react";

/**
 * Tells readers that study notes are checked (HANDOFF §4.16). Every published
 * note has passed review, which is why this can be shown wherever notes are.
 */
export function TrustLine({ className }: { className?: string }) {
	return (
		<p
			className={cn(
				"flex items-start gap-2 text-[15px] text-muted-foreground",
				className,
			)}
		>
			<ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
			<span>
				Checked by Berean Study editors. Sources are listed with each note.
			</span>
		</p>
	);
}
