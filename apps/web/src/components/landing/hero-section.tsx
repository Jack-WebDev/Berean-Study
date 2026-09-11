import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, SearchIcon } from "lucide-react";

export function HeroSection() {
	return (
		<section
			id="search"
			className="relative isolate min-h-[calc(100svh-3.5rem)] overflow-hidden border-b md:min-h-[calc(100svh-4rem)]"
		>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-center bg-cover"
				style={{ backgroundImage: "url('/landing/hero-visual.png')" }}
			/>

			<div
				aria-hidden="true"
				className="absolute inset-0 bg-black/20 md:hidden"
			/>

			<div
				aria-hidden="true"
				className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/75 md:hidden"
			/>

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
