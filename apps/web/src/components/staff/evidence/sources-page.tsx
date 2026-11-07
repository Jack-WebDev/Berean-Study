import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	claimConfidenceLabels,
	sourceTypeLabels,
} from "@berean-study/db/evidence-body";
import { Input } from "@berean-study/ui/components/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { mergeSources } from "@/functions/evidence";
import {
	evidenceClaimsQueryOptions,
	evidenceSourcesQueryOptions,
} from "@/queries/evidence";

import { useContentMutation } from "../content/content-display";
import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";
import { EvidenceField, RecordStatusChips } from "./evidence-display";

type SourcesTab = "sources" | "claims";

export function SourcesPage({
	permissionKeys,
	search,
	tab,
}: {
	permissionKeys: readonly PermissionKey[];
	search?: string;
	tab: SourcesTab;
}) {
	const navigate = useNavigate({ from: "/work/sources/" });
	const { data: sources } = useSuspenseQuery(
		evidenceSourcesQueryOptions({ includeInactive: true, search }),
	);
	const { data: claims } = useSuspenseQuery(
		evidenceClaimsQueryOptions({ search }),
	);
	const [searchText, setSearchText] = useState(search ?? "");
	const [merging, setMerging] = useState(false);

	const tabs: { count: number; label: string; value: SourcesTab }[] = [
		{ count: sources.length, label: "Sources", value: "sources" },
		{ count: claims.length, label: "Claims", value: "claims" },
	];

	return (
		<StaffPage
			actions={
				<>
					{permissionKeys.includes("sources.merge") ? (
						<StaffButton onClick={() => setMerging(true)} variant="outline">
							Merge duplicates
						</StaffButton>
					) : null}
					<Link
						className={staffLinkClassName}
						search={{ step: "claim" }}
						to="/work/sources/evidence"
					>
						New claim
					</Link>
					<Link
						className={cn(
							staffLinkClassName,
							"bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
						)}
						search={{ step: "source" }}
						to="/work/sources/evidence"
					>
						New source
					</Link>
				</>
			}
			description="The books and articles Berean Study relies on, and the claims that rest on them."
			section="Contributor"
			title="Sources"
		>
			<form
				className="mb-4"
				onSubmit={(event) => {
					event.preventDefault();
					navigate({
						search: (previous) => ({
							...previous,
							q: searchText.trim() || undefined,
						}),
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

			<nav
				aria-label="Evidence lists"
				className="mb-5 flex gap-1 overflow-x-auto border-border border-b"
			>
				{tabs.map(({ count, label, value }) => (
					<Link
						className={cn(
							"-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							value === tab
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
						key={value}
						search={(previous) => ({ ...previous, tab: value })}
						to="/work/sources"
					>
						{label} ({count})
					</Link>
				))}
			</nav>

			{tab === "sources" ? (
				<StaffCard>
					{sources.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{search
								? "No sources match that search."
								: "No sources yet. Add the first one to start the chain."}
						</p>
					) : (
						<ul className="divide-y divide-border-subtle">
							{sources.map((source) => (
								<li
									className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
									key={source.id}
								>
									<div className="min-w-0">
										<p className="flex flex-wrap items-center gap-2 font-semibold">
											{source.title}
											<RecordStatusChips
												latestNumber={source.latestNumber}
												latestStatus={source.latestStatus}
												liveNumber={source.liveNumber}
												sourceStatus={source.status}
											/>
										</p>
										<p className="text-muted-foreground text-sm">
											{[
												source.body.type
													? sourceTypeLabels[source.body.type]
													: null,
												source.body.authors || null,
												source.body.year || null,
												`${source.excerptCount} ${source.excerptCount === 1 ? "excerpt" : "excerpts"}`,
											]
												.filter(Boolean)
												.join(" · ")}
										</p>
									</div>
									<Link
										className={staffLinkClassName}
										search={{ source: source.id, step: "source" }}
										to="/work/sources/evidence"
									>
										Open
									</Link>
								</li>
							))}
						</ul>
					)}
				</StaffCard>
			) : (
				<StaffCard>
					{claims.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							{search ? "No claims match that search." : "No claims yet."}
						</p>
					) : (
						<ul className="divide-y divide-border-subtle">
							{claims.map((claim) => (
								<li
									className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
									key={claim.id}
								>
									<div className="min-w-0">
										<p className="flex flex-wrap items-center gap-2 font-semibold">
											{claim.title}
											<RecordStatusChips
												latestNumber={claim.latestNumber}
												latestStatus={claim.latestStatus}
												liveNumber={claim.liveNumber}
											/>
										</p>
										<p className="text-muted-foreground text-sm">
											{[
												claim.body.passage || null,
												claim.body.confidence
													? claimConfidenceLabels[claim.body.confidence]
													: null,
												`${claim.body.citations.length} ${claim.body.citations.length === 1 ? "citation" : "citations"}`,
											]
												.filter(Boolean)
												.join(" · ")}
										</p>
									</div>
									<Link
										className={staffLinkClassName}
										search={{ claim: claim.id, step: "claim" }}
										to="/work/sources/evidence"
									>
										Open
									</Link>
								</li>
							))}
						</ul>
					)}
				</StaffCard>
			)}

			{merging ? (
				<MergeDialog
					onClose={() => setMerging(false)}
					options={sources.filter(({ status }) => status === "active")}
				/>
			) : null}
		</StaffPage>
	);
}

function MergeDialog({
	onClose,
	options,
}: {
	onClose: () => void;
	options: readonly { id: number; title: string }[];
}) {
	const [keepSourceId, setKeepSourceId] = useState(0);
	const [mergeSourceId, setMergeSourceId] = useState(0);
	const [reason, setReason] = useState("");
	const merge = useContentMutation(
		() => mergeSources({ data: { keepSourceId, mergeSourceId, reason } }),
		() => {
			toast.success("Merged. This is recorded in the audit log.");
			onClose();
		},
	);

	const select = (
		id: string,
		value: number,
		onChange: (value: number) => void,
		exclude: number,
	) => (
		<NativeSelect
			className="h-11 w-full rounded-[0.625rem]"
			id={id}
			onChange={(event) => onChange(Number(event.target.value))}
			value={value}
		>
			<NativeSelectOption value={0}>Choose a source…</NativeSelectOption>
			{options
				.filter((option) => option.id !== exclude)
				.map((option) => (
					<NativeSelectOption key={option.id} value={option.id}>
						{option.title}
					</NativeSelectOption>
				))}
		</NativeSelect>
	);

	return (
		<StaffFormDialog
			canSubmit={
				keepSourceId > 0 && mergeSourceId > 0 && reason.trim().length > 0
			}
			description="Excerpts and research notes move to the source you keep. The duplicate stays on record, pointing to it."
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
			onSubmit={() => merge.mutate(undefined)}
			open
			pending={merge.isPending}
			submitLabel="Merge sources"
			title="Merge duplicate sources"
		>
			<EvidenceField label="Keep this source">
				{(id) => select(id, keepSourceId, setKeepSourceId, mergeSourceId)}
			</EvidenceField>
			<EvidenceField label="Merge this duplicate into it">
				{(id) => select(id, mergeSourceId, setMergeSourceId, keepSourceId)}
			</EvidenceField>
			<ReasonField
				hint="Kept in the audit log."
				onChange={setReason}
				value={reason}
			/>
		</StaffFormDialog>
	);
}
