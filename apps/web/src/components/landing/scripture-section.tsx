import { ArrowRightIcon } from "lucide-react";

import { Eyebrow } from "./eyebrow";

const testaments = [
	{
		title: "Old Testament",
		description:
			"From creation, covenant, and kingdom to the prophets and the hope of restoration.",
		image: "/landing/old-testament.png",
	},
	{
		title: "New Testament",
		description:
			"The life of Jesus, the beginning of the church, the apostolic writings, and the hope of new creation.",
		image: "/landing/new-testament.png",
	},
] as const;

export function ScriptureSection() {
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

					<a
						href="/bible"
						className="group inline-flex min-h-11 items-center gap-2 self-start font-medium text-primary text-sm"
					>
						View all books
						<ArrowRightIcon
							aria-hidden="true"
							className="size-4 transition-transform group-hover:translate-x-1"
							strokeWidth={1.6}
						/>
					</a>
				</div>

				<div className="mt-12 grid gap-5 lg:grid-cols-2">
					{testaments.map((testament) => (
						<ScriptureCard key={testament.title} {...testament} />
					))}
				</div>
			</div>
		</section>
	);
}

function ScriptureCard({
	description,
	image,
	title,
}: (typeof testaments)[number]) {
	return (
		<a
			href="/bible"
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
		</a>
	);
}
