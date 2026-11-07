import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	type BookOverview,
	bookOverviewSchema,
	outlineCoverage,
} from "@berean-study/db/book-overview";
import { contentRevisionStatusLabels } from "@berean-study/db/content-kinds";
import { formatVerseList } from "@berean-study/db/verse-text-tools";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { Textarea } from "@berean-study/ui/components/textarea";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { discardDraft, saveDraft, submitRevision } from "@/functions/content";
import { contentStateQueryOptions } from "@/queries/content";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StatusChip } from "../status-chip";
import { BookOverviewPreview } from "./book-overview-preview";
import { useContentMutation } from "./content-display";

function overviewScope(slug: string) {
	return { kind: "book_overview" as const, scopeKey: slug };
}

export function OverviewStatusChip({ slug }: { slug: string }) {
	const { data } = useSuspenseQuery(
		contentStateQueryOptions(overviewScope(slug)),
	);
	if (data.live) {
		return (
			<StatusChip tone="success">Overview live, #{data.live.number}</StatusChip>
		);
	}
	if (data.open) {
		return (
			<StatusChip tone="info">
				Overview: {contentRevisionStatusLabels[data.open.status]}
			</StatusChip>
		);
	}
	return <StatusChip tone="attention">No overview yet</StatusChip>;
}

export function BookOverviewTab({
	bookName,
	chapterLimit,
	permissionKeys,
	slug,
}: {
	bookName: string;
	chapterLimit: number | null;
	permissionKeys: readonly PermissionKey[];
	slug: string;
}) {
	const { data } = useSuspenseQuery(
		contentStateQueryOptions(overviewScope(slug)),
	);
	const canWrite = data.live
		? permissionKeys.includes("content.revise")
		: permissionKeys.includes("content.write");
	const open = data.open;
	const canOpenRevision = permissionKeys.some((key) =>
		[
			"content.write",
			"content.revise",
			"editorial.check",
			"editorial.review",
			"editorial.assign",
			"publication.publish",
		].includes(key),
	);

	return (
		<div className="space-y-4">
			{open && data.contentItemId && canOpenRevision ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-[0.625rem] bg-status-info p-3 text-sm text-status-info-foreground">
					<p>
						Revision #{open.number} · {contentRevisionStatusLabels[open.status]}{" "}
						· {open.byMe ? "you" : open.authorName}
					</p>
					<Link
						className={staffLinkClassName}
						params={{
							contentId: String(data.contentItemId),
							revisionId: String(open.revisionId),
						}}
						to="/admin/editorial/$contentId/revisions/$revisionId"
					>
						Open revision
					</Link>
				</div>
			) : null}
			{data.live && open ? (
				<p className="text-muted-foreground text-sm" role="status">
					Readers keep seeing Revision #{data.live.number} until this one is
					approved and published.
				</p>
			) : null}
			{data.feedback ? (
				<div
					className="rounded-[0.625rem] bg-status-danger p-3 text-sm text-status-danger-foreground"
					role="status"
				>
					<p className="font-semibold">A reviewer asked for changes</p>
					<p className="mt-1">{data.feedback}</p>
				</div>
			) : null}

			{canWrite && data.canEdit ? (
				<OverviewEditor
					bookName={bookName}
					chapterLimit={chapterLimit}
					initial={data.body}
					revisionId={open?.revisionId ?? null}
					slug={slug}
				/>
			) : (
				<ReadOnlyOverview
					bookName={bookName}
					message={readOnlyMessage(data, canWrite)}
					overview={data.live?.body ?? data.body}
				/>
			)}
		</div>
	);
}

function readOnlyMessage(
	data: {
		live: unknown;
		open: { authorName: string; byMe: boolean; status: string } | null;
	},
	canWrite: boolean,
) {
	if (data.open?.status === "draft" && !data.open.byMe) {
		return `${data.open.authorName} is working on a draft of this.`;
	}
	if (data.open) return "This revision can't change while it's being reviewed.";
	if (!canWrite) return "You don't have permission to write this.";
	return data.live ? null : "No overview has been written yet.";
}

function ReadOnlyOverview({
	bookName,
	message,
	overview,
}: {
	bookName: string;
	message: string | null;
	overview: BookOverview;
}) {
	return (
		<div className="space-y-4">
			{message ? (
				<p className="text-muted-foreground text-sm">{message}</p>
			) : null}
			<BookOverviewPreview bookName={bookName} overview={overview} />
		</div>
	);
}

function OverviewEditor({
	bookName,
	chapterLimit,
	initial,
	revisionId,
	slug,
}: {
	bookName: string;
	chapterLimit: number | null;
	initial: BookOverview;
	revisionId: number | null;
	slug: string;
}) {
	const [overview, setOverview] = useState(initial);
	const [themesText, setThemesText] = useState(initial.keyThemes.join(", "));
	const nextOutlineKey = useRef(initial.outline.length);
	const [outlineKeys, setOutlineKeys] = useState(() =>
		initial.outline.map((_, index) => index),
	);

	const current: BookOverview = {
		...overview,
		keyThemes: themesText
			.split(",")
			.map((theme) => theme.trim())
			.filter(Boolean),
		// A row left blank isn't part of the outline, even while it's on screen.
		outline: overview.outline.filter(
			({ heading, range }) => heading.trim() || range.trim(),
		),
	};
	// The server trims what it saves, so stray spaces alone aren't a change.
	const saved = bookOverviewSchema.safeParse(current);
	const isDirty =
		JSON.stringify(saved.success ? saved.data : current) !==
		JSON.stringify(initial);

	useEffect(() => {
		if (!isDirty) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [isDirty]);

	const save = useContentMutation(
		() => saveDraft({ data: { ...overviewScope(slug), body: current } }),
		() => toast.success("Draft saved."),
	);
	const submit = useContentMutation(
		async () => {
			const { revisionId: saved } = await saveDraft({
				data: { ...overviewScope(slug), body: current },
			});
			await submitRevision({ data: { revisionId: saved } });
		},
		() =>
			toast.success(
				"Sent for review. Nothing changes for readers until it's approved and published.",
			),
	);
	const discard = useContentMutation(
		(id: number) => discardDraft({ data: { revisionId: id } }),
		() => {
			setOverview(initial);
			toast.success("Draft thrown away.");
		},
	);

	function setField<K extends keyof BookOverview>(
		field: K,
		value: BookOverview[K],
	) {
		setOverview((previous) => ({ ...previous, [field]: value }));
	}

	function setOutlineRow(
		index: number,
		change: Partial<BookOverview["outline"][number]>,
	) {
		setField(
			"outline",
			overview.outline.map((row, position) =>
				position === index ? { ...row, ...change } : row,
			),
		);
	}

	const coverage = chapterLimit
		? outlineCoverage(current.outline, chapterLimit)
		: null;
	const busy = save.isPending || submit.isPending || discard.isPending;

	return (
		<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<div className="min-w-0 space-y-4">
				<StaffCard title="Overview">
					<div className="space-y-4">
						<OverviewField
							hint="Shown on the Browse Scripture card."
							label="One-line summary"
							maxLength={300}
							onChange={(value) => setField("summary", value)}
							value={overview.summary}
							wide
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							<OverviewField
								label="Author"
								maxLength={200}
								onChange={(value) => setField("author", value)}
								value={overview.author}
							/>
							<OverviewField
								label="Approximate date"
								maxLength={100}
								onChange={(value) => setField("approximateDate", value)}
								value={overview.approximateDate}
							/>
							<OverviewField
								label="Written from"
								maxLength={200}
								onChange={(value) => setField("writtenFrom", value)}
								value={overview.writtenFrom}
							/>
							<OverviewField
								label="First readers"
								maxLength={200}
								onChange={(value) => setField("firstReaders", value)}
								value={overview.firstReaders}
							/>
							<OverviewField
								label="Key verse"
								maxLength={100}
								onChange={(value) => setField("keyVerse", value)}
								value={overview.keyVerse}
							/>
							<OverviewField
								hint="Separate with commas."
								label="Key themes"
								maxLength={500}
								onChange={setThemesText}
								value={themesText}
							/>
						</div>
					</div>
				</StaffCard>

				<StaffCard title="Outline">
					<ul className="space-y-2">
						{overview.outline.map((row, index) => (
							<li
								className="flex flex-wrap items-center gap-2"
								key={outlineKeys[index]}
							>
								<Input
									aria-label={`Range for outline row ${index + 1}`}
									className="h-11 w-28 rounded-[0.625rem] text-sm"
									maxLength={30}
									onChange={(event) =>
										setOutlineRow(index, { range: event.target.value })
									}
									placeholder="1:1–4:25"
									value={row.range}
								/>
								<Input
									aria-label={`Heading for outline row ${index + 1}`}
									className="h-11 min-w-40 flex-1 rounded-[0.625rem] text-sm"
									maxLength={120}
									onChange={(event) =>
										setOutlineRow(index, { heading: event.target.value })
									}
									placeholder="Heading"
									value={row.heading}
								/>
								<StaffButton
									aria-label={`Remove outline row ${index + 1}`}
									onClick={() => {
										setField(
											"outline",
											overview.outline.filter(
												(_, position) => position !== index,
											),
										);
										setOutlineKeys((keys) =>
											keys.filter((_, position) => position !== index),
										);
									}}
									variant="ghost"
								>
									<XIcon aria-hidden="true" />
								</StaffButton>
							</li>
						))}
					</ul>
					<StaffButton
						className="mt-3 border-dashed"
						onClick={() => {
							setField("outline", [
								...overview.outline,
								{ heading: "", range: "" },
							]);
							setOutlineKeys((keys) => [...keys, nextOutlineKey.current]);
							nextOutlineKey.current += 1;
						}}
						variant="outline"
					>
						+ Add a row
					</StaffButton>

					{coverage &&
					coverage.missingChapters.length +
						coverage.repeatedChapters.length +
						coverage.unreadableRanges.length >
						0 ? (
						<div className="mt-3 space-y-1 rounded-[0.625rem] bg-status-attention p-3 text-sm text-status-attention-foreground">
							{coverage.missingChapters.length > 0 ? (
								<p>
									Chapter {formatVerseList(coverage.missingChapters)} of{" "}
									{bookName} isn't in the outline.
								</p>
							) : null}
							{coverage.repeatedChapters.length > 0 ? (
								<p>
									Chapter {formatVerseList(coverage.repeatedChapters)} appears
									in more than one row.
								</p>
							) : null}
							{coverage.unreadableRanges.length > 0 ? (
								<p>
									Can't read: {coverage.unreadableRanges.join(", ")}. Try
									"1:1–4:25" or "5–8".
								</p>
							) : null}
							<p className="text-xs">These are prompts. They don't stop you.</p>
						</div>
					) : null}
				</StaffCard>

				<div className="flex flex-wrap items-center gap-2">
					<StaffButton
						disabled={busy || !isDirty}
						onClick={() => save.mutate(undefined)}
						variant="outline"
					>
						Save draft
					</StaffButton>
					<StaffButton disabled={busy} onClick={() => submit.mutate(undefined)}>
						Send for review
					</StaffButton>
					{revisionId ? (
						<StaffButton
							disabled={busy}
							onClick={() => discard.mutate(revisionId)}
							variant="ghost"
						>
							Throw away draft
						</StaffButton>
					) : null}
					{isDirty ? (
						<span className="text-muted-foreground text-xs" role="status">
							Unsaved changes
						</span>
					) : null}
				</div>
			</div>

			<aside>
				<BookOverviewPreview bookName={bookName} overview={current} />
			</aside>
		</div>
	);
}

function OverviewField({
	hint,
	label,
	maxLength,
	onChange,
	value,
	wide = false,
}: {
	hint?: string;
	label: string;
	maxLength: number;
	onChange: (value: string) => void;
	value: string;
	wide?: boolean;
}) {
	const id = useId();
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			{wide ? (
				<Textarea
					className="min-h-20 rounded-[0.625rem] text-sm"
					id={id}
					maxLength={maxLength}
					onChange={(event) => onChange(event.target.value)}
					value={value}
				/>
			) : (
				<Input
					className="h-11 rounded-[0.625rem] text-sm"
					id={id}
					maxLength={maxLength}
					onChange={(event) => onChange(event.target.value)}
					value={value}
				/>
			)}
			{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
		</div>
	);
}
