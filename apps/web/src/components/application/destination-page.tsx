import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { cn } from "@berean-study/ui/lib/utils";
import type { LucideIcon } from "lucide-react";

export function DestinationPage({
	description,
	icon: Icon,
	readingPreferences = false,
	title,
}: {
	description: string;
	icon: LucideIcon;
	readingPreferences?: boolean;
	title: string;
}) {
	return (
		<div className="flex min-h-full flex-col px-5 py-8 sm:px-8 lg:px-12">
			<div
				className={cn(
					"mx-auto flex w-full flex-1 flex-col",
					readingPreferences
						? "reading-preferences max-w-(--reading-width)"
						: "max-w-5xl",
				)}
			>
				<h1 className="font-serif text-3xl tracking-[-0.02em] sm:text-4xl">
					{title}
				</h1>
				<Empty className="mt-8 min-h-64 border-border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Icon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>{title}</EmptyTitle>
						<EmptyDescription>{description}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</div>
		</div>
	);
}
