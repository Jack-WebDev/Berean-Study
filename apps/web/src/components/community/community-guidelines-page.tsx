import { buttonVariants } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

const guidelines = [
	{
		description:
			"Speak with grace and humility, remembering that every person here is seeking to grow in Christ.",
		title: "Encourage one another",
	},
	{
		description:
			"Share what is helpful, truthful, and appropriate for a study-focused Christian community.",
		title: "Contribute thoughtfully",
	},
	{
		description:
			"Let Scripture guide our conversations, reflections, prayers, and testimonies.",
		title: "Keep Scripture central",
	},
	{
		description:
			"Do not share personal details, private conversations, or material that belongs to someone else without permission.",
		title: "Respect privacy",
	},
] as const;

export function CommunityGuidelinesPage() {
	return (
		<main className="min-h-full bg-background text-foreground">
			<div className="mx-auto flex w-full max-w-[72rem] flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
				<Link
					className={cn(
						buttonVariants({ size: "sm", variant: "ghost" }),
						"w-fit rounded-md text-muted-foreground",
					)}
					to="/community"
				>
					<ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
					Back to Community
				</Link>

				<header className="max-w-2xl">
					<h1 className="font-serif text-4xl leading-none tracking-[-0.045em] sm:text-5xl">
						Community Guidelines
					</h1>
					<p className="mt-4 text-base text-muted-foreground leading-7 sm:text-[1.0625rem]">
						Berean Study Community is a place to learn, reflect, and encourage
						one another in Christ.
					</p>
				</header>

				<section
					aria-label="Community guidelines"
					className="grid gap-4 sm:grid-cols-2"
				>
					{guidelines.map((guideline) => (
						<Card
							className="rounded-xl border border-border/70 py-0 shadow-sm"
							key={guideline.title}
						>
							<CardHeader className="px-5 pt-5 pb-2">
								<CardTitle className="font-serif text-xl tracking-[-0.02em]">
									{guideline.title}
								</CardTitle>
							</CardHeader>
							<CardContent className="px-5 pb-5 text-muted-foreground text-sm leading-6">
								{guideline.description}
							</CardContent>
						</Card>
					))}
				</section>
			</div>
		</main>
	);
}
