import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@berean-study/ui/components/tabs";
import type { LucideIcon } from "lucide-react";
import { HeartIcon, ScrollTextIcon } from "lucide-react";

const faithViews = ["prayers", "testimonies"] as const;

export type FaithView = (typeof faithViews)[number];

export function FaithRecordsPage({
	onViewChange,
	view,
}: {
	onViewChange: (view: FaithView) => void;
	view: FaithView;
}) {
	return (
		<div className="min-h-full px-5 py-8 sm:px-8 lg:px-12">
			<main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header>
					<h1 className="font-serif text-3xl tracking-[-0.02em] sm:text-4xl">
						Prayers & Testimonies
					</h1>
					<p className="mt-2 text-muted-foreground">
						Personal faith records, kept alongside your study.
					</p>
				</header>
				<Tabs
					onValueChange={(nextView) => {
						if (isFaithView(nextView)) onViewChange(nextView);
					}}
					value={view}
				>
					<TabsList aria-label="Faith record view" variant="line">
						<TabsTrigger value="prayers">Prayers</TabsTrigger>
						<TabsTrigger value="testimonies">Testimonies</TabsTrigger>
					</TabsList>
					<TabsContent value="prayers">
						<FaithEmptyState
							description="Prayers you record during your study will appear here."
							icon={HeartIcon}
							title="No prayers yet"
						/>
					</TabsContent>
					<TabsContent value="testimonies">
						<FaithEmptyState
							description="Testimonies you record during your study will appear here."
							icon={ScrollTextIcon}
							title="No testimonies yet"
						/>
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}

function FaithEmptyState({
	description,
	icon: Icon,
	title,
}: {
	description: string;
	icon: LucideIcon;
	title: string;
}) {
	return (
		<Empty className="min-h-64 border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Icon aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function isFaithView(value: string): value is FaithView {
	return faithViews.some((view) => view === value);
}
