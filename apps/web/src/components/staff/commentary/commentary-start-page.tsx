import {
	type CommentaryKind,
	commentaryKindLabels,
	commentaryKinds,
} from "@berean-study/db/commentary-body";
import { Input } from "@berean-study/ui/components/input";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { resolveCommentaryScope } from "@/functions/commentary";
import { commentaryListQueryOptions } from "@/queries/commentary";

import {
	EvidenceField,
	evidenceInputClassName,
	OptionPills,
	RecordStatusChips,
} from "../evidence/evidence-display";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";

const kindOptions = commentaryKinds.map((value) => ({
	label: commentaryKindLabels[value],
	value,
}));

/** Choose what a new commentary covers, or find one that exists. */
export function CommentaryStartPage({
	initialKind,
	initialPassage,
	search,
}: {
	initialKind: CommentaryKind;
	initialPassage: string;
	search?: string;
}) {
	const navigate = useNavigate({ from: "/work/commentary" });
	const { data: existing } = useSuspenseQuery(
		commentaryListQueryOptions({ search }),
	);
	const [kind, setKind] = useState(initialKind);
	const [from, setFrom] = useState(initialPassage);
	const [to, setTo] = useState("");
	const [searchText, setSearchText] = useState(search ?? "");

	const start = useMutation({
		mutationFn: () =>
			resolveCommentaryScope({
				data: {
					from,
					kind,
					to: kind === "passage_commentary" ? to : undefined,
				},
			}),
		onSuccess: ({ kind: resolvedKind, scopeKey }) =>
			navigate({ search: { kind: resolvedKind, scope: scopeKey } }),
	});

	const fromLabel =
		kind === "book_introduction"
			? "Book"
			: kind === "verse_commentary"
				? "Verse"
				: "From";

	return (
		<StaffPage
			description="Whatever you write is saved as a draft and reaches readers only after review. Choosing the same verses as an existing commentary opens that one."
			section="Commentary"
			title="Write commentary"
		>
			<StaffCard>
				<form
					className="space-y-5"
					onSubmit={(event) => {
						event.preventDefault();
						start.mutate();
					}}
				>
					<OptionPills
						label="Commentary type"
						onChange={(value) => {
							start.reset();
							setKind(value);
						}}
						options={kindOptions}
						value={kind}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<EvidenceField label={fromLabel}>
							{(id) => (
								<Input
									className={evidenceInputClassName}
									id={id}
									maxLength={100}
									onChange={(event) => {
										start.reset();
										setFrom(event.target.value);
									}}
									placeholder={
										kind === "book_introduction"
											? "Romans"
											: kind === "verse_commentary"
												? "Romans 8:28"
												: "Romans 8:18"
									}
									required
									value={from}
								/>
							)}
						</EvidenceField>
						{kind === "passage_commentary" ? (
							<EvidenceField label="To">
								{(id) => (
									<Input
										className={evidenceInputClassName}
										id={id}
										maxLength={100}
										onChange={(event) => {
											start.reset();
											setTo(event.target.value);
										}}
										placeholder="Romans 8:30"
										required
										value={to}
									/>
								)}
							</EvidenceField>
						) : null}
					</div>
					{start.error ? (
						<p className="text-sm text-status-danger-foreground" role="alert">
							{start.error.message}
						</p>
					) : null}
					<StaffButton disabled={start.isPending} type="submit">
						Open editor
					</StaffButton>
				</form>
			</StaffCard>

			<StaffCard className="mt-6" title="Existing commentary">
				<form
					className="mb-4"
					onSubmit={(event) => {
						event.preventDefault();
						navigate({
							search: { q: searchText.trim() || undefined },
						});
					}}
				>
					<EvidenceField label="Search">
						{(id) => (
							<Input
								className="h-11 max-w-md rounded-[0.625rem] text-sm"
								id={id}
								maxLength={200}
								onChange={(event) => setSearchText(event.target.value)}
								placeholder="Press Enter to search"
								type="search"
								value={searchText}
							/>
						)}
					</EvidenceField>
				</form>
				{existing.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{search
							? "No commentary matches that search."
							: "No commentary has been started yet."}
					</p>
				) : (
					<ul className="divide-y divide-border-subtle">
						{existing.map((item) => (
							<li
								className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
								key={item.contentItemId}
							>
								<div className="min-w-0">
									<p className="flex flex-wrap items-center gap-2 font-semibold">
										{item.title}
										<RecordStatusChips
											latestNumber={item.latestNumber}
											latestStatus={item.latestStatus}
											liveNumber={item.liveNumber}
										/>
									</p>
									<p className="text-muted-foreground text-sm">
										{commentaryKindLabels[item.kind]}
									</p>
								</div>
								<Link
									className={staffLinkClassName}
									search={{ kind: item.kind, scope: item.scopeKey }}
									to="/work/commentary"
								>
									Open
								</Link>
							</li>
						))}
					</ul>
				)}
			</StaffCard>
		</StaffPage>
	);
}
