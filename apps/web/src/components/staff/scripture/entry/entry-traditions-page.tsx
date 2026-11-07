import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";

import { entryTraditionsQueryOptions } from "@/queries/verse-text";

import { staffLinkClassName } from "../../staff-button";
import { StaffCard } from "../../staff-card";
import { StaffPage } from "../../staff-page";

function bookCountLabel(bookCount: number) {
	if (bookCount === 0) return "Book list not set yet";
	return `${bookCount} books`;
}

export function EntryTraditionsPage() {
	const { data: traditions } = useSuspenseQuery(entryTraditionsQueryOptions());

	return (
		<StaffPage
			actions={
				<Link className={staffLinkClassName} to="/work/scripture/proofreading">
					Proofreading
				</Link>
			}
			description="Choose the tradition you're entering Scripture for."
			section="Contributor"
			title="Scripture entry"
		>
			{traditions.length === 0 ? (
				<StaffCard>
					<p className="text-sm" role="alert">
						The canons haven't been set up yet. Run db:scripture:sync.
					</p>
				</StaffCard>
			) : (
				<>
					<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{traditions.map(({ bookCount, name, open, slug }) => (
							<li key={slug}>
								{open ? (
									<Link
										className="group flex h-full min-h-40 flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										search={{ canon: slug }}
										to="/work/scripture"
									>
										<span className="font-serif text-xl leading-snug">
											{name}
										</span>
										<span className="mt-1 text-muted-foreground text-sm">
											{bookCountLabel(bookCount)}
										</span>
										<span className="mt-auto flex items-center gap-1 pt-4 font-semibold text-sm">
											Start entry
											<ChevronRightIcon
												aria-hidden="true"
												className="size-4 transition-transform group-hover:translate-x-0.5"
											/>
										</span>
									</Link>
								) : (
									<div className="flex h-full min-h-40 flex-col rounded-2xl border border-border border-dashed bg-muted/50 p-5">
										<span className="font-serif text-muted-foreground text-xl leading-snug">
											{name}
										</span>
										<span className="mt-1 text-muted-foreground text-sm">
											{bookCountLabel(bookCount)}
										</span>
										<span className="mt-auto pt-4 font-medium text-muted-foreground text-sm">
											Not open yet
										</span>
									</div>
								)}
							</li>
						))}
					</ul>
					<p className="mt-4 max-w-[65ch] text-muted-foreground text-sm">
						The other traditions open once it's decided where the text for their
						extra books and chapters will come from.
					</p>
				</>
			)}
		</StaffPage>
	);
}
