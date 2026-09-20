import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import { PrayerLibraryTabs } from "./library-tabs";

export function FaithRecordsPage() {
	return (
		<div className="min-h-full px-5 py-8 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header>
					<h1 className="font-serif text-3xl tracking-[-0.02em] sm:text-4xl">
						Testimonies
					</h1>
					<p className="mt-2 text-muted-foreground">
						Personal faith records, kept alongside your study.
					</p>
				</header>
				<PrayerLibraryTabs active="testimonies" />
				<FaithEmptyState
					description="Testimonies you record during your study will appear here."
					title="No testimonies yet"
				/>
			</main>
		</div>
	);
}

function FaithEmptyState({
	description,
	title,
}: {
	description: string;
	title: string;
}) {
	return (
		<Empty className="min-h-64">
			<EmptyHeader>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
