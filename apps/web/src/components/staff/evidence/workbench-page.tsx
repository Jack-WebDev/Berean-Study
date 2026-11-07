import type { PermissionKey } from "@berean-study/db/access-catalogue";
import {
	citationStrengthLabels,
	emptyClaimBody,
	emptyExcerptBody,
	excerptFormLabels,
} from "@berean-study/db/evidence-body";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { evidenceWorkbenchQueryOptions } from "@/queries/evidence";

import { staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import { CitationStep } from "./citation-step";
import { ClaimStep } from "./claim-step";
import {
	EvidenceField,
	type EvidenceStep,
	evidenceSteps,
	UsedInCard,
} from "./evidence-display";
import { ExcerptStep } from "./excerpt-step";
import { RetireSourcePanel } from "./retire-source-panel";
import { SourceStep } from "./source-step";

const stepNames: Record<EvidenceStep, string> = {
	source: "1 · Source",
	excerpt: "2 · Excerpt",
	citation: "3 · Citation",
	claim: "4 · Claim",
};

const roleNotes: { label: string; note: string; permission: PermissionKey }[] =
	[
		{
			label: "You can retire sources",
			note: "Every place that uses a source is listed for review first. One already in use needs a second Superadmin.",
			permission: "sources.retire",
		},
		{
			label: "You can merge sources",
			note: "Merge duplicates from the Sources list.",
			permission: "sources.merge",
		},
	];

export function WorkbenchPage({
	claimId,
	excerptId,
	passage,
	permissionKeys,
	sourceId,
	step,
}: {
	claimId?: number;
	excerptId?: number;
	/** Fills in a new record's passage, from "Start from a passage" on New content. */
	passage?: string;
	permissionKeys: readonly PermissionKey[];
	sourceId?: number;
	step: EvidenceStep;
}) {
	const navigate = useNavigate({ from: "/work/sources/evidence" });
	const { data } = useSuspenseQuery(
		evidenceWorkbenchQueryOptions({ claimId, excerptId, sourceId }),
	);
	const { claim, excerpt, source } = data;
	const pick = (
		change: Partial<{
			claim: number | undefined;
			excerpt: number | undefined;
			source: number | undefined;
			step: EvidenceStep;
		}>,
	) =>
		navigate({
			search: (previous) => ({ ...previous, ...change }),
			replace: true,
		});

	const summaries: Record<EvidenceStep, { label: string; meta: string }> = {
		source: source
			? {
					label: source.state.title,
					meta:
						source.state.body.year ||
						source.state.body.authors ||
						"Details to add",
				}
			: { label: "Not chosen", meta: "Start here" },
		excerpt: excerpt
			? {
					label: excerpt.state.body.location || "Untitled excerpt",
					meta: excerptFormLabels[excerpt.state.body.form],
				}
			: { label: "Not chosen", meta: "A part of the source" },
		citation: claim?.citations[0]
			? {
					label: "Points to the excerpt",
					meta:
						claim.citations.length === 1
							? citationStrengthLabels[claim.citations[0].strength]
							: `${claim.citations.length} citations`,
				}
			: { label: "None yet", meta: "Checked with the claim" },
		claim: claim
			? {
					label: claim.state.title,
					meta: `${claim.citations.length} ${claim.citations.length === 1 ? "citation" : "citations"}`,
				}
			: { label: "Not chosen", meta: "What we say is true" },
	};

	const notes = roleNotes.filter(({ permission }) =>
		permissionKeys.includes(permission),
	);

	return (
		<StaffPage
			actions={
				<Link className={staffLinkClassName} to="/work/sources">
					All sources
				</Link>
			}
			description="A source holds excerpts. A citation points from a claim to an excerpt, and is checked along with that claim. Pick a link in the chain to edit it."
			section="Evidence workbench"
			title="Every claim traces back to a source"
		>
			<nav
				aria-label="Evidence chain"
				className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
			>
				{evidenceSteps.map((value) => (
					<button
						aria-current={value === step ? "step" : undefined}
						className={cn(
							"flex min-h-24 min-w-0 flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							value === step
								? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
								: "border-border bg-card hover:bg-muted",
						)}
						key={value}
						onClick={() => pick({ step: value })}
						type="button"
					>
						<span className="font-bold text-[0.6875rem] uppercase tracking-[0.16em] opacity-80">
							{stepNames[value]}
						</span>
						<span className="line-clamp-2 font-semibold text-sm">
							{summaries[value].label}
						</span>
						<span className="text-xs opacity-80">{summaries[value].meta}</span>
					</button>
				))}
			</nav>

			<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
				<div className="min-w-0">
					{/* Steps stay mounted, so moving along the chain doesn't lose unsaved typing. */}
					<div hidden={step !== "source"}>
						<div className="mb-4">
							<SourcePicker
								label="Open a source"
								onChange={(id) =>
									pick({ excerpt: undefined, source: id ?? undefined })
								}
								options={
									// A retired or merged source isn't offered, but can still be the one open.
									source && source.status !== "active"
										? [
												{ id: source.id, title: source.state.title },
												...data.sourceOptions,
											]
										: data.sourceOptions
								}
								value={source?.id ?? null}
							/>
						</div>
						<SourceStep
							initial={source?.state.body ?? null}
							key={`source-${source?.id ?? "new"}-${source?.state.open?.revisionId ?? "none"}`}
							onDiscarded={(removed) => {
								if (removed) pick({ excerpt: undefined, source: undefined });
							}}
							onSaved={(id) => pick({ source: id })}
							permissionKeys={permissionKeys}
							sourceId={source?.id}
							sourceStatus={source?.status}
							state={source?.state ?? null}
						/>
					</div>

					<div hidden={step !== "excerpt"}>
						{source ? (
							<>
								<div className="mb-4">
									<EvidenceField label="Open an excerpt of this source">
										{(id) => (
											<NativeSelect
												className="h-11 w-full rounded-[0.625rem]"
												id={id}
												onChange={(event) =>
													pick({
														excerpt: Number(event.target.value) || undefined,
													})
												}
												value={excerpt?.id ?? ""}
											>
												<NativeSelectOption value="">
													New excerpt
												</NativeSelectOption>
												{data.excerptOptions
													.filter((option) => option.sourceId === source.id)
													.map((option) => (
														<NativeSelectOption
															key={option.id}
															value={option.id}
														>
															{option.body.location || "Untitled excerpt"}
														</NativeSelectOption>
													))}
											</NativeSelect>
										)}
									</EvidenceField>
								</div>
								<ExcerptStep
									excerptId={excerpt?.id}
									initial={
										excerpt?.state.body ??
										(passage
											? { ...emptyExcerptBody, passages: [passage] }
											: null)
									}
									key={`excerpt-${source.id}-${excerpt?.id ?? "new"}-${excerpt?.state.open?.revisionId ?? "none"}`}
									onDiscarded={(removed) => {
										if (removed) pick({ excerpt: undefined });
									}}
									onSaved={(id) => pick({ excerpt: id })}
									permissionKeys={permissionKeys}
									sourceId={source.id}
									sourceName={source.state.title}
									sourceUsable={source.status === "active"}
									state={excerpt?.state ?? null}
								/>
							</>
						) : (
							<StaffCard title="Source excerpt">
								<p className="mb-4 text-muted-foreground text-sm">
									An excerpt belongs to a source. Choose one first, or add one
									at the Source step.
								</p>
								<SourcePicker
									label="Source"
									onChange={(id) => pick({ source: id ?? undefined })}
									options={data.sourceOptions}
									value={null}
								/>
							</StaffCard>
						)}
					</div>

					<div hidden={step !== "citation"}>
						<CitationStep
							claim={
								claim
									? {
											body: claim.state.body,
											canEdit: claim.state.canEdit,
											citations: claim.citations,
											id: claim.id,
											title: claim.state.title,
										}
									: null
							}
							claimOptions={data.claimOptions}
							excerptOptions={data.excerptOptions}
							key={`citation-${claim?.id ?? "none"}-${excerpt?.id ?? "none"}`}
							onChooseClaim={(id) => pick({ claim: id ?? undefined })}
							preferredExcerptId={excerpt?.id}
						/>
					</div>

					<div hidden={step !== "claim"}>
						<div className="mb-4">
							<EvidenceField label="Open a claim">
								{(id) => (
									<NativeSelect
										className="h-11 w-full rounded-[0.625rem]"
										id={id}
										onChange={(event) =>
											pick({ claim: Number(event.target.value) || undefined })
										}
										value={claim?.id ?? ""}
									>
										<NativeSelectOption value="">New claim</NativeSelectOption>
										{data.claimOptions.map((option) => (
											<NativeSelectOption key={option.id} value={option.id}>
												{option.title}
											</NativeSelectOption>
										))}
									</NativeSelect>
								)}
							</EvidenceField>
						</div>
						<ClaimStep
							citations={claim?.citations ?? []}
							claimId={claim?.id}
							initial={
								claim?.state.body ??
								(passage ? { ...emptyClaimBody, passage } : null)
							}
							key={`claim-${claim?.id ?? "new"}-${claim?.state.open?.revisionId ?? "none"}`}
							onAddCitation={() => pick({ step: "citation" })}
							onDiscarded={(removed) => {
								if (removed) pick({ claim: undefined });
							}}
							onSaved={(id) => pick({ claim: id })}
							permissionKeys={permissionKeys}
							state={claim?.state ?? null}
						/>
					</div>
				</div>

				<aside className="space-y-4">
					{step === "source" && source ? (
						<UsedInCard rows={source.usedIn} />
					) : null}
					{step === "excerpt" && excerpt ? (
						<UsedInCard rows={excerpt.usedIn} />
					) : null}
					{(step === "claim" || step === "citation") && claim ? (
						<UsedInCard rows={claim.usedIn} />
					) : null}
					{step === "source" &&
					source?.status === "active" &&
					source.state.contentItemId &&
					permissionKeys.includes("sources.retire") ? (
						<RetireSourcePanel
							pending={source.pendingRetirement}
							sourceId={source.id}
							usedIn={source.usedIn}
						/>
					) : null}
					<StaffCard title="What happens next">
						<p className="text-muted-foreground text-sm">
							Someone else reviews each source, excerpt and claim, then an Admin
							publishes it, in that order: a claim can't go live before what it
							rests on. Drafts can use anything while you work.
						</p>
						{notes.map(({ label, note }) => (
							<p className="mt-3 text-sm" key={label}>
								<span className="font-semibold">{label}. </span>
								<span className="text-muted-foreground">{note}</span>
							</p>
						))}
					</StaffCard>
				</aside>
			</div>
		</StaffPage>
	);
}

function SourcePicker({
	label,
	onChange,
	options,
	value,
}: {
	label: string;
	onChange: (id: number | null) => void;
	options: readonly { id: number; title: string }[];
	value: number | null;
}) {
	return (
		<EvidenceField label={label}>
			{(id) => (
				<NativeSelect
					className="h-11 w-full rounded-[0.625rem]"
					id={id}
					onChange={(event) => onChange(Number(event.target.value) || null)}
					value={value ?? ""}
				>
					<NativeSelectOption value="">
						{label === "Source" ? "Choose a source…" : "New source"}
					</NativeSelectOption>
					{options.map((option) => (
						<NativeSelectOption key={option.id} value={option.id}>
							{option.title}
						</NativeSelectOption>
					))}
				</NativeSelect>
			)}
		</EvidenceField>
	);
}
