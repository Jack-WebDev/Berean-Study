import {
	BookOpenIcon,
	FileTextIcon,
	LanguagesIcon,
	UsersRoundIcon,
} from "lucide-react";

import { Eyebrow } from "./eyebrow";

const studyFeatures = [
	{
		title: "Read in context",
		description:
			"Understand each passage within its literary, historical, and biblical setting.",
		icon: BookOpenIcon,
	},
	{
		title: "Examine the language",
		description:
			"Explore important Hebrew and Greek details when they genuinely clarify the text.",
		icon: LanguagesIcon,
	},
	{
		title: "Compare interpretations",
		description: "See major interpretive views presented clearly and fairly.",
		icon: UsersRoundIcon,
	},
	{
		title: "Follow the evidence",
		description:
			"Historical claims, scholarly arguments, and important conclusions are supported by sources.",
		icon: FileTextIcon,
	},
] as const;

export function StudyPrinciples() {
	return (
		<section id="about" className="border-b">
			<div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
				<div className="max-w-2xl">
					<Eyebrow>Built for careful study</Eyebrow>

					<h2 className="mt-4 text-balance font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
						Go deeper without losing the text.
					</h2>

					<p className="mt-5 max-w-xl text-pretty text-muted-foreground leading-7">
						Berean Study keeps Scripture at the center while making deeper
						research available when you need it.
					</p>
				</div>

				<div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
					{studyFeatures.map((feature) => {
						const Icon = feature.icon;

						return (
							<article key={feature.title}>
								<div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
									<Icon
										aria-hidden="true"
										className="size-5"
										strokeWidth={1.5}
									/>
								</div>

								<h3 className="mt-5 font-medium text-base">{feature.title}</h3>

								<p className="mt-2 text-muted-foreground text-sm leading-6">
									{feature.description}
								</p>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
