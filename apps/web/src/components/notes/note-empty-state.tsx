import { Kbd } from "@berean-study/ui/components/kbd";

import {
	type NoteTemplate,
	noteTemplates,
	sectionToneClassName,
} from "./note-templates";

/**
 * Guidance shown under the empty writing surface of a new note. The editor's
 * placeholder carries the prompt line; this adds structures and shortcuts.
 */
export function NoteEmptyState({
	onChooseTemplate,
}: {
	onChooseTemplate: (template: NoteTemplate) => void;
}) {
	return (
		<div className="flex flex-col gap-5 px-5 pb-8 sm:px-10">
			<ul
				aria-label="Study structures"
				className="grid grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-3"
			>
				{noteTemplates.map((template) => (
					<li key={template.id}>
						<button
							className="flex h-full w-full flex-col gap-2.5 rounded-[14px] border border-border bg-background p-4 text-left transition-colors hover:border-primary/30 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							onClick={() => onChooseTemplate(template)}
							type="button"
						>
							<span aria-hidden="true" className="flex flex-wrap gap-1">
								{template.labels.map((label) => (
									<span
										className={`rounded-md px-1.5 py-0.5 font-semibold text-[11px] uppercase ${sectionToneClassName[label.variant].label}`}
										key={label.text}
									>
										{label.text}
									</span>
								))}
							</span>
							<span className="font-semibold text-[15px]">{template.name}</span>
							<span className="text-[13px] text-muted-foreground leading-snug">
								{template.description}
							</span>
						</button>
					</li>
				))}
			</ul>
			<p className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
				<span>
					<Kbd>/</Kbd> commands
				</span>
				<span>
					<Kbd>⌘ ⇧ F</Kbd> focus mode
				</span>
			</p>
		</div>
	);
}
