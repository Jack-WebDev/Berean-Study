import {
	type ChecklistItem,
	type CommentaryBody,
	collectCitations,
} from "@berean-study/db/commentary-body";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { bookResearchQueryOptions } from "@/queries/commentary";

import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";

export function CitedInDraftCard({ body }: { body: CommentaryBody }) {
	const citations = collectCitations(body);
	return (
		<StaffCard title="Cited in this draft">
			{citations.length === 0 ? (
				<p className="text-muted-foreground text-sm">Nothing yet.</p>
			) : (
				<ol className="space-y-2 text-sm">
					{citations.map((citation, index) => (
						<li
							className="flex gap-2"
							key={`${citation.excerptId}-${index.toString()}`}
						>
							<span className="shrink-0 rounded-sm bg-status-attention px-1.5 font-semibold text-status-attention-foreground text-xs leading-5">
								{index + 1}
							</span>
							<span className="min-w-0">
								<span className="block font-medium">{citation.label}</span>
								<span className="block text-muted-foreground text-xs">
									{citation.locator || "Pages needed"}
								</span>
							</span>
						</li>
					))}
				</ol>
			)}
		</StaffCard>
	);
}

export function BeforeReviewCard({
	items,
	title = "Before review",
}: {
	items: readonly ChecklistItem[];
	title?: string;
}) {
	return (
		<StaffCard title={title}>
			<ul className="space-y-2 text-sm">
				{items.map(({ blocking, ok, text }) => (
					<li className="flex items-start gap-2" key={text}>
						<span
							aria-hidden="true"
							className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
								ok
									? "bg-status-success-foreground"
									: blocking
										? "bg-status-danger-foreground"
										: "bg-status-attention-foreground"
							}`}
						/>
						<span>
							<span className="sr-only">
								{ok ? "Done: " : blocking ? "Needed: " : "Worth checking: "}
							</span>
							{text}
						</span>
					</li>
				))}
			</ul>
			<p className="mt-3 text-muted-foreground text-xs">
				Only unfinished writing stops a draft going for review. The reviewer
				decides on the rest.
			</p>
		</StaffCard>
	);
}

export type ResearchNoteQuote = {
	content: string;
	sources: readonly { locator: string | null; title: string }[];
};

export const researchNoteDragType = "application/x-berean-research-note";

/** A note can be dragged into the text, or quoted with the button on a phone or keyboard. */
export function ResearchNotesCard({
	bookName,
	bookSlug,
	canQuote,
	onQuote,
}: {
	bookName: string;
	bookSlug: string;
	canQuote: boolean;
	onQuote: (note: ResearchNoteQuote) => void;
}) {
	const { data: notes } = useSuspenseQuery(bookResearchQueryOptions(bookSlug));
	return (
		<StaffCard title="Research notes">
			<p className="text-muted-foreground text-sm">
				{notes.length} {notes.length === 1 ? "note" : "notes"} on {bookName}.
				{canQuote && notes.length > 0
					? " Drag a note into the text to quote it with its citation."
					: ""}
			</p>
			{notes.length > 0 ? (
				<ul className="mt-3 space-y-2">
					{notes.map((note) => (
						<li
							className="rounded-[0.625rem] border border-border p-2.5 text-sm"
							draggable={canQuote}
							key={note.id}
							onDragStart={(event) =>
								event.dataTransfer.setData(
									researchNoteDragType,
									JSON.stringify({
										content: note.content,
										sources: note.sources,
									}),
								)
							}
						>
							<p className="font-medium">{note.reference}</p>
							<p className="mt-1 line-clamp-3 whitespace-pre-wrap text-muted-foreground">
								{note.content}
							</p>
							{canQuote ? (
								<StaffButton
									className="mt-2"
									onClick={() => onQuote(note)}
									variant="outline"
								>
									Quote in draft
								</StaffButton>
							) : null}
						</li>
					))}
				</ul>
			) : null}
			<Link
				className="mt-3 inline-block font-medium text-sm underline-offset-4 hover:underline"
				to="/work/research"
			>
				Open research
			</Link>
		</StaffCard>
	);
}
