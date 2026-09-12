import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import type { LucideIcon } from "lucide-react";

export function DestinationPage({
	description,
	icon: Icon,
	title,
}: {
	description: string;
	icon: LucideIcon;
	title: string;
}) {
	return (
		<div className="flex min-h-full flex-col px-5 py-8 sm:px-8 lg:px-12">
			<div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
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
