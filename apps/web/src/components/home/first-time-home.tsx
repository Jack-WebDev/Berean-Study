import { BookOpen, ChevronRight, Search } from "lucide-react";

const popularStartingPoints = [
	{
		title: "The Gospel of John",
		description: "A close look at who Jesus is",
		image:
			"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
	},
	{
		title: "Romans",
		description: "Life in the Spirit",
		image:
			"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80",
	},
	{
		title: "Genesis",
		description: "The beginning of God's story",
		image:
			"https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80",
	},
];

export function FirstTimeHome() {
	return (
		<div>
			<section className="relative overflow-hidden">
				<img
					src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2200&q=90"
					alt=""
					className="absolute inset-0 size-full object-cover"
				/>
				<div className="absolute inset-0 bg-linear-to-b from-background/92 via-background/78 to-background/30" />

				<div className="relative mx-auto flex min-h-[650px] max-w-6xl flex-col items-center px-6 pt-20 pb-16 text-center md:px-10">
					<h1 className="max-w-3xl font-semibold font-serif text-4xl text-foreground tracking-[-0.03em] md:text-6xl">
						Welcome to Berean Study
					</h1>
					<p className="mt-5 max-w-xl text-lg text-muted-foreground leading-8">
						A deeper understanding of Scripture.
						<br />
						Always rooted in the text.
					</p>

					<div className="mt-12 w-full max-w-[620px] rounded-[28px] border border-border bg-card/94 p-7 text-left shadow-xl backdrop-blur-xl md:p-9">
						<h2 className="text-center font-serif text-2xl text-foreground">
							Where would you like to begin?
						</h2>
						<div className="mt-7 flex flex-col gap-4">
							<a
								href="/bible"
								className="group flex items-center gap-5 rounded-2xl bg-primary px-6 py-5 text-primary-foreground transition hover:bg-primary/90"
							>
								<div className="grid size-11 shrink-0 place-items-center">
									<BookOpen className="size-7" strokeWidth={1.6} />
								</div>
								<div className="min-w-0 flex-1">
									<div className="font-medium">Browse Scripture</div>
									<div className="mt-1 text-primary-foreground/70 text-sm">
										Explore the books of the Bible
									</div>
								</div>
								<ChevronRight className="size-5 transition-transform group-hover:translate-x-1" />
							</a>

							<button
								type="button"
								className="group flex w-full items-center gap-5 rounded-2xl border border-border bg-card px-6 py-5 text-left transition hover:bg-muted"
							>
								<div className="grid size-11 shrink-0 place-items-center">
									<Search className="size-7" strokeWidth={1.6} />
								</div>
								<div className="min-w-0 flex-1">
									<div className="font-medium text-foreground">
										Go to a passage
									</div>
									<div className="mt-1 text-muted-foreground text-sm">
										Enter a reference, e.g. John 3:16
									</div>
								</div>
								<ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
							</button>
						</div>
					</div>
				</div>
			</section>

			<section className="px-6 py-14 md:px-10">
				<div className="mx-auto max-w-6xl">
					<SectionDivider label="Or explore a popular starting point" />
					<div className="mt-10 grid gap-5 md:grid-cols-3">
						{popularStartingPoints.map((item) => (
							<a
								key={item.title}
								href="/bible"
								className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
							>
								<img
									src={item.image}
									alt=""
									className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.02]"
								/>
								<div className="flex items-end justify-between gap-4 p-5">
									<div>
										<h3 className="font-medium text-foreground">
											{item.title}
										</h3>
										<p className="mt-1 text-muted-foreground text-sm">
											{item.description}
										</p>
									</div>
									<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
								</div>
							</a>
						))}
					</div>

					<blockquote className="mx-auto mt-12 max-w-3xl rounded-2xl bg-muted px-8 py-7 text-center">
						<p className="font-serif text-lg text-muted-foreground italic">
							“Search the Scriptures to see if these things are so.”
						</p>
						<footer className="mt-3 text-muted-foreground text-sm">
							Acts 17:11
						</footer>
					</blockquote>
				</div>
			</section>
		</div>
	);
}

function SectionDivider({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-6">
			<div className="h-px flex-1 bg-border" />
			<p className="font-serif text-foreground text-xl">{label}</p>
			<div className="h-px flex-1 bg-border" />
		</div>
	);
}
