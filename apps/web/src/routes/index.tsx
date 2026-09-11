import { Button } from "@berean-study/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	BookOpenIcon,
	FileTextIcon,
	LanguagesIcon,
	SearchIcon,
	UsersRoundIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
	component: HomePage,
});

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

function HomePage() {
	return (
		<main className="bg-background pb-20 text-foreground md:pb-0">
			<HeroSection />
			<StudyPrinciples />
			<ScriptureSection />
			<FinalCallToAction />
		</main>
	);
}

function HeroSection() {
	return (
		<section
			id="search"
			className="relative isolate min-h-[calc(100svh-3.5rem)] overflow-hidden border-b md:min-h-[calc(100svh-4rem)]"
		>
			{/* Full-bleed hero image */}
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-center bg-cover md:bg-center"
				style={{
					backgroundImage: "url('/landing/hero-visual.png')",
				}}
			/>

			{/* Mobile overlay */}
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-black/20 md:hidden"
			/>

			<div
				aria-hidden="true"
				className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/75 md:hidden"
			/>

			{/* Desktop overlay */}
			<div
				aria-hidden="true"
				className="absolute inset-0 hidden bg-gradient-to-r from-background via-[42%] via-background/95 to-background/10 md:block"
			/>

			<div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-7xl items-center px-5 py-16 md:min-h-[calc(100svh-4rem)] md:px-8 md:py-20 lg:px-12">
				<div className="mx-auto flex w-full max-w-xl flex-col items-center text-center md:mx-0 md:block md:w-[55%] md:max-w-2xl md:text-left">
					<div className="text-white md:text-foreground">
						<p className="font-medium text-[11px] text-white/70 uppercase tracking-[0.22em] md:text-muted-foreground md:text-xs">
							Bible study, deeper understanding
						</p>

						<h1 className="mx-auto mt-4 max-w-lg text-balance font-serif text-[2.9rem] leading-[0.96] tracking-[-0.045em] sm:text-5xl md:mx-0 md:mt-5 md:text-6xl lg:text-7xl">
							Read Scripture <span className="md:block">in context.</span>
						</h1>

						<p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] text-white/80 leading-6 md:mx-0 md:mt-7 md:text-lg md:text-muted-foreground md:leading-8">
							Understand what the text says, why interpretations differ, and
							what evidence supports them.
						</p>
					</div>

					<SearchBar />

					<Link
						to="/"
						hash="browse"
						className="group mt-5 inline-flex min-h-11 items-center gap-2 font-medium text-sm text-white md:mt-6 md:text-foreground"
					>
						Browse Scripture
						<ArrowRightIcon
							aria-hidden="true"
							className="size-4 transition-transform md:group-hover:translate-x-1"
							strokeWidth={1.6}
						/>
					</Link>
				</div>
			</div>
		</section>
	);
}

function SearchBar() {
	return (
		<form action="#browse" className="mt-7 w-full max-w-xl md:mt-9">
			<label htmlFor="scripture-search" className="sr-only">
				Search Scripture
			</label>

			<div className="flex h-12 items-center rounded-2xl border border-white/20 bg-white/90 px-3 shadow-lg backdrop-blur-xl md:h-14 md:rounded-full md:border-border/80 md:bg-background/95 md:p-1.5 md:pl-4 md:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
				<SearchIcon
					aria-hidden="true"
					className="size-[18px] shrink-0 text-muted-foreground md:size-5"
					strokeWidth={1.7}
				/>

				<input
					id="scripture-search"
					name="reference"
					type="search"
					autoComplete="off"
					placeholder="Search Scripture"
					className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
				/>

				<button
					type="submit"
					aria-label="Search"
					className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground md:hidden"
				>
					<ArrowRightIcon
						aria-hidden="true"
						className="size-4"
						strokeWidth={1.8}
					/>
				</button>

				<button
					type="submit"
					className="hidden h-11 shrink-0 items-center justify-center rounded-full bg-primary px-5 font-medium text-primary-foreground text-sm md:inline-flex"
				>
					Search
				</button>
			</div>
		</form>
	);
}

function StudyPrinciples() {
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

function ScriptureSection() {
	return (
		<section id="browse" className="scroll-mt-20">
			<div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<Eyebrow>Browse the Bible</Eyebrow>

						<h2 className="mt-4 font-serif text-4xl tracking-[-0.035em] sm:text-5xl">
							Begin with Scripture.
						</h2>
					</div>

					<Link
						to="/bible"
						className="group inline-flex min-h-11 items-center gap-2 self-start font-medium text-primary text-sm"
					>
						View all books
						<ArrowRightIcon
							aria-hidden="true"
							className="size-4 transition-transform group-hover:translate-x-1"
							strokeWidth={1.6}
						/>
					</Link>
				</div>

				<div className="mt-12 grid gap-5 lg:grid-cols-2">
					<ScriptureCard
						title="Old Testament"
						description="From creation, covenant, and kingdom to the prophets and the hope of restoration."
						image="/landing/old-testament.png"
					/>

					<ScriptureCard
						title="New Testament"
						description="The life of Jesus, the beginning of the church, the apostolic writings, and the hope of new creation."
						image="/landing/new-testament.png"
					/>
				</div>
			</div>
		</section>
	);
}

function ScriptureCard({
	description,
	image,
	title,
}: {
	description: string;
	image: string;
	title: string;
}) {
	return (
		<Link
			to="/bible"
			className="group relative min-h-[28rem] overflow-hidden rounded-3xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
		>
			<img
				src={image}
				alt=""
				width={1200}
				height={900}
				loading="lazy"
				className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
			/>

			<div
				aria-hidden="true"
				className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
			/>

			<div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
				<h3 className="mt-2 font-serif text-3xl sm:text-4xl">{title}</h3>

				<p className="mt-3 max-w-md text-sm text-white/75 leading-6">
					{description}
				</p>

				<span className="mt-6 inline-flex items-center gap-2 font-medium text-sm">
					Browse books
					<ArrowRightIcon
						aria-hidden="true"
						className="size-4 transition-transform group-hover:translate-x-1"
						strokeWidth={1.6}
					/>
				</span>
			</div>
		</Link>
	);
}

function FinalCallToAction() {
	return (
		<section id="library" className="border-t bg-secondary">
			<div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
				<div className="mx-auto max-w-3xl text-center">
					<Eyebrow>Berean Study</Eyebrow>

					<h2 className="mt-4 text-balance font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
						Study Scripture with clarity and confidence.
					</h2>

					<p className="mx-auto mt-5 max-w-2xl text-pretty text-muted-foreground leading-7">
						Read the text, understand its context, examine the evidence, and
						explore where thoughtful interpreters disagree.
					</p>

					<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
						<Button
							render={<Link to="/bible" />}
							className="h-12 gap-2 rounded-full px-7 text-sm"
						>
							Start reading
							<ArrowRightIcon
								aria-hidden="true"
								data-icon="inline-end"
								strokeWidth={1.6}
							/>
						</Button>

						<Button
							render={<Link to="/login" />}
							variant="outline"
							className="h-12 rounded-full px-7 text-sm"
						>
							Create account
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}

function Eyebrow({ children }: { children: string }) {
	return (
		<p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.22em]">
			{children}
		</p>
	);
}
