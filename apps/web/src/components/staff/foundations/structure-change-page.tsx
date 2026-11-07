import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { formatStaffDate, formatStaffDateTime } from "@/lib/format";
import { structureChangeQueryOptions } from "@/queries/foundations";

import { staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import { StatusChip, type StatusTone } from "../status-chip";
import { ChangeDecisionPanel } from "./change-decision-panel";

const statusDisplay: Record<string, { label: string; tone: StatusTone }> = {
	proposed: { label: "Awaiting a second Superadmin", tone: "info" },
	applied: { label: "Applied", tone: "success" },
	returned: { label: "Sent back with questions", tone: "attention" },
	rejected: { label: "Rejected", tone: "danger" },
};

export function StructureChangePage({ proposalId }: { proposalId: number }) {
	const { data } = useSuspenseQuery(structureChangeQueryOptions(proposalId));

	if (!data) {
		return (
			<div className="px-4 py-16 text-center sm:px-8">
				<h1 className="font-serif text-3xl">We can't find this change</h1>
				<Link className={cn(staffLinkClassName, "mt-6")} to="/admin/canon">
					Back to Canon & Versification
				</Link>
			</div>
		);
	}

	const status = statusDisplay[data.status];

	return (
		<StaffPage
			actions={
				<Link className={staffLinkClassName} to="/admin/canon">
					All changes
				</Link>
			}
			description={`Proposed by ${data.proposedByMe ? "you" : data.proposerName} · ${formatStaffDateTime(data.createdAt)}`}
			section="Scripture structure change"
			title={data.title}
		>
			{status ? (
				<StatusChip tone={status.tone}>{status.label}</StatusChip>
			) : null}

			<div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
				<div className="min-w-0 space-y-4">
					<StaffCard title="The change">
						{data.before && data.after ? (
							<div className="mb-4 grid gap-3 sm:grid-cols-2">
								<div className="rounded-[0.625rem] bg-muted p-3">
									<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
										Before
									</p>
									<p className="mt-1 text-sm">{data.before}</p>
								</div>
								<div className="rounded-[0.625rem] bg-status-success p-3 text-status-success-foreground">
									<p className="font-bold text-[0.6875rem] uppercase tracking-[0.16em]">
										After
									</p>
									<p className="mt-1 text-sm">{data.after}</p>
								</div>
							</div>
						) : null}
						<p className="text-sm">
							<strong>Reason given:</strong> {data.reason}
						</p>
					</StaffCard>

					<StaffCard title="Translations">
						<ul>
							{data.translations.map((row) => (
								<li
									className="flex flex-wrap gap-x-3 border-border-subtle border-b py-2 text-sm last:border-b-0"
									key={row.abbreviation}
								>
									<span className="w-12 font-bold">{row.abbreviation}</span>
									<span className="min-w-0 flex-1">
										{row.previous ? (
											<>
												<del className="text-muted-foreground">
													{row.previous}
												</del>{" "}
												→{" "}
											</>
										) : null}
										{row.label}
									</span>
								</li>
							))}
						</ul>
					</StaffCard>
				</div>

				<aside className="space-y-4">
					<StaffCard title="Automatic checks">
						<ul className="space-y-2">
							{data.checks.map((check) => (
								<li className="flex gap-2 text-sm" key={check.text}>
									<span
										aria-hidden="true"
										className={cn(
											"mt-1.5 size-2.5 shrink-0 rounded-full",
											check.ok ? "bg-progress-published" : "bg-accent",
										)}
									/>
									<span>{check.text}</span>
								</li>
							))}
						</ul>
					</StaffCard>

					<StaffCard title="Decision">
						{data.status === "proposed" ? (
							<ChangeDecisionPanel
								proposalId={data.id}
								proposedByMe={data.proposedByMe}
							/>
						) : (
							<div className="space-y-1 text-sm" role="status">
								<p>
									{status?.label} by {data.deciderName}
									{data.decidedAt
										? ` · ${formatStaffDate(data.decidedAt)}`
										: ""}
								</p>
								{data.decisionNote ? (
									<p className="text-muted-foreground">{data.decisionNote}</p>
								) : null}
								{data.status === "applied" ? (
									<Link
										className="inline-block underline underline-offset-2"
										params={{ bookSlug: data.bookSlug }}
										search={{ chapter: data.chapter }}
										to="/admin/scripture/$bookSlug/chapters"
									>
										View the chapter
									</Link>
								) : null}
							</div>
						)}
						<p className="mt-3 text-muted-foreground text-xs">
							The person who proposed a change can never confirm it. Both names
							are kept in the audit log.
						</p>
					</StaffCard>
				</aside>
			</div>
		</StaffPage>
	);
}
