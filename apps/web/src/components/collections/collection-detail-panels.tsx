import { getDocumentText } from "@berean-study/rich-text-editor";
import { Button } from "@berean-study/ui/components/button";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { pluralize } from "./collection-library";
import { buildColumns } from "./collection-passage-model";
import type {
	CollectionDetail,
	CollectionNote,
	CollectionSection,
} from "./use-collection-actions";

/* The detail page's side panel: the outline and the latest notes. */

function Panel({ children, title }: { children: ReactNode; title: string }) {
	return (
		<section
			aria-label={title}
			className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
		>
			<h2 className="font-bold text-[13px] text-muted-foreground uppercase tracking-wider">
				{title}
			</h2>
			{children}
		</section>
	);
}

export function OutlinePanel({
	passages,
	sections,
}: {
	passages: CollectionDetail["passages"];
	sections: readonly CollectionSection[];
}) {
	if (!sections.length) {
		return (
			<Panel title="Outline">
				<p className="text-muted-foreground">
					Add sections to group passages, like the parts of a sermon or a book.
				</p>
			</Panel>
		);
	}
	const columns = buildColumns(passages, sections);
	const readIds = new Set(
		passages
			.filter((passage) => passage.readAt !== null)
			.map((passage) => passage.passageId),
	);

	return (
		<Panel title="Outline">
			<ol className="flex flex-col">
				{columns.map((column) => {
					const read = column.ids.filter((id) => readIds.has(id)).length;
					const isDone = column.ids.length > 0 && read === column.ids.length;
					return (
						<li
							className="flex min-h-11 items-center justify-between gap-2"
							key={column.key}
						>
							<a
								className="font-semibold text-foreground hover:underline"
								href={`#${column.key}`}
							>
								{column.title ?? "Not in a section"}
							</a>
							<span
								className={
									isDone ? "font-bold text-success" : "text-muted-foreground"
								}
							>
								{read}/{column.ids.length}
								<span className="sr-only"> read</span>
							</span>
						</li>
					);
				})}
			</ol>
		</Panel>
	);
}

export function LatestNotesPanel({
	notes,
	onShowAll,
}: {
	notes: readonly CollectionNote[];
	onShowAll: () => void;
}) {
	return (
		<Panel title="Latest notes">
			{notes.length ? (
				<>
					<ul className="flex flex-col divide-y divide-border-subtle">
						{notes.slice(0, 2).map((note) => (
							<li className="py-2.5 first:pt-0" key={note.id}>
								<Link
									className="flex flex-col gap-1 text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
									params={{ noteId: note.id }}
									to="/library/notes/$noteId"
								>
									<strong className="font-semibold">
										{note.title || note.passageTitle || "Untitled note"}
									</strong>
									<span className="line-clamp-2 text-muted-foreground text-sm">
										{getDocumentText(note.content)}
									</span>
								</Link>
							</li>
						))}
					</ul>
					<Button
						className="h-11 self-start px-1 font-bold text-primary text-sm"
						onClick={onShowAll}
						type="button"
						variant="ghost"
					>
						All {pluralize(notes.length, "note")}
					</Button>
				</>
			) : (
				<p className="text-muted-foreground">
					Notes you add to this collection appear here.
				</p>
			)}
		</Panel>
	);
}
