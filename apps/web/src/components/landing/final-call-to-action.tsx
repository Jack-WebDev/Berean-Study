import { Button } from "@berean-study/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Eyebrow } from "./eyebrow";

export function FinalCallToAction() {
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
							render={<a href="/bible" />}
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
