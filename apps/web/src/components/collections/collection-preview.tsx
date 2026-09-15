import { Badge } from "@berean-study/ui/components/badge";
import type { LucideIcon } from "lucide-react";
import { EllipsisIcon } from "lucide-react";

import { CollectionCover } from "./collection-cover";

type PreviewContent = {
	icon: LucideIcon;
	label: string;
};

export function CollectionPreview({
	contents,
	cover,
	description,
	name,
}: {
	contents: readonly PreviewContent[];
	cover: { alt: string; image: string };
	description: string;
	name: string;
}) {
	const previewName = name.trim() || "Untitled collection";
	const previewDescription =
		description.trim() ||
		"A saved study space for passages, notes, and themes you want to revisit.";

	return (
		<section aria-labelledby="collection-preview-heading">
			<h2
				className="mb-2.5 font-medium text-sm"
				id="collection-preview-heading"
			>
				Preview
			</h2>
			<div className="flex gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-sm">
				<CollectionCover
					alt={cover.alt}
					className="size-20 shrink-0 rounded-md object-cover"
					src={cover.image}
				/>
				<div className="min-w-0 flex-1">
					<div className="flex items-start gap-2">
						<h3 className="min-w-0 flex-1 truncate font-serif text-base leading-5 tracking-[-0.01em]">
							{previewName}
						</h3>
						<EllipsisIcon
							aria-hidden="true"
							className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						/>
					</div>
					<p className="mt-1.5 line-clamp-2 text-muted-foreground text-xs leading-5">
						{previewDescription}
					</p>
					{contents.length > 0 ? (
						<div className="mt-3 flex flex-wrap gap-1.5">
							{contents.map((content) => {
								const Icon = content.icon;

								return (
									<Badge
										className="rounded-full bg-muted px-2 text-muted-foreground"
										key={content.label}
										variant="secondary"
									>
										<Icon aria-hidden="true" data-icon="inline-start" />
										{content.label}
									</Badge>
								);
							})}
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}
