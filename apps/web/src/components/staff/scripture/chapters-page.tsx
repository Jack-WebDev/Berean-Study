import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { versePresenceLabels } from "@berean-study/db/scripture-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { bookStructureQueryOptions } from "@/queries/scripture-data";

import { staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import { StatusChip } from "../status-chip";
import { canReadVerseText, verseCountLabel } from "./scripture-access";

const gridCell =
	"grid place-items-center rounded-[0.625rem] border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ChaptersPage({
	chapter,
	permissionKeys,
	slug,
	verse,
}: {
	chapter?: number;
	permissionKeys: readonly PermissionKey[];
	slug: string;
	verse?: number;
}) {
	const { data } = useSuspenseQuery(
		bookStructureQueryOptions({ chapter, slug, verse }),
	);

	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this book</h1>
				<Link className={cn(staffLinkClassName, "mt-6")} to="/admin/scripture">
					Back to Scripture data
				</Link>
			</div>
		);
	}

	const { book, chapters, selectedVerse, verses } = data;
	const totalVerses = chapters.reduce((total, { verses }) => total + verses, 0);
	const canEnter = permissionKeys.includes("scripture.enter");
	const canManage = permissionKeys.includes("scripture.manage");
	const reference = `${book.name} ${data.chapter}`;

	return (
		<StaffPage
			actions={
				canManage ? (
					<>
						<Link className={staffLinkClassName} to="/admin/canon">
							Chapter limits
						</Link>
						<Link
							className={staffLinkClassName}
							params={{ bookSlug: book.slug }}
							search={{ chapter: data.chapter ?? undefined }}
							to="/admin/scripture/$bookSlug/add-verses"
						>
							+ Add verse
						</Link>
					</>
				) : null
			}
			description="The skeleton every translation, commentary and link hangs on. Verse text lives in Translations; this shows which chapters and verses exist."
			section={`${book.name} · Structure`}
			title="Chapters & verses"
		>
			{permissionKeys.includes("scripture.manage") ? null : (
				<p className="mb-6 rounded-2xl bg-status-info p-4 text-sm text-status-info-foreground">
					Only a Superadmin can change the structure.
				</p>
			)}

			{chapters.length === 0 ? (
				<StaffCard title={`No chapters of ${book.name} yet`}>
					<p className="max-w-[65ch] text-muted-foreground text-sm">
						Chapters and verses are created as your team enters the text, so
						this fills up as the work goes on.
					</p>
					{canEnter ? (
						<Link
							className={cn(staffLinkClassName, "mt-4")}
							search={{ book: book.slug }}
							to="/work/scripture"
						>
							Go to Scripture entry
						</Link>
					) : null}
				</StaffCard>
			) : (
				<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
					<StaffCard title="Chapters">
						<p className="-mt-3 mb-3 text-muted-foreground text-xs">
							{chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
							, {verseCountLabel(totalVerses)}
						</p>
						<ul className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2">
							{chapters.map((item) => (
								<li key={item.id}>
									<Link
										aria-current={
											item.number === data.chapter ? "true" : undefined
										}
										className={cn(
											gridCell,
											"relative min-h-14 py-1",
											item.number === data.chapter
												? "border-accent bg-sidebar-accent"
												: "border-border-subtle bg-background hover:bg-muted",
										)}
										params={{ bookSlug: book.slug }}
										search={{ chapter: item.number }}
										to="/admin/scripture/$bookSlug/chapters"
									>
										<span className="font-semibold">{item.number}</span>
										<span className="text-[0.6875rem] text-muted-foreground">
											{item.verses} v
										</span>
										{item.differingVerses > 0 ? (
											<span
												className="absolute top-1 right-1 size-1.5 rounded-full bg-accent"
												title="A verse differs between translations"
											>
												<span className="sr-only">
													A verse differs between translations
												</span>
											</span>
										) : null}
									</Link>
								</li>
							))}
						</ul>
						<p className="mt-3 text-muted-foreground text-xs">
							A dot means a verse differs between translations.
						</p>
					</StaffCard>

					<StaffCard title={`${reference}, ${verseCountLabel(verses.length)}`}>
						<ul className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
							{verses.map((item) => (
								<li key={item.id}>
									<Link
										aria-current={
											item.number === selectedVerse?.number ? "true" : undefined
										}
										aria-label={`Verse ${item.number}${item.differs ? ", differs between translations" : ""}`}
										className={cn(
											gridCell,
											"h-11 font-semibold",
											item.number === selectedVerse?.number
												? "border-primary bg-primary text-primary-foreground"
												: item.differs
													? "border-accent border-dashed bg-status-attention text-status-attention-foreground"
													: "border-border bg-card hover:bg-muted",
										)}
										params={{ bookSlug: book.slug }}
										search={{
											chapter: data.chapter ?? undefined,
											verse: item.number,
										}}
										to="/admin/scripture/$bookSlug/chapters"
									>
										{item.number}
									</Link>
								</li>
							))}
						</ul>

						{selectedVerse ? (
							<div className="mt-5 border-border-subtle border-t pt-5">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h3 className="font-serif text-lg">
										{reference}:{selectedVerse.number}
									</h3>
									<StatusChip
										tone={selectedVerse.differs ? "attention" : "success"}
									>
										{selectedVerse.differs
											? "Differs between translations"
											: "Present in all 6"}
									</StatusChip>
								</div>
								<dl className="mt-3 grid gap-2 sm:grid-cols-2">
									{selectedVerse.presence.map((row) => (
										<div
											className="flex flex-wrap justify-between gap-x-4 rounded-[0.625rem] bg-muted p-3 text-sm"
											key={row.abbreviation}
										>
											<dt className="font-medium">{row.abbreviation}</dt>
											<dd
												className={cn(
													row.kind !== "present" &&
														"text-status-attention-foreground",
												)}
											>
												{row.kind === "present"
													? "Present"
													: versePresenceLabels[row.kind]}
												{row.includedInVerse
													? ` (verse ${row.includedInVerse})`
													: ""}
											</dd>
										</div>
									))}
								</dl>
								<p className="mt-3 text-muted-foreground text-sm">
									Linked to {selectedVerse.linked.commentary} commentary,{" "}
									{selectedVerse.linked.crossReferences} cross-references and{" "}
									{selectedVerse.linked.themes} themes.
								</p>
								<div className="mt-4 flex flex-wrap gap-2">
									{data.chapter &&
									(permissionKeys.includes("content.write") ||
										permissionKeys.includes("content.revise")) ? (
										<Link
											className={staffLinkClassName}
											search={{
												passage: `${book.slug}:${data.chapter}:${selectedVerse.number}`,
											}}
											to="/work/connections"
										>
											Connections
										</Link>
									) : null}
									{data.chapter &&
									permissionKeys.includes("content.original_language") ? (
										<Link
											className={staffLinkClassName}
											search={{
												passage: `${book.slug}:${data.chapter}:${selectedVerse.number}`,
											}}
											to="/work/language"
										>
											Language & text
										</Link>
									) : null}
									{canReadVerseText(permissionKeys) && data.chapter ? (
										<Link
											className={staffLinkClassName}
											params={{
												bookSlug: book.slug,
												chapter: String(data.chapter),
												verse: String(selectedVerse.number),
											}}
											to="/work/scripture/verse/$bookSlug/$chapter/$verse"
										>
											View text in all translations
										</Link>
									) : null}
									{canManage && data.chapter ? (
										<Link
											className={staffLinkClassName}
											params={{ bookSlug: book.slug }}
											search={{
												chapter: data.chapter,
												verse: selectedVerse.number,
											}}
											to="/admin/scripture/$bookSlug/verse-handling"
										>
											Split / merge verse
										</Link>
									) : null}
								</div>
							</div>
						) : null}
					</StaffCard>
				</div>
			)}
		</StaffPage>
	);
}
