import type { BookOverview } from "@berean-study/db/book-overview";

/** Roughly how readers meet a book in Browse Scripture. */
export function BookOverviewPreview({
	bookName,
	overview,
}: {
	bookName: string;
	overview: BookOverview;
}) {
	const facts = [
		["Author", overview.author],
		["Date", overview.approximateDate],
		["Written from", overview.writtenFrom],
		["First readers", overview.firstReaders],
		["Key verse", overview.keyVerse],
	].filter(([, value]) => value);

	return (
		<div className="rounded-2xl border border-border bg-background p-5">
			<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
				Reader preview
			</p>
			<h3 className="mt-2 font-serif text-2xl tracking-[-0.01em]">
				{bookName}
			</h3>
			<p className="mt-2 font-serif leading-relaxed">
				{overview.summary || (
					<span className="text-muted-foreground">
						The one-line summary shows here.
					</span>
				)}
			</p>
			{facts.length > 0 ? (
				<dl className="mt-4 space-y-1 text-sm">
					{facts.map(([term, value]) => (
						<div className="flex justify-between gap-3" key={term}>
							<dt className="text-muted-foreground">{term}</dt>
							<dd className="text-right font-medium">{value}</dd>
						</div>
					))}
				</dl>
			) : null}
			{overview.keyThemes.length > 0 ? (
				<ul className="mt-4 flex flex-wrap gap-1.5">
					{overview.keyThemes.map((theme) => (
						<li
							className="rounded-full bg-status-neutral px-2 py-0.5 text-status-neutral-foreground text-xs"
							key={theme}
						>
							{theme}
						</li>
					))}
				</ul>
			) : null}
			{overview.outline.length > 0 ? (
				<ol className="mt-4 space-y-1 text-sm">
					{overview.outline.map(({ heading, range }, position) => (
						// Rows have no identity of their own, and this list is only ever redrawn whole.
						<li className="flex gap-3" key={position}>
							<span className="w-20 shrink-0 text-muted-foreground tabular-nums">
								{range}
							</span>
							<span>{heading}</span>
						</li>
					))}
				</ol>
			) : null}
		</div>
	);
}
