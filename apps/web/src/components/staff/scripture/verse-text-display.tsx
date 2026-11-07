import type { VerseTextStatus } from "@berean-study/db/scripture-catalogue";
import { verseTextStatusLabels } from "@berean-study/db/scripture-catalogue";
import { diffWords, type VerseCheck } from "@berean-study/db/verse-text-tools";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { invalidateVerseText } from "@/queries/verse-text";

import { StatusChip, type StatusTone } from "../status-chip";

const statusTones: Record<VerseTextStatus, StatusTone> = {
	empty: "attention",
	draft: "neutral",
	submitted: "info",
	needs_fix: "danger",
	proofread: "success",
	published: "success",
};

export function VerseStatusChip({ status }: { status: VerseTextStatus }) {
	return (
		<StatusChip tone={statusTones[status]}>
			{verseTextStatusLabels[status]}
		</StatusChip>
	);
}

/** Any change to verse text shows its message on failure and refreshes what depends on it. */
export function useVerseTextMutation<TVariables, TResult>(
	mutationFn: (variables: TVariables) => Promise<TResult>,
	onSuccess?: (result: TResult, variables: TVariables) => void,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onError: (error) => toast.error(error.message),
		onSettled: () => invalidateVerseText(queryClient),
		onSuccess,
	});
}

/** Shows two wordings as one, with what was added and removed marked. */
export function WordDiff({ after, before }: { after: string; before: string }) {
	let position = 0;
	return (
		<p className="whitespace-pre-line rounded-[0.625rem] bg-muted p-3 font-serif text-base leading-relaxed">
			{diffWords(before, after).map(({ kind, text }) => {
				const key = position;
				position += text.length;
				if (kind === "added") {
					return (
						<ins
							className="rounded-sm bg-status-success text-status-success-foreground no-underline"
							key={key}
						>
							{text}
						</ins>
					);
				}
				if (kind === "removed") {
					return (
						<del
							className="rounded-sm bg-status-danger text-status-danger-foreground"
							key={key}
						>
							{text}
						</del>
					);
				}
				return <span key={key}>{text}</span>;
			})}
		</p>
	);
}

/** Verse text with what the automatic checks found highlighted. */
export function MarkedVerseText({
	checks,
	text,
}: {
	checks: readonly VerseCheck[];
	text: string;
}) {
	const ranges = checks
		.flatMap((check) => check.ranges)
		.sort(([a], [b]) => a - b);

	const pieces: { marked: boolean; start: number; text: string }[] = [];
	let position = 0;
	for (const [start, end] of ranges) {
		if (end <= position) continue;
		const from = Math.max(start, position);
		if (from > position) {
			pieces.push({
				marked: false,
				start: position,
				text: text.slice(position, from),
			});
		}
		pieces.push({ marked: true, start: from, text: text.slice(from, end) });
		position = end;
	}
	if (position < text.length) {
		pieces.push({ marked: false, start: position, text: text.slice(position) });
	}

	return (
		<p className="whitespace-pre-line font-serif text-lg leading-relaxed">
			{pieces.map((piece) =>
				piece.marked ? (
					<mark
						className="rounded-sm bg-status-attention text-status-attention-foreground"
						key={piece.start}
					>
						{piece.text}
					</mark>
				) : (
					<span key={piece.start}>{piece.text}</span>
				),
			)}
		</p>
	);
}
