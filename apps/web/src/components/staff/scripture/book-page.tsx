import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { bookGroups } from "@berean-study/db/scripture-catalogue";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { cn } from "@berean-study/ui/lib/utils";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { toast } from "sonner";

import {
	suggestBookChange,
	updateBookRecord,
} from "@/functions/scripture-data";
import { auditKeys, scriptureDataKeys } from "@/queries/keys";
import { scriptureBookQueryOptions } from "@/queries/scripture-data";

import {
	BookOverviewTab,
	OverviewStatusChip,
} from "../content/book-overview-tab";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { StatusChip } from "../status-chip";
import { chapterProgressLabel, verseCountLabel } from "./scripture-access";

export const bookTabs = [
	"overview",
	"introduction",
	"chapters",
	"record",
] as const;
export type BookTab = (typeof bookTabs)[number];

const tabLabels: Record<BookTab, string> = {
	overview: "Overview",
	introduction: "Introduction",
	chapters: "Chapters & verses",
	record: "Book record",
};

type Book = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof scriptureBookQueryOptions>["queryFn"]>
		>
	>
>;

export function BookPage({
	permissionKeys,
	slug,
	tab,
}: {
	permissionKeys: readonly PermissionKey[];
	slug: string;
	tab: BookTab;
}) {
	const { data: book } = useSuspenseQuery(scriptureBookQueryOptions(slug));

	if (!book) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this book</h1>
				<Link className={cn(staffLinkClassName, "mt-6")} to="/admin/scripture">
					Back to Scripture data
				</Link>
			</div>
		);
	}

	const position = book.canons.find(
		({ position }) => position !== null,
	)?.position;

	return (
		<div className="px-4 py-8 sm:px-8 lg:px-12">
			<div className="mx-auto w-full max-w-6xl">
				<header className="flex flex-wrap items-center gap-5">
					<div
						aria-hidden="true"
						className="grid h-28 w-20 shrink-0 place-items-center rounded-lg bg-sidebar-accent font-serif text-lg text-sidebar-accent-foreground"
					>
						{book.shortName ?? book.name}
					</div>
					<div className="min-w-0">
						<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
							{book.testament === "old" ? "Old Testament" : "New Testament"}
							{book.group ? ` · ${book.group}` : ""}
							{position ? ` · Book ${position}` : ""}
						</p>
						<h1 className="mt-1 font-serif text-3xl tracking-[-0.02em] sm:text-[2.5rem] sm:leading-tight">
							{book.name}
						</h1>
						<div className="mt-2 flex flex-wrap gap-1.5">
							<OverviewStatusChip slug={book.slug} />
							<StatusChip tone="neutral">
								{chapterProgressLabel(book.chapters, book.expectedChapters)},{" "}
								{verseCountLabel(book.verses)}
							</StatusChip>
							<StatusChip tone="neutral">
								{book.translationsWithText} of {book.totalTranslations}{" "}
								translations
							</StatusChip>
						</div>
					</div>
				</header>

				<nav
					aria-label="Book sections"
					className="mt-6 flex gap-1 overflow-x-auto border-border border-b"
				>
					{bookTabs.map((value) => (
						<Link
							activeOptions={{ exact: true, includeSearch: true }}
							className={cn(
								"-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								value === tab
									? "border-primary text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
							key={value}
							params={{ bookSlug: slug }}
							search={value === "overview" ? {} : { tab: value }}
							to="/admin/scripture/$bookSlug"
						>
							{tabLabels[value]}
						</Link>
					))}
				</nav>

				<div className="mt-6">
					{tab === "overview" ? (
						<BookOverviewTab
							bookName={book.name}
							chapterLimit={book.chapterLimit}
							permissionKeys={permissionKeys}
							slug={book.slug}
						/>
					) : null}
					{tab === "introduction" ? (
						<WaitingForReviewCard
							body={
								book.introductionSections > 0
									? `${book.introductionSections} sections exist. Editing them arrives with the commentary editor.`
									: "Introductions are written in the commentary editor and reviewed like any commentary."
							}
							title={`Introduction to ${book.name}`}
						/>
					) : null}
					{tab === "chapters" ? <ChaptersSummary book={book} /> : null}
					{tab === "record" ? (
						permissionKeys.includes("scripture.manage") ? (
							<BookRecordForm book={book} key={book.id} />
						) : (
							<BookRecordReadOnly book={book} />
						)
					) : null}
				</div>
			</div>
		</div>
	);
}

function WaitingForReviewCard({
	body,
	title,
}: {
	body: string;
	title: string;
}) {
	return (
		<StaffCard title={title}>
			<p className="max-w-[65ch] text-muted-foreground text-sm">{body}</p>
		</StaffCard>
	);
}

function ChaptersSummary({ book }: { book: Book }) {
	return (
		<StaffCard
			title={`${book.chapters} ${book.chapters === 1 ? "chapter" : "chapters"}, ${verseCountLabel(book.verses)}`}
		>
			<p className="text-muted-foreground text-sm">
				{book.differingVerses > 0
					? `${book.differingVerses} ${book.differingVerses === 1 ? "verse differs" : "verses differ"} between translations.`
					: "No verses differ between translations so far."}
			</p>
			<Link
				className={cn(staffLinkClassName, "mt-4")}
				params={{ bookSlug: book.slug }}
				to="/admin/scripture/$bookSlug/chapters"
			>
				Open chapters and verses
			</Link>
		</StaffCard>
	);
}

function CanonPositions({ canons }: { canons: Book["canons"] }) {
	return (
		<div>
			<p className="font-medium text-sm">Position in each canon</p>
			<dl className="mt-2 grid gap-2 sm:grid-cols-2">
				{canons.map(({ name, position, size }) => (
					<div
						className="flex flex-wrap justify-between gap-x-4 rounded-[0.625rem] bg-muted p-3 text-sm"
						key={name}
					>
						<dt>{name}</dt>
						<dd className="text-muted-foreground">
							{size === 0
								? "List not entered yet"
								: position
									? `${position} of ${size}`
									: "Not in this canon"}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

function BookRecordForm({ book }: { book: Book }) {
	const nameId = useId();
	const titleId = useId();
	const testamentId = useId();
	const groupId = useId();
	const aliasId = useId();
	const [name, setName] = useState(book.name);
	const [fullTitle, setFullTitle] = useState(book.fullTitle ?? "");
	const [testament, setTestament] = useState(book.testament);
	const [group, setGroup] = useState(book.group ?? bookGroups[0]);
	const [aliases, setAliases] = useState<string[]>(book.aliases);
	const [newAlias, setNewAlias] = useState("");
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: () =>
			updateBookRecord({
				data: {
					slug: book.slug,
					name,
					fullTitle,
					testament,
					group,
					aliases,
				},
			}),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: scriptureDataKeys.all }),
				queryClient.invalidateQueries({ queryKey: auditKeys.all }),
			]);
			toast.success("Book record saved");
		},
		onError: (error) => toast.error(error.message),
	});

	function addAlias() {
		const value = newAlias.trim();
		if (!value) return;
		setAliases((current) =>
			current.some((alias) => alias.toLowerCase() === value.toLowerCase())
				? current
				: [...current, value],
		);
		setNewAlias("");
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		mutation.mutate();
	}

	return (
		<StaffCard>
			<form className="space-y-5" onSubmit={submit}>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor={nameId}>Canonical name</Label>
						<Input
							className="h-11 rounded-[0.625rem]"
							id={nameId}
							onChange={(event) => setName(event.target.value)}
							required
							value={name}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={titleId}>Full title</Label>
						<Input
							className="h-11 rounded-[0.625rem]"
							id={titleId}
							onChange={(event) => setFullTitle(event.target.value)}
							required
							value={fullTitle}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={testamentId}>Testament</Label>
						<NativeSelect
							className="h-11 w-full rounded-[0.625rem]"
							id={testamentId}
							onChange={(event) =>
								setTestament(event.target.value === "new" ? "new" : "old")
							}
							value={testament}
						>
							<NativeSelectOption value="old">Old Testament</NativeSelectOption>
							<NativeSelectOption value="new">New Testament</NativeSelectOption>
						</NativeSelect>
					</div>
					<div className="space-y-2">
						<Label htmlFor={groupId}>Book group</Label>
						<NativeSelect
							className="h-11 w-full rounded-[0.625rem]"
							id={groupId}
							onChange={(event) => {
								const next = bookGroups.find(
									(candidate) => candidate === event.target.value,
								);
								if (next) setGroup(next);
							}}
							value={group}
						>
							{bookGroups.map((value) => (
								<NativeSelectOption key={value} value={value}>
									{value}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor={aliasId}>Aliases and abbreviations</Label>
					<ul className="flex flex-wrap gap-1.5">
						{aliases.map((alias) => (
							<li
								className="inline-flex items-center gap-1 rounded-full bg-status-neutral py-0.5 pr-0.5 pl-2.5 text-sm text-status-neutral-foreground"
								key={alias}
							>
								{alias}
								<button
									aria-label={`Remove ${alias}`}
									className="grid size-7 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() =>
										setAliases((current) =>
											current.filter((value) => value !== alias),
										)
									}
									type="button"
								>
									<XIcon aria-hidden="true" className="size-3.5" />
								</button>
							</li>
						))}
					</ul>
					<div className="flex max-w-md gap-2">
						<Input
							className="h-11 min-w-0 flex-1 rounded-[0.625rem]"
							id={aliasId}
							onChange={(event) => setNewAlias(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									addAlias();
								}
							}}
							placeholder="Add an alias"
							value={newAlias}
						/>
						<StaffButton onClick={addAlias} type="button" variant="outline">
							Add
						</StaffButton>
					</div>
					<p className="text-muted-foreground text-xs">
						Used by search and when typing references, so "Ro 8:28" can find
						Romans 8:28.
					</p>
				</div>

				<CanonPositions canons={book.canons} />

				<StaffButton disabled={mutation.isPending} type="submit">
					Save record
				</StaffButton>
			</form>
		</StaffCard>
	);
}

function BookRecordReadOnly({ book }: { book: Book }) {
	const [suggesting, setSuggesting] = useState(false);
	const [suggestion, setSuggestion] = useState("");
	const mutation = useMutation({
		mutationFn: () =>
			suggestBookChange({ data: { slug: book.slug, suggestion } }),
		onSuccess: () => {
			toast.success("Suggestion sent to the Superadmins");
			setSuggestion("");
			setSuggesting(false);
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<StaffCard>
			<p className="rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground">
				Only a Superadmin can change this. Suggest a change and they'll be told.
			</p>
			<dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
				<ReadOnlyField label="Canonical name" value={book.name} />
				<ReadOnlyField label="Full title" value={book.fullTitle ?? "Not set"} />
				<ReadOnlyField
					label="Testament"
					value={book.testament === "old" ? "Old Testament" : "New Testament"}
				/>
				<ReadOnlyField label="Book group" value={book.group ?? "Not set"} />
				<ReadOnlyField
					label="Aliases and abbreviations"
					value={book.aliases.join(", ") || "None"}
				/>
			</dl>
			<div className="mt-5">
				<CanonPositions canons={book.canons} />
			</div>
			<StaffButton
				className="mt-5"
				onClick={() => setSuggesting(true)}
				variant="outline"
			>
				Suggest change
			</StaffButton>
			<StaffFormDialog
				canSubmit={suggestion.trim().length > 0}
				description={`Tell the Superadmins what should change about ${book.name}.`}
				onOpenChange={setSuggesting}
				onSubmit={() => mutation.mutate()}
				open={suggesting}
				pending={mutation.isPending}
				submitLabel="Send suggestion"
				title="Suggest a change"
			>
				<ReasonField
					label="What should change"
					onChange={setSuggestion}
					value={suggestion}
				/>
			</StaffFormDialog>
		</StaffCard>
	);
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="mt-0.5">{value}</dd>
		</div>
	);
}
