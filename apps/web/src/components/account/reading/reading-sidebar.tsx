export function ReadingSidebar() {
	return (
		<aside className="hidden flex-col gap-4 md:flex">
			<section className="relative hidden min-h-46 overflow-hidden rounded-xl border border-border bg-secondary md:block">
				<img
					alt=""
					className="absolute inset-0 size-full object-cover opacity-55"
					src="/landing/cta-hills.png"
				/>
				<div className="absolute inset-0 bg-linear-to-b from-secondary/90 via-secondary/60 to-transparent" />
				<blockquote className="relative z-10 p-5">
					<p className="max-w-52 font-serif text-foreground text-lg leading-[1.38] tracking-[-0.015em]">
						“Your word is a lamp to my feet and a light to my path.”
					</p>
					<footer className="mt-3 text-foreground/80 text-xs">
						Psalm 119:105
					</footer>
				</blockquote>
			</section>
		</aside>
	);
}
