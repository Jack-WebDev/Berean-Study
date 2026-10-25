import {
	type EditorSession,
	formatVerseReference,
	getDocumentSections,
	getDocumentVerseBlocks,
	getOpenTaskCount,
	type RichTextDocument,
} from "@berean-study/rich-text-editor";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { sectionToneClassName } from "./note-templates";

const eyebrowClassName =
	"pb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-[0.06em]";

export function NoteOutlineTab({
	activeSectionIndex,
	document,
	session,
}: {
	activeSectionIndex: number | null;
	document: RichTextDocument;
	session: EditorSession | null;
}) {
	const sections = useMemo(() => getDocumentSections(document), [document]);
	const verseBlocks = useMemo(
		() => getDocumentVerseBlocks(document),
		[document],
	);
	const openTasks = useMemo(() => getOpenTaskCount(document), [document]);

	return (
		<div className="flex flex-col gap-5">
			<section
				aria-labelledby="note-outline-sections"
				className="flex flex-col gap-1"
			>
				<h3 className={eyebrowClassName} id="note-outline-sections">
					In this note
				</h3>
				{sections.length ? (
					<ol className="flex flex-col gap-0.5">
						{sections.map((section) => {
							const isActive = section.index === activeSectionIndex;
							const tone = sectionToneClassName[section.variant ?? "section"];
							return (
								<li key={section.index}>
									<button
										aria-current={isActive ? "location" : undefined}
										className="flex min-h-13 w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current=location]:bg-secondary"
										disabled={!session}
										onClick={() => session?.focusSection(section.index)}
										type="button"
									>
										<span
											aria-hidden="true"
											className={`size-2.5 shrink-0 rounded-full ${tone.dot}`}
										/>
										<span className="flex min-w-0 flex-1 flex-col gap-0.5">
											<span className="flex items-center justify-between gap-2">
												<span
													className={`truncate text-[15px] ${isActive ? "font-semibold" : "font-medium"}`}
												>
													{section.text || "Untitled section"}
												</span>
												{isActive ? (
													<span className="shrink-0 font-semibold text-success text-xs">
														You’re here
													</span>
												) : null}
											</span>
											{section.tasks.total ? (
												<span className="flex items-center gap-2">
													<span
														aria-hidden="true"
														className="flex h-1 flex-1 overflow-hidden rounded-full bg-section-apply"
													>
														<span
															className="bg-section-apply-foreground"
															style={{
																width: `${(section.tasks.done / section.tasks.total) * 100}%`,
															}}
														/>
													</span>
													<span className="text-muted-foreground text-xs">
														{section.tasks.done} of {section.tasks.total} done
													</span>
												</span>
											) : (
												<span className="text-muted-foreground text-xs">
													{describeSection(section)}
												</span>
											)}
										</span>
									</button>
								</li>
							);
						})}
					</ol>
				) : (
					<p className="px-1 text-muted-foreground text-sm leading-normal">
						Add a heading or pick a structure to outline your study.
					</p>
				)}
				<button
					className="mt-1 flex h-10 items-center gap-2 rounded-[10px] border border-border border-dashed px-2.5 text-secondary-foreground text-sm hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
					disabled={!session}
					onClick={() => session?.appendSection()}
					type="button"
				>
					<PlusIcon aria-hidden="true" className="size-3.5" />
					Add a section
				</button>
			</section>

			<section
				aria-labelledby="note-outline-verses"
				className="flex flex-col gap-1 border-border border-t pt-4"
			>
				<h3 className={eyebrowClassName} id="note-outline-verses">
					Verses quoted
				</h3>
				{verseBlocks.length ? (
					verseBlocks.map(({ attributes, nodeIndex, sectionIndex }) => {
						const sectionName =
							sectionIndex === null ? null : sections[sectionIndex]?.text;
						return (
							<button
								className="flex min-h-12 w-full items-center gap-2.5 rounded-[10px] bg-background px-2.5 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
								disabled={!session}
								key={nodeIndex}
								onClick={() =>
									session?.focusStructuredNode("verseBlock", nodeIndex)
								}
								type="button"
							>
								<span className="font-serif text-[15px]">
									{formatVerseReference(attributes)}
								</span>
								{sectionName ? (
									<span className="truncate text-muted-foreground text-xs">
										in {sectionName}
									</span>
								) : null}
								<ArrowRightIcon
									aria-hidden="true"
									className="ml-auto size-3.5 shrink-0 text-muted-foreground"
								/>
							</button>
						);
					})
				) : (
					<p className="px-1 text-muted-foreground text-sm">
						Quote a verse to see it here.
					</p>
				)}
			</section>

			<section
				aria-labelledby="note-outline-tasks"
				className="flex flex-col gap-1.5 border-border border-t pt-4"
			>
				<h3 className={eyebrowClassName} id="note-outline-tasks">
					Open tasks
				</h3>
				<p className="text-secondary-foreground text-sm leading-normal">
					{openTasks === 0
						? "No unchecked items in this note."
						: `${openTasks} unchecked ${openTasks === 1 ? "item" : "items"} in this note.`}
				</p>
			</section>
		</div>
	);
}

function describeSection({
	paragraphs,
	verses,
}: {
	paragraphs: number;
	verses: number;
}) {
	const parts = [
		paragraphs
			? `${paragraphs} ${paragraphs === 1 ? "paragraph" : "paragraphs"}`
			: null,
		verses ? `${verses} ${verses === 1 ? "verse" : "verses"}` : null,
	].filter(Boolean);
	return parts.length ? parts.join(" · ") : "Empty";
}
