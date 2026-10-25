import { FieldError } from "@berean-study/ui/components/field";
import { useLayoutEffect, useRef } from "react";

/**
 * The note title: a borderless heading-sized field that wraps long titles
 * and grows to fit them instead of scrolling. Enter moves on to the body.
 */
export function NoteTitleInput({
	error,
	onBlur,
	onChange,
	onEnter,
	value,
}: {
	error?: string;
	onBlur: () => void;
	onChange: (value: string) => void;
	onEnter: () => void;
	value: string;
}) {
	const ref = useRef<HTMLTextAreaElement>(null);

	// Fit on mount and whenever the width changes (which re-wraps the text);
	// typing refits in onChange. Wrapping then never produces a scrollbar.
	useLayoutEffect(() => {
		const textarea = ref.current;
		if (!textarea) return;
		fitToContent(textarea);
		const observer = new ResizeObserver(() => fitToContent(textarea));
		observer.observe(textarea);
		return () => observer.disconnect();
	}, []);

	return (
		<div>
			<label className="sr-only" htmlFor="note-title">
				Note title
			</label>
			<textarea
				aria-describedby={error ? "note-title-error" : undefined}
				aria-invalid={error ? true : undefined}
				className="block w-full resize-none overflow-hidden rounded-md border-0 bg-transparent p-0 font-medium font-serif text-[2rem] leading-[1.15] tracking-[-0.015em] outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-[2.75rem]"
				id="note-title"
				maxLength={200}
				onBlur={onBlur}
				// Titles are one line even when pasted text has breaks.
				onChange={(event) => {
					const textarea = event.target;
					const title = textarea.value.replace(/\s*\n\s*/g, " ");
					// Measure the cleaned title, not the pasted line breaks.
					if (title !== textarea.value) textarea.value = title;
					fitToContent(textarea);
					onChange(title);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
						event.preventDefault();
						onEnter();
					}
				}}
				placeholder="Untitled note"
				ref={ref}
				rows={1}
				value={value}
			/>
			{error ? (
				<FieldError className="mt-1" id="note-title-error">
					{error}
				</FieldError>
			) : null}
		</div>
	);
}

function fitToContent(textarea: HTMLTextAreaElement) {
	textarea.style.height = "auto";
	textarea.style.height = `${textarea.scrollHeight}px`;
}
