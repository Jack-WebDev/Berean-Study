import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { psalmNumberingMap } from "@berean-study/db/scripture-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { formatStaffDate } from "@/lib/format";
import {
	canonOverviewQueryOptions,
	structureChangesQueryOptions,
} from "@/queries/foundations";

import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import { StatusChip } from "../status-chip";
import { CanonOrderEditor, ChapterLimitsEditor } from "./canon-editors";
import { ChangeDecisionPanel } from "./change-decision-panel";

type Overview = NonNullable<
	Awaited<
		ReturnType<
			NonNullable<ReturnType<typeof canonOverviewQueryOptions>["queryFn"]>
		>
	>
>;
type CanonBook = Overview["selected"]["books"][number];
type PendingChange = Overview["pending"][number];

export function CanonPage({
	canon,
	permissionKeys,
}: {
	canon?: string;
	permissionKeys: readonly PermissionKey[];
}) {
	const { data } = useSuspenseQuery(canonOverviewQueryOptions(canon));
	const { data: structureChanges } = useSuspenseQuery(
		structureChangesQueryOptions(),
	);
	const canManageCanon = permissionKeys.includes("canon.manage");

	if (!data) {
		return (
			<StaffPage section="Management" title="Canon & Versification">
				<StaffCard>
					<p className="text-sm" role="alert">
						The canons haven't been set up yet. Run db:scripture:sync.
					</p>
				</StaffCard>
			</StaffPage>
		);
	}

	return (
		<StaffPage
			description="Which books each tradition includes, their order, and how many chapters each has. A mistake here breaks navigation and links for everyone, so every change needs a second Superadmin."
			section="Management · Scripture foundations"
			title="Canon traditions"
		>
			<nav aria-label="Traditions">
				<ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{data.list.map((tradition) => {
						const active = tradition.slug === data.selected.slug;
						return (
							<li key={tradition.slug}>
								<Link
									aria-current={active ? "true" : undefined}
									className={cn(
										"flex h-full flex-col gap-1 rounded-[0.875rem] border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										active
											? "border-accent bg-sidebar-accent"
											: "border-border bg-card hover:bg-muted",
									)}
									search={{ canon: tradition.slug }}
									to="/admin/canon"
								>
									<span className="font-semibold text-sm">
										{tradition.name}
									</span>
									<span className="text-muted-foreground text-xs">
										{tradition.bookCount} books
										{tradition.pendingChanges > 0
											? ` · ${tradition.pendingChanges} waiting`
											: ""}
									</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			{structureChanges.length > 0 ? (
				<StaffCard className="mt-6" title="Structure changes waiting">
					<ul className="divide-y divide-border-subtle">
						{structureChanges.map((change) => (
							<li
								className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
								key={change.id}
							>
								<div className="min-w-0">
									<Link
										className="font-medium text-sm underline-offset-4 hover:underline"
										params={{ proposalId: String(change.id) }}
										to="/admin/scripture/changes/$proposalId"
									>
										{change.description}
									</Link>
									<p className="text-muted-foreground text-xs">
										Proposed {formatStaffDate(change.createdAt)}
									</p>
								</div>
								<StatusChip tone={change.proposedByMe ? "neutral" : "info"}>
									{change.proposedByMe
										? "You proposed this"
										: "Needs your decision"}
								</StatusChip>
							</li>
						))}
					</ul>
				</StaffCard>
			) : null}

			{data.pending.map((change) => (
				<PendingCanonChange
					canDecide={canManageCanon}
					change={change}
					key={change.id}
				/>
			))}

			<CanonBooks
				canManage={canManageCanon}
				// Starting again on each canon, so one canon's unsent edits don't carry over.
				key={data.selected.slug}
				overview={data}
			/>
		</StaffPage>
	);
}

function PendingCanonChange({
	canDecide,
	change,
}: {
	canDecide: boolean;
	change: PendingChange;
}) {
	return (
		<section
			aria-label={change.title}
			className="mt-6 rounded-2xl border border-status-info-foreground/30 bg-status-info/40 p-5 sm:p-6"
		>
			<StatusChip tone="info">Awaiting a second Superadmin</StatusChip>
			<h2 className="mt-2 font-serif text-xl tracking-[-0.01em]">
				{change.description}
			</h2>
			<p className="mt-1 text-muted-foreground text-sm">
				Proposed by {change.proposedByMe ? "you" : change.proposerName} ·{" "}
				{formatStaffDate(change.createdAt)} · {change.reason}
			</p>

			<div className="mt-4">
				{change.change.type === "limits" ? (
					<ul className="grid gap-x-6 sm:grid-cols-2">
						{change.change.rows.map(({ from, name, to }) => (
							<li
								className="flex justify-between gap-3 border-border-subtle border-b py-1.5 text-sm"
								key={name}
							>
								<span>{name}</span>
								<span>
									<del className="text-muted-foreground">
										{from ?? "Not set"}
									</del>{" "}
									→ <strong>{to}</strong>
								</span>
							</li>
						))}
					</ul>
				) : (
					<div className="space-y-2 text-sm">
						<p className="text-muted-foreground">
							{change.change.size.before} books → {change.change.size.after}{" "}
							books
						</p>
						{change.change.added.length > 0 ? (
							<p>
								<strong>Added:</strong> {change.change.added.join(", ")}
							</p>
						) : null}
						{change.change.removed.length > 0 ? (
							<p>
								<strong>Removed:</strong> {change.change.removed.join(", ")}
							</p>
						) : null}
						{change.change.moved.length > 0 ? (
							<ul className="grid gap-x-6 sm:grid-cols-2">
								{change.change.moved.map(({ from, name, to }) => (
									<li
										className="flex justify-between gap-3 border-border-subtle border-b py-1.5"
										key={name}
									>
										<span>{name}</span>
										<span>
											<del className="text-muted-foreground">{from}</del> →{" "}
											<strong>{to}</strong>
										</span>
									</li>
								))}
							</ul>
						) : null}
					</div>
				)}
			</div>

			<div className="mt-4">
				{canDecide ? (
					<ChangeDecisionPanel
						confirmLabel="Confirm change"
						proposalId={change.id}
						proposedByMe={change.proposedByMe}
					/>
				) : null}
			</div>
		</section>
	);
}

function CanonBooks({
	canManage,
	overview,
}: {
	canManage: boolean;
	overview: Overview;
}) {
	const [editing, setEditing] = useState<"limits" | "order" | null>(null);
	const { books, name, slug } = overview.selected;
	const close = () => setEditing(null);

	if (editing === "order") {
		return (
			<div className="mt-6">
				<CanonOrderEditor
					books={books}
					booksOutside={overview.booksOutside}
					canonName={name}
					canonSlug={slug}
					onClose={close}
				/>
			</div>
		);
	}
	if (editing === "limits") {
		return (
			<div className="mt-6">
				<ChapterLimitsEditor
					books={books}
					canonName={name}
					canonSlug={slug}
					onClose={close}
				/>
			</div>
		);
	}

	const oldTestament = books.filter(({ testament }) => testament === "old");
	const newTestament = books.filter(({ testament }) => testament === "new");
	const unset = books.filter(({ chapterLimit }) => chapterLimit === null);

	return (
		<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<div className="min-w-0 space-y-6">
				{canManage ? (
					<div className="flex flex-wrap gap-2">
						<StaffButton onClick={() => setEditing("order")} variant="outline">
							Edit order
						</StaffButton>
						{books.length > 0 ? (
							<StaffButton
								onClick={() => setEditing("limits")}
								variant="outline"
							>
								Set chapter limits
							</StaffButton>
						) : null}
					</div>
				) : null}

				{unset.length > 0 ? (
					<p className="rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
						{unset.length} {unset.length === 1 ? "book has" : "books have"} no
						chapter limit in this canon yet.
					</p>
				) : null}

				{books.length === 0 ? (
					<StaffCard title={`No books in the ${name} canon yet`}>
						<p className="max-w-[65ch] text-muted-foreground text-sm">
							Its book list hasn't been settled, so it was left empty rather
							than guessed. Use Edit order to add books once it is.
						</p>
					</StaffCard>
				) : null}

				<BookList books={oldTestament} title="Old Testament" />
				<BookList books={newTestament} title="New Testament" />
			</div>

			<aside className="space-y-4">
				<StaffCard title="Psalm numbering">
					<p className="text-muted-foreground text-sm">
						The Hebrew text numbers Psalms differently from the Greek and Latin.
						This is for reference: readers and references don't use it yet.
					</p>
					<table className="mt-3 w-full text-sm">
						<thead>
							<tr className="text-left text-muted-foreground text-xs">
								<th className="py-1 font-medium" scope="col">
									Hebrew
								</th>
								<th className="py-1 font-medium" scope="col">
									Greek
								</th>
							</tr>
						</thead>
						<tbody>
							{psalmNumberingMap.map(({ greek, hebrew }) => (
								<tr className="border-border-subtle border-t" key={hebrew}>
									<td className="py-1.5 tabular-nums">{hebrew}</td>
									<td className="py-1.5 tabular-nums">{greek}</td>
								</tr>
							))}
						</tbody>
					</table>
				</StaffCard>
				<StaffCard>
					<h2 className="font-semibold text-sm">Why changes need two people</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						A wrong position or limit isn't a bad paragraph. It affects
						navigation, references and commentary links for everyone using this
						tradition.
					</p>
				</StaffCard>
			</aside>
		</div>
	);
}

function BookList({
	books,
	title,
}: {
	books: readonly CanonBook[];
	title: string;
}) {
	if (books.length === 0) return null;
	return (
		<StaffCard title={`${title} · ${books.length} books`}>
			<ol className="grid gap-x-6 sm:grid-cols-2">
				{books.map((book) => (
					<li
						className="flex items-center gap-2.5 border-border-subtle border-b py-2 text-sm"
						key={book.slug}
					>
						<span className="w-6 text-right text-muted-foreground tabular-nums">
							{book.position}
						</span>
						<span className="min-w-0 flex-1">
							{book.name}
							{book.deuterocanonical ? (
								<span
									className="ml-1.5 inline-block size-1.5 rounded-full bg-accent align-middle"
									title="Deuterocanonical"
								>
									<span className="sr-only">Deuterocanonical</span>
								</span>
							) : null}
						</span>
						<span
							className={cn(
								"shrink-0 text-xs tabular-nums",
								book.chapterLimit === null
									? "text-status-attention-foreground"
									: "text-muted-foreground",
							)}
						>
							{book.chapterLimit === null
								? "Not set"
								: `${book.chapterLimit} ch`}
						</span>
					</li>
				))}
			</ol>
		</StaffCard>
	);
}
