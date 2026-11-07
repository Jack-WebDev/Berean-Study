import { Input } from "@berean-study/ui/components/input";
import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { proposeCanonOrder, proposeChapterLimits } from "@/functions/canon";

import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField } from "../staff-form-dialog";
import { useFoundationMutation } from "./use-foundation-mutation";

type CanonBook = { chapterLimit: number | null; name: string; slug: string };

function SendForConfirmation({
	canSend,
	children,
	onCancel,
	onSend,
	pending,
	reason,
	setReason,
}: {
	canSend: boolean;
	children: string;
	onCancel: () => void;
	onSend: () => void;
	pending: boolean;
	reason: string;
	setReason: (reason: string) => void;
}) {
	return (
		<div className="mt-5 space-y-3 border-border-subtle border-t pt-5">
			<p className="font-medium text-sm" role="status">
				{children}
			</p>
			<ReasonField
				hint="Shown to the second Superadmin and kept in the audit log."
				onChange={setReason}
				value={reason}
			/>
			<div className="flex flex-wrap gap-2">
				<StaffButton
					disabled={!canSend || !reason.trim() || pending}
					onClick={onSend}
				>
					Send for confirmation
				</StaffButton>
				<StaffButton onClick={onCancel} variant="outline">
					Cancel
				</StaffButton>
			</div>
		</div>
	);
}

/** Moves, adds and removes books as one proposal, so the second person sees the whole change. */
export function CanonOrderEditor({
	books,
	booksOutside,
	canonName,
	canonSlug,
	onClose,
}: {
	books: readonly CanonBook[];
	booksOutside: readonly { name: string; slug: string }[];
	canonName: string;
	canonSlug: string;
	onClose: () => void;
}) {
	const addId = useId();
	const [order, setOrder] = useState(() =>
		books.map(({ name, slug }) => ({ name, slug })),
	);
	const [reason, setReason] = useState("");
	const outside = [
		...booksOutside,
		...books
			.filter(({ slug }) => !order.some((book) => book.slug === slug))
			.map(({ name, slug }) => ({ name, slug })),
	].filter(({ slug }) => !order.some((book) => book.slug === slug));

	const changes =
		order.length !== books.length ||
		order.some(({ slug }, index) => slug !== books[index]?.slug);

	function move(index: number, by: -1 | 1) {
		setOrder((current) => {
			const next = [...current];
			const [book] = next.splice(index, 1);
			if (book) next.splice(index + by, 0, book);
			return next;
		});
	}

	const send = useFoundationMutation(
		() =>
			proposeCanonOrder({
				data: {
					canonSlug,
					order: order.map(({ slug }) => slug),
					reason,
				},
			}),
		() => {
			toast.success(
				"Sent for confirmation. Nothing changes until a second Superadmin confirms.",
			);
			onClose();
		},
	);

	return (
		<StaffCard title={`Edit the ${canonName} book list`}>
			<ol>
				{order.map((book, index) => (
					<li
						className="flex items-center gap-2 border-border-subtle border-b py-1.5 last:border-b-0"
						key={book.slug}
					>
						<span className="w-7 text-right text-muted-foreground text-sm tabular-nums">
							{index + 1}
						</span>
						<span className="min-w-0 flex-1 text-sm">{book.name}</span>
						<StaffButton
							aria-label={`Move ${book.name} up`}
							disabled={index === 0}
							onClick={() => move(index, -1)}
							variant="ghost"
						>
							<ArrowUpIcon aria-hidden="true" />
						</StaffButton>
						<StaffButton
							aria-label={`Move ${book.name} down`}
							disabled={index === order.length - 1}
							onClick={() => move(index, 1)}
							variant="ghost"
						>
							<ArrowDownIcon aria-hidden="true" />
						</StaffButton>
						<StaffButton
							aria-label={`Remove ${book.name}`}
							onClick={() =>
								setOrder((current) =>
									current.filter(({ slug }) => slug !== book.slug),
								)
							}
							variant="ghost"
						>
							<XIcon aria-hidden="true" />
						</StaffButton>
					</li>
				))}
			</ol>

			{outside.length > 0 ? (
				<div className="mt-4 flex flex-wrap items-center gap-2">
					<label className="font-semibold text-sm" htmlFor={addId}>
						Add a book at the end
					</label>
					<select
						className="h-11 rounded-[0.625rem] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						id={addId}
						onChange={(event) => {
							const book = outside.find(
								({ slug }) => slug === event.target.value,
							);
							if (book) setOrder((current) => [...current, book]);
						}}
						value=""
					>
						<option disabled value="">
							Choose a book…
						</option>
						{outside.map(({ name, slug }) => (
							<option key={slug} value={slug}>
								{name}
							</option>
						))}
					</select>
				</div>
			) : null}

			<SendForConfirmation
				canSend={changes && order.length > 0}
				onCancel={onClose}
				onSend={() => send.mutate(undefined)}
				pending={send.isPending}
				reason={reason}
				setReason={setReason}
			>
				{changes
					? `${order.length} books in this list once confirmed.`
					: "Move, add or remove a book to send a change."}
			</SendForConfirmation>
		</StaffCard>
	);
}

/** Sets several limits as one proposal, since a whole canon is usually checked in one sitting. */
export function ChapterLimitsEditor({
	books,
	canonName,
	canonSlug,
	onClose,
}: {
	books: readonly CanonBook[];
	canonName: string;
	canonSlug: string;
	onClose: () => void;
}) {
	const [limits, setLimits] = useState<Record<string, string>>({});
	const [reason, setReason] = useState("");

	const changed = books.flatMap(({ chapterLimit, slug }) => {
		const typed = limits[slug];
		if (typed === undefined || typed.trim() === "") return [];
		const limit = Number(typed);
		return limit === chapterLimit ? [] : [{ bookSlug: slug, limit }];
	});
	const allValid = changed.every(
		({ limit }) => Number.isInteger(limit) && limit > 0 && limit <= 200,
	);

	const send = useFoundationMutation(
		() =>
			proposeChapterLimits({
				data: { canonSlug, limits: changed, reason },
			}),
		() => {
			toast.success(
				"Sent for confirmation. Nothing changes until a second Superadmin confirms.",
			);
			onClose();
		},
	);

	return (
		<StaffCard title={`Set ${canonName} chapter limits`}>
			<p className="mb-4 max-w-[65ch] text-muted-foreground text-sm">
				How many chapters each book has in this canon. Nobody can add a chapter
				past the longest limit any canon allows, and a limit can't drop below
				chapters that already exist.
			</p>
			<ul className="grid gap-x-6 sm:grid-cols-2">
				{books.map((book) => (
					<LimitRow
						book={book}
						key={book.slug}
						onChange={(value) =>
							setLimits((current) => ({ ...current, [book.slug]: value }))
						}
						value={limits[book.slug] ?? book.chapterLimit?.toString() ?? ""}
					/>
				))}
			</ul>

			<SendForConfirmation
				canSend={changed.length > 0 && allValid}
				onCancel={onClose}
				onSend={() => send.mutate(undefined)}
				pending={send.isPending}
				reason={reason}
				setReason={setReason}
			>
				{!allValid
					? "A limit has to be a whole number from 1 to 200."
					: changed.length > 0
						? `${changed.length} ${changed.length === 1 ? "limit" : "limits"} changed.`
						: "Change a number to send it."}
			</SendForConfirmation>
		</StaffCard>
	);
}

function LimitRow({
	book,
	onChange,
	value,
}: {
	book: CanonBook;
	onChange: (value: string) => void;
	value: string;
}) {
	const id = useId();
	return (
		<li className="flex items-center justify-between gap-3 border-border-subtle border-b py-1.5">
			<label className="min-w-0 text-sm" htmlFor={id}>
				{book.name}
			</label>
			<Input
				className="h-11 w-20 rounded-[0.625rem] text-right text-sm"
				id={id}
				inputMode="numeric"
				onChange={(event) => onChange(event.target.value)}
				placeholder="Not set"
				value={value}
			/>
		</li>
	);
}
