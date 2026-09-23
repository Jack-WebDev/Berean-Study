import { buttonVariants } from "@berean-study/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@berean-study/ui/components/card";
import { cn } from "@berean-study/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	BookOpenIcon,
	FileTextIcon,
	FolderIcon,
	HeartIcon,
} from "lucide-react";

const publishingDestinations = [
	{
		description: "Write a Scripture-rooted reflection to share with others.",
		href: "/library/notes/new",
		icon: FileTextIcon,
		title: "Create a note",
	},
	{
		description:
			"Gather passages and study material around a meaningful theme.",
		href: "/library/collections",
		icon: FolderIcon,
		title: "Create a collection",
	},
	{
		description: "Tell how God has been at work in your life.",
		href: "/library/testimonials/new",
		icon: BookOpenIcon,
		title: "Write a testimony",
	},
	{
		description: "Invite the community to pray with you and for you.",
		href: "/library/prayers/new",
		icon: HeartIcon,
		title: "Share a prayer",
	},
] as const;

export function CommunitySharePage() {
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
						Share with Community
					</h1>
					<p className="mt-4 text-base text-muted-foreground leading-7 sm:text-[1.0625rem]">
						Choose a way to prepare something from your personal study for the
						community.
					</p>
				</header>

				<section
					aria-label="Choose content to share"
					className="grid gap-4 sm:grid-cols-2"
				>
					{publishingDestinations.map((destination) => {
						const Icon = destination.icon;

						return (
							<Link
								className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								key={destination.href}
								to={destination.href}
							>
								<Card className="h-full rounded-xl border-border/70 py-0 transition-colors hover:bg-muted/40">
									<CardHeader className="gap-4 px-5 pt-5 pb-2">
										<Icon aria-hidden="true" className="size-5 text-primary" />
										<CardTitle className="font-serif text-xl tracking-[-0.02em]">
											{destination.title}
										</CardTitle>
									</CardHeader>
									<CardContent className="px-5 pb-5">
										<CardDescription className="text-sm leading-6">
											{destination.description}
										</CardDescription>
									</CardContent>
								</Card>
							</Link>
						);
					})}
				</section>
			</div>
		</main>
	);
}
