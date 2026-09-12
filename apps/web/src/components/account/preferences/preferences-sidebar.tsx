import { Button } from "@berean-study/ui/components/button";
import { cn } from "@berean-study/ui/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PreferencesSidebar() {
	return (
		<aside className="flex flex-col gap-5">
			<ScriptureQuote />
			<InfoCard
				className="hidden md:block"
				title="About Bible traditions"
				action={
					<Button className="h-auto p-0 font-medium text-accent" variant="link">
						Learn more
						<ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
					</Button>
				}
			>
				Bible traditions differ in the number of books included in the canon.
				This setting controls which books Berean Study shows in your Bible by
				default. You can still access all books and resources regardless of your
				choice.
			</InfoCard>
		</aside>
	);
}

function ScriptureQuote() {
	return (
		<section className="relative hidden min-h-50 overflow-hidden rounded-2xl border border-border bg-secondary md:block">
			<img
				alt=""
				className="absolute inset-0 size-full object-cover opacity-55"
				src="/landing/cta-hills.png"
			/>
			<div className="absolute inset-0 bg-linear-to-b from-secondary/90 via-secondary/60 to-transparent" />
			<blockquote className="relative z-10 p-6">
				<p className="max-w-60 font-serif text-foreground text-xl leading-[1.4] tracking-[-0.015em]">
					“Let all things be done decently and in order.”
				</p>
				<footer className="mt-4 text-foreground/80 text-sm">
					1 Corinthians 14:40
				</footer>
			</blockquote>
		</section>
	);
}

function InfoCard({
	title,
	children,
	action,
	className,
}: {
	title: string;
	children: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"rounded-2xl border border-border/60 bg-card p-5 shadow-sm",
				className,
			)}
		>
			<h2 className="font-serif text-xl tracking-[-0.015em]">{title}</h2>
			<div className="mt-3 text-muted-foreground text-sm leading-6">
				{children}
			</div>
			{action ? <div className="mt-4">{action}</div> : null}
		</section>
	);
}
