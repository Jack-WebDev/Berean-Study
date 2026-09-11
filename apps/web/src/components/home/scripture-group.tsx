import { BookOpen } from "lucide-react";

type ScriptureGroupProps = {
	title: string;
	books: string[];
};

export function ScriptureGroup({ title, books }: ScriptureGroupProps) {
	return (
		<div className="rounded-2xl border border-border bg-card p-6">
			<div className="flex items-center gap-3">
				<BookOpen className="size-6 text-primary" strokeWidth={1.7} />
				<h3 className="font-serif text-foreground text-xl">{title}</h3>
			</div>
			<div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
				{books.map((book) => (
					<a
						key={book}
						href={`/bible/${book.toLowerCase().replaceAll(" ", "-")}`}
						className="text-primary text-sm transition hover:text-primary/80"
					>
						{book}
					</a>
				))}
				<a
					href="/bible"
					className="text-muted-foreground text-sm transition hover:text-foreground"
				>
					...
				</a>
			</div>
		</div>
	);
}
