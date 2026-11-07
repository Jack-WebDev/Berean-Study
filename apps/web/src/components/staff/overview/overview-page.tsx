import type {
	OverviewFoundationItem,
	OverviewSeverity,
} from "@berean-study/db/admin-overview";
import { auditDomainLabels } from "@berean-study/db/audit-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { getInitials } from "@/lib/format";
import { adminOverviewQueryOptions } from "@/queries/staff-queues";
import { formatTimeAgo } from "@/utils/dates";

import { domainTones } from "../audit/audit-page";
import { staffLinkClassName, staffPrimaryLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import { StatusChip, type StatusTone } from "../status-chip";

const severities: Record<
	OverviewSeverity,
	{ label: string; tone: StatusTone }
> = {
	high: { label: "High priority", tone: "danger" },
	community: { label: "Community", tone: "attention" },
	ready: { label: "Ready", tone: "success" },
	authorization: { label: "Authorization", tone: "info" },
	scripture: { label: "Scripture data", tone: "info" },
};

const foundationChips: Record<
	OverviewFoundationItem["status"],
	{ label: string; tone: StatusTone }
> = {
	applied: { label: "Applied", tone: "success" },
	confirm: { label: "Confirm", tone: "info" },
	decide: { label: "Decide", tone: "attention" },
	waiting: { label: "Yours, awaiting a second person", tone: "neutral" },
};

const pipelineTones: Record<string, string> = {
	attention: "bg-status-attention text-status-attention-foreground",
	neutral: "bg-status-neutral text-status-neutral-foreground",
	plain: "bg-muted text-foreground",
	success: "bg-status-success text-status-success-foreground",
};

const eyebrow =
	"font-bold text-[0.6875rem] uppercase tracking-[0.14em] text-muted-foreground";

/**
 * The oversight page. It says where attention is needed and how work is moving,
 * and deliberately has no system health or engagement figures.
 */
export function OverviewPage() {
	const { data: overview } = useSuspenseQuery(adminOverviewQueryOptions());

	return (
		<StaffPage
			actions={
				<>
					{overview.canOpenAudit ? (
						<Link className={staffLinkClassName} to="/admin/audit">
							Audit log
						</Link>
					) : null}
					{overview.canOpenEditorial ? (
						<Link className={staffPrimaryLinkClassName} to="/admin/editorial">
							Open editorial queue
						</Link>
					) : null}
				</>
			}
			description="What is happening across Berean Study that may need your attention. Your Home page stays your reading space; oversight lives here."
			section="Administration"
			title="Overview"
		>
			<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{overview.tiles.map((tile) => (
					<li key={tile.key}>
						<Link
							className="block h-full rounded-2xl border border-border bg-card p-5 transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							to={tile.href as never}
						>
							<p className={eyebrow}>{tile.domain}</p>
							<p className="mt-2 font-serif text-4xl tabular-nums">
								{tile.value}
							</p>
							<p className="mt-1 font-semibold text-sm">{tile.label}</p>
							<p className="mt-0.5 text-muted-foreground text-xs">
								{tile.note}
							</p>
						</Link>
					</li>
				))}
			</ul>

			<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
				<div className="grid min-w-0 gap-6">
					<StaffCard
						actions={
							overview.attention.length > 0 ? (
								<StatusChip tone="neutral">
									{overview.attention.length}{" "}
									{overview.attention.length === 1 ? "item" : "items"}
								</StatusChip>
							) : null
						}
						title="Needs attention"
					>
						{overview.attention.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								Nothing needs you right now.
							</p>
						) : (
							<ul className="divide-y divide-border-subtle">
								{overview.attention.map((item) => {
									const severity = severities[item.severity];
									return (
										<li
											className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
											key={item.key}
										>
											<div className="min-w-0 flex-1 basis-64">
												<StatusChip tone={severity.tone}>
													{severity.label}
												</StatusChip>
												<p className="mt-1.5 font-medium text-sm">
													{item.title}
												</p>
												<p className="mt-0.5 line-clamp-3 text-muted-foreground text-xs">
													{item.detail}
												</p>
											</div>
											<Link
												className={staffLinkClassName}
												to={item.href as never}
											>
												{item.action}
											</Link>
										</li>
									);
								})}
							</ul>
						)}
					</StaffCard>

					{overview.pipeline ? (
						<StaffCard title="Publishing pipeline">
							<ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{overview.pipeline.map((stage) => (
									<li
										className={cn(
											"flex flex-col gap-1 rounded-xl p-3.5",
											pipelineTones[stage.tone],
										)}
										key={stage.label}
									>
										<span className="font-semibold text-xs">{stage.label}</span>
										<span className="font-serif text-2xl tabular-nums">
											{stage.count}
										</span>
										<span className="text-xs opacity-80">{stage.note}</span>
									</li>
								))}
							</ol>
							<p className="mt-3 text-muted-foreground text-xs">
								Research, then verification, writing, editorial review and
								publication. Everyone's work passes through review, including
								yours.
							</p>
						</StaffCard>
					) : null}
				</div>

				<div className="grid min-w-0 gap-6">
					{overview.foundations ? (
						<StaffCard title="Foundations & authority">
							<p className="text-muted-foreground text-xs">
								Changes that alter how Berean Study understands Scripture or who
								can do what. These need a second Superadmin before they take
								effect.
							</p>
							{overview.foundations.length === 0 ? (
								<p className="mt-3 text-muted-foreground text-sm">
									Nothing is waiting, and nothing has been applied yet.
								</p>
							) : (
								<ul className="mt-3 divide-y divide-border-subtle">
									{overview.foundations.map((item) => {
										const chip = foundationChips[item.status];
										const body = (
											<>
												<span className="min-w-0 flex-1 basis-40">
													<span className="block font-medium text-sm">
														{item.title}
													</span>
													<span className="mt-0.5 line-clamp-2 block text-muted-foreground text-xs">
														{item.detail}
													</span>
												</span>
												<StatusChip tone={chip.tone}>{chip.label}</StatusChip>
											</>
										);
										return (
											<li key={item.key}>
												{item.href ? (
													<Link
														className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-md py-3 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
														to={item.href as never}
													>
														{body}
													</Link>
												) : (
													<div className="flex flex-wrap items-center justify-between gap-2 py-3">
														{body}
													</div>
												)}
											</li>
										);
									})}
								</ul>
							)}
						</StaffCard>
					) : null}

					{overview.activity ? (
						<StaffCard
							actions={
								<Link
									className="inline-flex min-h-11 items-center text-muted-foreground text-sm underline-offset-2 hover:underline"
									to="/admin/audit"
								>
									Full audit log
								</Link>
							}
							title="Recent activity"
						>
							{overview.activity.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									Nothing has been recorded yet.
								</p>
							) : (
								<ul className="grid gap-3">
									{overview.activity.map((entry) => (
										<li className="flex items-start gap-3" key={entry.id}>
											<span
												aria-hidden="true"
												className="grid size-8 shrink-0 place-items-center rounded-full bg-muted font-semibold text-xs"
											>
												{getInitials(entry.actorName)}
											</span>
											<span className="min-w-0 flex-1">
												<span className="block text-sm">
													{entry.text}
													{entry.target ? `: ${entry.target}` : ""}
												</span>
												<span className="mt-0.5 block text-muted-foreground text-xs">
													{entry.actorName} · {formatTimeAgo(entry.occurredAt)}
												</span>
											</span>
											<StatusChip tone={domainTones[entry.domain]}>
												{auditDomainLabels[entry.domain]}
											</StatusChip>
										</li>
									))}
								</ul>
							)}
						</StaffCard>
					) : null}
				</div>
			</div>
		</StaffPage>
	);
}
