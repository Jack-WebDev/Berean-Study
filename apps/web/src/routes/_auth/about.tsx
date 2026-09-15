import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Layers3, ShieldCheck, UsersRound } from "lucide-react";

export const Route = createFileRoute("/_auth/about")({
	component: AboutPage,
});

const principles = [
	{
		title: "Scripture first",
		description:
			"The biblical text remains at the center of the experience. Study tools exist to help you understand the text rather than distract from it.",
		icon: BookOpen,
	},
	{
		title: "Context matters",
		description:
			"Passages are explained within their literary, historical, and canonical context rather than treated as isolated verses.",
		icon: Layers3,
	},
	{
		title: "Disagreement is presented fairly",
		description:
			"When significant interpretations differ, Berean Study shows the major views and the evidence behind them instead of quietly presenting one position as fact.",
		icon: UsersRound,
	},
	{
		title: "Evidence matters",
		description:
			"Historical claims, quotations, original-language observations, and scholarly positions are researched and reviewed carefully.",
		icon: ShieldCheck,
	},
];

function AboutPage() {
	return (
		<main className="min-h-full">
			<section
				className="relative isolate overflow-hidden border-border border-b bg-center bg-cover"
				style={{
					backgroundImage: "url('/about-hero.png')",
				}}
			>
				<div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/75 to-background/15" />
				<div className="absolute inset-0 -z-10 bg-gradient-to-t from-background/20 via-transparent to-background/10" />

				<div className="mx-auto flex min-h-[390px] w-full max-w-6xl items-center px-6 py-16 lg:px-10">
					<div className="max-w-2xl">
						<p className="mb-5 font-semibold text-muted-foreground text-xs uppercase tracking-[0.22em]">
							About Berean Study
						</p>

						<h1 className="max-w-2xl font-semibold font-serif text-4xl text-foreground leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
							Understand Scripture with greater clarity.
						</h1>

						<p className="mt-6 max-w-xl text-base text-muted-foreground leading-7 sm:text-lg">
							Berean Study is a Bible study platform built to help people read
							Scripture carefully, understand its context, and explore serious
							biblical scholarship without unnecessary complexity.
						</p>

						<blockquote className="mt-8 max-w-xl border-primary border-l-2 pl-5">
							<p className="font-serif text-base text-foreground/90 italic leading-7 sm:text-lg">
								“Now these Jews were more noble than those in Thessalonica; they
								received the word with all eagerness, examining the Scriptures
								daily to see if these things were so.”
							</p>

							<footer className="mt-2 text-muted-foreground text-sm">
								Acts 17:11
							</footer>
						</blockquote>
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-10 lg:py-16">
				<section className="max-w-4xl">
					<h2 className="font-semibold font-serif text-2xl text-foreground tracking-tight sm:text-3xl">
						Why Berean Study
					</h2>

					<p className="mt-2 text-base text-muted-foreground">
						Scripture deserves careful attention.
					</p>

					<p className="mt-5 max-w-3xl text-base text-muted-foreground leading-7">
						Berean Study brings together biblical context, commentary,
						original-language insights, cross-references, textual notes, and
						major interpretive perspectives in one focused reading experience.
					</p>
				</section>

				<div className="my-12 border-border border-t" />

				<section>
					<div>
						<h2 className="font-semibold font-serif text-2xl text-foreground tracking-tight sm:text-3xl">
							Our approach
						</h2>

						<p className="mt-2 text-base text-muted-foreground">
							Four guiding principles shape everything we do.
						</p>
					</div>

					<div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-2">
						{principles.map((principle) => {
							const Icon = principle.icon;

							return (
								<article key={principle.title}>
									<div className="flex size-12 items-center justify-center rounded-full bg-primary/8 text-primary">
										<Icon className="size-5" strokeWidth={1.8} />
									</div>

									<h3 className="mt-5 font-semibold font-serif text-foreground text-lg">
										{principle.title}
									</h3>

									<p className="mt-2 text-muted-foreground text-sm leading-6">
										{principle.description}
									</p>
								</article>
							);
						})}
					</div>
				</section>

				<div className="my-12 border-border border-t" />

				<footer className="flex flex-col gap-5 pb-8 text-muted-foreground text-sm sm:flex-row sm:items-end sm:justify-between">
					<nav
						aria-label="About page links"
						className="flex items-center gap-5"
					>
						<a
							href="/privacy"
							className="transition-colors hover:text-foreground"
						>
							Terms &amp; Privacy
						</a>

						<a
							href="/contact"
							className="transition-colors hover:text-foreground"
						>
							Contact
						</a>
					</nav>
				</footer>
			</div>
		</main>
	);
}
