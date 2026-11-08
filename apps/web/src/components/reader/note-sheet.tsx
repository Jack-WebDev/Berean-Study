import type { RichTextDocument } from "@berean-study/rich-text-editor/document";
import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { BottomSheet } from "@/components/reader-ui/bottom-sheet";
import { ReaderButton } from "@/components/reader-ui/button";
import { deleteNote, saveNote } from "@/functions/notes";
import { passagesForVerses } from "@/functions/reader";
import { noteKeys, readerKeys } from "@/queries/keys";

/** Wait this long after typing stops before saving. */
const saveDelayMs = 800;

/** Plain typed text as a note document: one paragraph per line. */
function toDocument(text: string): RichTextDocument {
	return {
		content: text.split("\n").map((line) => ({
			content: line ? [{ text: line, type: "text" }] : [],
			type: "paragraph",
		})),
		type: "doc",
	};
}

type SaveState = "idle" | "saving" | "saved" | "failed";

/**
 * A quick note on the chosen verses (HANDOFF Screen 2). It saves as the reader
 * types, into their Notes library, linked to the verses. The first save creates
 * the note; later saves update it. Saves run one after another, so typing fast
 * can never create two notes. Clearing the box removes the note again.
 */
export function NoteSheet({
	chosen,
	onDone,
	onOpenChange,
	open,
	reference,
}: {
	chosen: {
		bookSlug: string;
		chapter: number;
		translationAbbreviation: string;
		verses: number[];
	};
	/** Called once the last save has finished, with whether a note was kept. */
	onDone: (kept: boolean) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	reference: string;
}) {
	const queryClient = useQueryClient();
	const textareaId = useId();
	const [text, setText] = useState("");
	const [state, setState] = useState<SaveState>("idle");
	const noteId = useRef<number | null>(null);
	const passageIds = useRef<Promise<number[]> | null>(null);
	const queue = useRef<Promise<unknown>>(Promise.resolve());
	const timer = useRef<number | undefined>(undefined);
	const latest = useRef("");

	// A fresh note each time the sheet opens.
	useEffect(() => {
		if (!open) return;
		setText("");
		setState("idle");
		noteId.current = null;
		passageIds.current = null;
		latest.current = "";
	}, [open]);

	const persist = () => {
		window.clearTimeout(timer.current);
		timer.current = undefined;
		const body = latest.current;
		queue.current = queue.current.then(async () => {
			const trimmed = body.trim();
			if (!trimmed && noteId.current === null) return;
			setState("saving");
			try {
				if (!trimmed && noteId.current !== null) {
					await deleteNote({ data: { id: noteId.current } });
					noteId.current = null;
				} else {
					passageIds.current ??= passagesForVerses({ data: chosen }).then(
						(result) => result.passages.map((passage) => passage.passageId),
					);
					const saved = await saveNote({
						data: {
							content: toDocument(body),
							id: noteId.current ?? undefined,
							passageIds: await passageIds.current,
							status: "saved",
							tags: [],
							title: `Note on ${reference}`,
						},
					});
					noteId.current = saved?.id ?? noteId.current;
				}
				setState("saved");
			} catch {
				// Try making the passages again next time, in case that's what failed.
				passageIds.current = null;
				setState("failed");
			}
		});
		return queue.current;
	};

	const finish = async () => {
		await persist();
		void queryClient.invalidateQueries({ queryKey: noteKeys.all });
		void queryClient.invalidateQueries({ queryKey: readerKeys.allMarks() });
		onDone(noteId.current !== null);
	};

	const status =
		state === "failed"
			? "We couldn't save your note. Check your connection; we'll try again as you type."
			: state === "saving"
				? "Saving…"
				: "Saved automatically as you type";

	return (
		<BottomSheet
			kind="tall"
			onOpenChange={(next) => {
				if (next) onOpenChange(true);
				else void finish();
			}}
			open={open}
			title="Add a note"
		>
			<label
				className="mb-2 block font-semibold text-[17px]"
				htmlFor={textareaId}
			>
				Your note on {reference}
			</label>
			<textarea
				className="reader-focus block h-[170px] w-full resize-y rounded-[10px] border-[1.5px] border-border-strong bg-background p-3 text-[18px] text-foreground leading-relaxed"
				id={textareaId}
				onChange={(event) => {
					setText(event.target.value);
					latest.current = event.target.value;
					window.clearTimeout(timer.current);
					timer.current = window.setTimeout(() => void persist(), saveDelayMs);
				}}
				value={text}
			/>
			<p
				aria-live="polite"
				className="mt-2 flex items-center gap-1.5 text-[15px] text-muted-foreground"
			>
				{state === "failed" ? null : (
					<CheckIcon aria-hidden="true" className="size-4" />
				)}
				{status}
			</p>
			<ReaderButton
				className="mt-4 w-full"
				onClick={() => void finish()}
				variant="primary"
			>
				Done
			</ReaderButton>
		</BottomSheet>
	);
}
