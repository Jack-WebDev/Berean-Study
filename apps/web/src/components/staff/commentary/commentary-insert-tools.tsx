import type {
	CitationAttributes,
	CommentaryTools,
	ContentBlockAttributes,
	ContentBlockKind,
	OriginalTermAttributes,
	ScriptureReferenceAttributes,
} from "@berean-study/rich-text-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	CitationDialog,
	type CitationStart,
	ContentBlockDialog,
	OriginalTermDialog,
	ReferenceDialog,
} from "./commentary-insert-dialogs";

type InsertRequest =
	| { type: "block"; kind: ContentBlockKind }
	| { type: "citation"; start: CitationStart }
	| { type: "reference"; variant: ScriptureReferenceAttributes["variant"] }
	| { type: "term" };

/**
 * The toolbar's insert buttons wait on a promise, and the dialog that answers it
 * lives with whoever renders `dialogs`. Any writing surface can share this.
 */
export function useCommentaryInsertTools({
	blocks = false,
}: {
	/** Places other content in the writing. Only full commentary has room for it. */
	blocks?: boolean;
} = {}) {
	const pending = useRef<((value: never) => void) | null>(null);
	const [request, setRequest] = useState<InsertRequest | null>(null);
	const ask = useCallback(
		<TValue,>(next: InsertRequest) =>
			new Promise<TValue | null>((resolve) => {
				(pending.current as ((value: TValue | null) => void) | null)?.(null);
				pending.current = resolve as (value: never) => void;
				setRequest(next);
			}),
		[],
	);
	const settle = useCallback((value: unknown) => {
		(pending.current as ((next: unknown) => void) | null)?.(value);
		pending.current = null;
		setRequest(null);
	}, []);
	useEffect(() => () => settle(null), [settle]);

	const commentaryTools = useMemo<CommentaryTools>(
		() => ({
			onRequestContentBlock: blocks
				? (kind) => ask<ContentBlockAttributes>({ kind, type: "block" })
				: undefined,
			onRequestCrossReference: () =>
				ask<ScriptureReferenceAttributes>({
					type: "reference",
					variant: "cross",
				}),
			onRequestOriginalTerm: () =>
				ask<OriginalTermAttributes>({ type: "term" }),
			onRequestScriptureReference: () =>
				ask<ScriptureReferenceAttributes>({
					type: "reference",
					variant: "reference",
				}),
		}),
		[ask, blocks],
	);
	const askCitation = useCallback(
		(start: CitationStart = {}) =>
			ask<CitationAttributes>({ start, type: "citation" }),
		[ask],
	);
	const requestCitation = useCallback(() => askCitation(), [askCitation]);

	const dialogs = (
		<>
			{request?.type === "citation" ? (
				<CitationDialog onSettle={settle} start={request.start} />
			) : null}
			{request?.type === "reference" ? (
				<ReferenceDialog onSettle={settle} variant={request.variant} />
			) : null}
			{request?.type === "term" ? (
				<OriginalTermDialog onSettle={settle} />
			) : null}
			{request?.type === "block" ? (
				<ContentBlockDialog kind={request.kind} onSettle={settle} />
			) : null}
		</>
	);

	return { askCitation, commentaryTools, dialogs, requestCitation };
}
