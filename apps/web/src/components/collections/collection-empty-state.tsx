import { Badge } from "@berean-study/ui/components/badge";
import { Button } from "@berean-study/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { FolderIcon, PlusIcon } from "lucide-react";
import type { ReactNode } from "react";

export function CollectionEmptyState({
	createAction,
}: {
	createAction?: ReactNode;
}) {
	return (
		<section aria-label="No collections yet" id="all-collections">
			<Empty className="min-h-112 rounded-xl border border-border/80 border-dashed bg-card py-12 shadow-sm">
				<EmptyHeader>
					<EmptyMedia
						className="size-14 rounded-full bg-secondary text-primary"
						variant="icon"
					>
						<FolderIcon aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle className="font-serif text-2xl tracking-[-0.02em]">
						<h2>Start your first collection</h2>
					</EmptyTitle>
					<EmptyDescription className="max-w-sm text-sm leading-6">
						Gather passages, notes, and highlights around a topic, study,
						sermon, or question.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					{createAction ?? (
						<Button type="button">
							<PlusIcon aria-hidden="true" data-icon="inline-start" />
							Create Collection
						</Button>
					)}
					<div className="mt-3 flex flex-wrap justify-center gap-2">
						<Badge
							className="rounded-full bg-muted text-muted-foreground"
							variant="secondary"
						>
							Study a book
						</Badge>
						<Badge
							className="rounded-full bg-muted text-muted-foreground"
							variant="secondary"
						>
							Prepare a lesson
						</Badge>
						<Badge
							className="rounded-full bg-muted text-muted-foreground"
							variant="secondary"
						>
							Collect passages by theme
						</Badge>
					</div>
				</EmptyContent>
			</Empty>
		</section>
	);
}
