import {
	type CommentaryBody,
	citationOffset,
} from "@berean-study/db/commentary-body";
import { RichTextRenderer } from "@berean-study/rich-text-editor";
import type { CSSProperties } from "react";

import { StaffCard } from "../staff-card";

/** The commentary as readers will see it, numbering citations straight through. */
export function CommentaryPreview({ body }: { body: CommentaryBody }) {
	return (
		<StaffCard>
			<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
				Preview as reader
			</p>
			<h2 className="mt-2 font-serif text-2xl tracking-[-0.01em]">
				{body.title || "Untitled"}
			</h2>
			{body.sections.map((section) => (
				<section
					className="mt-6"
					key={section.key}
					style={
						{
							"--citation-offset": citationOffset(body, section.key),
						} as CSSProperties
					}
				>
					<h3 className="font-serif text-xl tracking-[-0.01em]">
						{section.title || "Untitled section"}
					</h3>
					{section.range ? (
						<p className="text-muted-foreground text-sm">
							Verses {section.range}
						</p>
					) : null}
					<RichTextRenderer
						ariaLabel={section.title || "Section"}
						document={section.body}
						preset="contributor"
						variant="plain"
					/>
				</section>
			))}
		</StaffCard>
	);
}
