import { cn } from "@berean-study/ui/lib/utils";
import {
	type CSSProperties,
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { readerButtonClass } from "./button";

/*
 * The short message after an action, such as "Highlighted Romans 8:28", with an
 * Undo button where the action can be reversed (HANDOFF §4.5). Undo replaces
 * "Are you sure?" questions. There's one message at a time; a new one replaces
 * the last.
 */

/** How long a message stays, unless the reader is pointing at it or focused on it. */
export const readerToastDuration = 6000;

type ReaderToastMessage = {
	id: number;
	message: string;
	undo?: () => void;
};

type ReaderToastContextValue = {
	dismiss: () => void;
	show: (message: string, options?: { undo?: () => void }) => void;
	toast: ReaderToastMessage | null;
};

const ReaderToastContext = createContext<ReaderToastContextValue | null>(null);

export function ReaderToastProvider({ children }: { children: ReactNode }) {
	const [toast, setToast] = useState<ReaderToastMessage | null>(null);
	const nextId = useRef(0);

	const show = useCallback(
		(message: string, options?: { undo?: () => void }) => {
			nextId.current += 1;
			setToast({ id: nextId.current, message, undo: options?.undo });
		},
		[],
	);
	const dismiss = useCallback(() => setToast(null), []);
	const value = useMemo(
		() => ({ dismiss, show, toast }),
		[dismiss, show, toast],
	);

	return (
		<ReaderToastContext.Provider value={value}>
			{children}
		</ReaderToastContext.Provider>
	);
}

export function useReaderToast() {
	const context = useContext(ReaderToastContext);
	if (!context) {
		throw new Error("useReaderToast must be used within ReaderToastProvider.");
	}
	return { dismiss: context.dismiss, show: context.show };
}

/**
 * Where the message appears. The page places it just above its bottom controls,
 * so pass `bottom` to move it up while a sheet is open.
 */
export function ReaderToastRegion({
	bottom = 96,
	className,
}: {
	bottom?: number;
	className?: string;
}) {
	const context = useContext(ReaderToastContext);
	if (!context) {
		throw new Error(
			"ReaderToastRegion must be used within ReaderToastProvider.",
		);
	}
	const { dismiss, toast } = context;
	const [paused, setPaused] = useState(false);

	useEffect(() => {
		if (!toast || paused) return;
		const timer = window.setTimeout(dismiss, readerToastDuration);
		return () => window.clearTimeout(timer);
	}, [dismiss, paused, toast]);

	// A new message starts its own full time, even if the last one was paused.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs when the message changes.
	useEffect(() => setPaused(false), [toast?.id]);

	const style: CSSProperties = { bottom };
	return (
		// The region stays in the page, empty, so screen readers announce each message.
		<div
			aria-live="polite"
			className={cn(
				"pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4",
				className,
			)}
			role="status"
			style={style}
		>
			{toast ? (
				// biome-ignore lint/a11y/noStaticElementInteractions: pausing on hover is extra; focus pauses it too.
				<div
					className="pointer-events-auto flex w-full max-w-[480px] items-center gap-3 rounded-xl bg-reader-toast py-1.5 pr-1.5 pl-4 text-[16px] text-reader-toast-foreground shadow-float"
					key={toast.id}
					onBlur={() => setPaused(false)}
					onFocus={() => setPaused(true)}
					onMouseEnter={() => setPaused(true)}
					onMouseLeave={() => setPaused(false)}
				>
					<p className="min-w-0 flex-1 py-2.5">{toast.message}</p>
					{toast.undo ? (
						<button
							className={cn(
								readerButtonClass({ size: "compact", variant: "secondary" }),
								"shrink-0 border-transparent bg-transparent text-reader-toast-foreground underline underline-offset-4 hover:bg-reader-toast-foreground/10",
							)}
							onClick={() => {
								toast.undo?.();
								dismiss();
							}}
							type="button"
						>
							Undo
						</button>
					) : null}
				</div>
			) : null}
		</div>
	);
}
