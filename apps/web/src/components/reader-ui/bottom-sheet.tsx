import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@berean-study/ui/lib/utils";
import { XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { readerButtonClass } from "./button";

/*
 * A sheet docked to the bottom of the screen (HANDOFF §4.4). There are two kinds:
 *
 * - "tall" sheets (translation, chapters, options, note) dim the page behind and
 *   keep keyboard focus inside until they close.
 * - "light" sheets (text size, the verse actions) leave the page visible and
 *   usable. That's how the words visibly grow as someone taps a text size, and how
 *   they can tap more verses while the verse sheet is open. Tapping the page
 *   doesn't close them.
 *
 * Both move focus inside when they open, give it back when they close, and close
 * with Esc. From tablet width they float as a centred card, up to 480 px wide.
 */

export type BottomSheetKind = "tall" | "light";

export function BottomSheet({
	children,
	className,
	closeLabel = "Close",
	description,
	initialFocus,
	kind,
	onOpenChange,
	open,
	title,
}: {
	children: ReactNode;
	className?: string;
	/** "Done" for sheets that apply as you go, "Close" otherwise. */
	closeLabel?: "Close" | "Done";
	description?: ReactNode;
	/** Where focus goes when the sheet opens. Defaults to the first control. */
	initialFocus?: Dialog.Popup.Props["initialFocus"];
	kind: BottomSheetKind;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	title: ReactNode;
}) {
	const tall = kind === "tall";
	return (
		<Dialog.Root
			disablePointerDismissal={!tall}
			modal={tall}
			onOpenChange={(next) => onOpenChange(next)}
			open={open}
		>
			<Dialog.Portal>
				{tall ? (
					<Dialog.Backdrop
						className="fixed inset-0 z-40 bg-foreground/40 dark:bg-black/55"
						data-testid="sheet-scrim"
					/>
				) : null}
				<Dialog.Popup
					className={cn(
						"fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[20px] border border-border border-b-0 bg-card text-foreground shadow-sheet outline-none",
						"md:inset-x-auto md:left-1/2 md:w-[min(480px,calc(100%-2rem))] md:-translate-x-1/2",
						tall &&
							"md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:rounded-[20px] md:border-b",
						className,
					)}
					initialFocus={initialFocus}
				>
					<div
						aria-hidden="true"
						className="mx-auto mt-2 h-[5px] w-10 shrink-0 rounded-full bg-border-strong md:hidden"
					/>
					<div className="flex shrink-0 items-start justify-between gap-3 px-4 pt-3 pb-2">
						<div className="min-w-0 pt-2.5">
							<Dialog.Title className="font-bold text-[20px] leading-tight">
								{title}
							</Dialog.Title>
							{description ? (
								<Dialog.Description className="mt-1 text-[15px] text-muted-foreground">
									{description}
								</Dialog.Description>
							) : null}
						</div>
						<Dialog.Close
							className={cn(
								readerButtonClass({ size: "compact", variant: "secondary" }),
								"shrink-0 px-4",
							)}
						>
							{closeLabel === "Close" ? <XIcon aria-hidden="true" /> : null}
							{closeLabel}
						</Dialog.Close>
					</div>
					<div className="min-h-0 overflow-y-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
						{children}
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
