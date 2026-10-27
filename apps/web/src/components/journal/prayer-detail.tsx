import type { PrayerSummary } from "@berean-study/db/prayers";
import { getDocumentVerseBlocks } from "@berean-study/rich-text-editor/document";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@berean-study/ui/components/alert-dialog";
import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { cn } from "@berean-study/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	EllipsisIcon,
	NotebookPenIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";
import { type FormEvent, type Ref, useId, useState } from "react";
import { toast } from "sonner";

import { addPrayerUpdate, deletePrayer } from "@/functions/prayers";
import { invalidatePrayerJournal } from "@/queries/prayer-journal";
import { prayerQueryOptions } from "@/queries/prayers";
import { formatShortDate } from "@/utils/dates";
import { JournalEntryBody } from "./journal-editor";
import {
	buttonLinkClassName,
	CategoryTag,
	cardClassName,
	primaryButtonClassName,
	SectionLabel,
} from "./journal-ui";

export function PrayerDetail({
	prayer,
	ref,
}: {
	prayer: PrayerSummary;
	ref?: Ref<HTMLElement>;
}) {
	const headingId = useId();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [confirmDelete, setConfirmDelete] = useState(false);
	const remove = useMutation({
		mutationFn: () => deletePrayer({ data: { id: prayer.id } }),
		onSuccess: async () => {
			toast.success("Prayer deleted. Its reflections are kept.");
			await invalidatePrayerJournal(queryClient);
			void navigate({ replace: true, search: {}, to: "/library/prayers" });
		},
		onError: () =>
			toast.error("We couldn’t delete this prayer. Please try again."),
	});
	const quotesVerse = getDocumentVerseBlocks(prayer.content).length > 0;
	// Prayers from the old editor may have a passage linked beside the text
	// rather than quoted in it; show that link until the prayer is next saved.
	const linkedPassage = quotesVerse ? null : prayer.passages[0];

	return (
		<article
			aria-labelledby={headingId}
			className={cn(
				cardClassName,
				"flex min-w-0 flex-[1.4_1_420px] scroll-mt-6 flex-col gap-5.5 p-6 sm:p-8",
			)}
			ref={ref}
		>
			<div className="flex flex-col gap-2.5">
				<div className="flex flex-wrap items-center gap-2.5">
					{prayer.category ? <CategoryTag category={prayer.category} /> : null}
					<span className="text-[13px] text-muted-foreground">
						Started {formatShortDate(prayer.createdAt)}
					</span>
					{prayer.prayingFor ? (
						<span className="text-[13px] text-muted-foreground">
							· For {prayer.prayingFor}
						</span>
					) : null}
				</div>
				<h2
					className="font-serif text-3xl text-primary leading-tight sm:text-[34px]"
					id={headingId}
				>
					{prayer.title}
				</h2>
			</div>
			<JournalEntryBody ariaLabel="Prayer" document={prayer.content} />
			{linkedPassage?.title ? (
				<figure className="flex flex-col gap-1.5 rounded-[14px] border border-scripture-border bg-scripture px-5 py-4">
					<figcaption className="font-semibold text-[13px] text-scripture-foreground">
						<Link
							className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							search={{ passage: linkedPassage.id }}
							to="/bible"
						>
							{linkedPassage.title}
						</Link>
					</figcaption>
				</figure>
			) : null}
			<div className="flex flex-wrap gap-2.5">
				<Link
					className={buttonLinkClassName("default", primaryButtonClassName)}
					search={{ prayerId: prayer.id }}
					to="/library/reflections/new"
				>
					<NotebookPenIcon data-icon="inline-start" />
					Write a reflection
				</Link>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								aria-label="More actions"
								className="ml-auto size-11 rounded-xl border-border bg-card"
								size="icon"
								variant="outline"
							>
								<EllipsisIcon aria-hidden="true" />
							</Button>
						}
					/>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() =>
								void navigate({
									params: { prayerId: prayer.id },
									to: "/library/prayers/$prayerId/edit",
								})
							}
						>
							<PencilIcon aria-hidden="true" />
							Edit prayer
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => setConfirmDelete(true)}
							variant="destructive"
						>
							<Trash2Icon aria-hidden="true" />
							Delete prayer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<PrayerUpdates prayerId={prayer.id} />
			<AlertDialog onOpenChange={setConfirmDelete} open={confirmDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this prayer?</AlertDialogTitle>
						<AlertDialogDescription>
							The prayer and its updates will be removed. Reflections you wrote
							about it are kept. This can’t be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => remove.mutate()}
							variant="destructive"
						>
							Delete prayer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</article>
	);
}

/** A timeline of short notes on how things have changed. */
function PrayerUpdates({ prayerId }: { prayerId: number }) {
	const headingId = useId();
	const queryClient = useQueryClient();
	const detail = useQuery(prayerQueryOptions(prayerId));
	const [text, setText] = useState("");
	const add = useMutation({
		mutationFn: (value: string) =>
			addPrayerUpdate({ data: { prayerId, text: value } }),
		onSuccess: async () => {
			setText("");
			await invalidatePrayerJournal(queryClient);
		},
		onError: () =>
			toast.error("We couldn’t add that update. Please try again."),
	});
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (text.trim()) add.mutate(text.trim());
	};
	const updates = detail.data?.updates ?? [];

	return (
		<section
			aria-labelledby={headingId}
			className="flex flex-col gap-3.5 border-border/70 border-t pt-5"
		>
			<SectionLabel as="h3" id={headingId}>
				Updates
			</SectionLabel>
			{updates.length ? (
				<ol className="flex flex-col gap-3.5">
					{updates.map((update) => (
						<li className="flex gap-3.5" key={update.id}>
							<span
								aria-hidden="true"
								className="mt-1.5 size-2.5 flex-none rounded-full bg-scripture-accent"
							/>
							<span className="flex flex-col gap-0.5">
								<span className="text-muted-foreground text-xs">
									{formatShortDate(update.createdAt)}
								</span>
								<span className="text-foreground/90 text-sm leading-relaxed">
									{update.text}
								</span>
							</span>
						</li>
					))}
				</ol>
			) : detail.isPending ? null : (
				<p className="text-muted-foreground text-sm">
					No updates yet. Note what’s changed as you keep praying.
				</p>
			)}
			<form
				className="flex items-center gap-2.5 rounded-xl border border-input bg-background py-1.5 pr-1.5 pl-3.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"
				onSubmit={submit}
			>
				<label className="sr-only" htmlFor={`${headingId}-input`}>
					Add an update
				</label>
				<input
					className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
					id={`${headingId}-input`}
					maxLength={1000}
					onChange={(event) => setText(event.target.value)}
					placeholder="Add an update — what’s changed?"
					value={text}
				/>
				<button
					className="h-9 pointer-coarse:h-11 rounded-[9px] bg-secondary px-3.5 font-semibold text-[13px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
					disabled={!text.trim() || add.isPending}
					type="submit"
				>
					Add
				</button>
			</form>
		</section>
	);
}
