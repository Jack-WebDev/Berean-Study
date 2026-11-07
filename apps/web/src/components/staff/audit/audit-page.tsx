import {
	type AuditDomain,
	auditActionLabels,
	auditDomainLabels,
	auditDomains,
	editorialAuditDomains,
	isAuditAction,
} from "@berean-study/db/audit-catalogue";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@berean-study/ui/components/table";
import { cn } from "@berean-study/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { exportAuditEntries } from "@/functions/audit";
import { formatStaffDateTime } from "@/lib/format";
import { auditEntriesQueryOptions } from "@/queries/audit";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StaffPage } from "../staff-page";
import { StaffPagination } from "../staff-pagination";
import { StatusChip, type StatusTone } from "../status-chip";

export type AuditSearch = {
	domain?: AuditDomain;
	mine?: boolean;
	page?: number;
};

export const domainTones: Record<AuditDomain, StatusTone> = {
	editorial: "attention",
	publication: "success",
	scripture: "info",
	authorization: "authority",
	community: "danger",
	users: "neutral",
};

function downloadCsv(csv: string) {
	const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = "berean-study-audit-log.csv";
	link.click();
	URL.revokeObjectURL(url);
}

function FilterPill({
	active,
	label,
	search,
}: {
	active: boolean;
	label: string;
	search: AuditSearch;
}) {
	return (
		<Link
			activeOptions={{ exact: true, includeSearch: true }}
			className={cn(
				"inline-flex min-h-11 items-center rounded-full border px-4 font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				active
					? "border-primary bg-primary text-primary-foreground"
					: "border-border-strong bg-card hover:bg-muted",
			)}
			search={search}
			to="/admin/audit"
		>
			{label}
		</Link>
	);
}

export function AuditPage({
	canViewAll,
	search,
	viewerId,
}: {
	canViewAll: boolean;
	search: AuditSearch;
	viewerId: string;
}) {
	const page = search.page ?? 1;
	const { data, isError, isPending } = useQuery(
		auditEntriesQueryOptions({
			domain: search.domain,
			mine: search.mine,
			page,
		}),
	);
	const exporting = useMutation({
		mutationFn: () =>
			exportAuditEntries({
				data: { domain: search.domain, mine: search.mine },
			}),
		onSuccess: downloadCsv,
		onError: (error) => toast.error(error.message),
	});

	const domains: readonly AuditDomain[] = canViewAll
		? auditDomains
		: editorialAuditDomains;

	return (
		<StaffPage
			actions={
				<StaffButton
					disabled={exporting.isPending}
					onClick={() => exporting.mutate()}
					variant="outline"
				>
					Export CSV
				</StaffButton>
			}
			description={
				canViewAll
					? "Every significant editorial and administrative action. Entries are append-only: no one, including Superadmins, can edit or delete them. Your own actions are here too."
					: "Editorial and publication activity, plus your own actions. Entries are append-only: no one can edit or delete them."
			}
			section={canViewAll ? "Management" : "Administration"}
			title="Audit log"
		>
			<div className="flex flex-wrap gap-2">
				<FilterPill
					active={!search.domain && !search.mine}
					label="All"
					search={{}}
				/>
				{domains.map((domain) => (
					<FilterPill
						active={search.domain === domain}
						key={domain}
						label={auditDomainLabels[domain]}
						search={{ domain }}
					/>
				))}
				<FilterPill
					active={Boolean(search.mine)}
					label="My actions"
					search={{ mine: true }}
				/>
			</div>

			<StaffCard className="mt-6 p-0 sm:p-0">
				{isPending ? (
					<p className="p-6 text-muted-foreground text-sm">Loading entries…</p>
				) : isError ? (
					<p className="p-6 text-destructive text-sm" role="alert">
						The audit log didn't load. Reload the page to try again.
					</p>
				) : data.entries.length === 0 ? (
					<p className="p-6 text-muted-foreground text-sm">
						Nothing has been recorded here yet.
					</p>
				) : (
					<div className="overflow-x-auto">
						<Table className="min-w-[56rem]">
							<TableHeader>
								<TableRow>
									<TableHead className="pl-5">When</TableHead>
									<TableHead>Actor</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Target</TableHead>
									<TableHead className="pr-5">Area</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.entries.map((entry) => {
									const isMine = entry.actorUserId === viewerId;
									const isRole = entry.targetType === "role";
									const target =
										entry.targetName ??
										entry.details.name ??
										(isRole ? entry.details.role : undefined) ??
										`${entry.targetType} #${entry.targetId}`;
									const detail = [
										isRole ? undefined : entry.details.role,
										entry.details.permission,
										entry.details.rule,
									]
										.filter(Boolean)
										.join(", ");
									const explanation =
										entry.details.reason ?? entry.details.note;
									return (
										<TableRow
											className={cn(isMine && "bg-status-attention/40")}
											key={entry.id}
										>
											<TableCell className="whitespace-nowrap py-3 pl-5 text-muted-foreground text-xs">
												{formatStaffDateTime(entry.occurredAt)}
											</TableCell>
											<TableCell>
												<p className="font-medium text-sm">
													{entry.actorName}
													{isMine ? " (you)" : ""}
												</p>
												{entry.actorRole ? (
													<p className="text-muted-foreground text-xs">
														{entry.actorRole}
													</p>
												) : null}
											</TableCell>
											<TableCell className="whitespace-normal text-sm">
												{isAuditAction(entry.action)
													? auditActionLabels[entry.action]
													: entry.action}
											</TableCell>
											<TableCell className="max-w-72 whitespace-normal text-sm">
												<p>
													{target}
													{detail ? `, ${detail}` : ""}
												</p>
												{explanation ? (
													<p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs">
														{explanation}
													</p>
												) : null}
											</TableCell>
											<TableCell className="pr-5">
												<StatusChip tone={domainTones[entry.domain]}>
													{auditDomainLabels[entry.domain]}
												</StatusChip>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</StaffCard>

			{data ? (
				<StaffPagination
					next={
						<Link
							className={staffLinkClassName}
							search={{ ...search, page: page + 1 }}
							to="/admin/audit"
						>
							Next
						</Link>
					}
					page={page}
					pageSize={data.pageSize}
					previous={
						<Link
							className={staffLinkClassName}
							search={{ ...search, page: page - 1 }}
							to="/admin/audit"
						>
							Previous
						</Link>
					}
					total={data.total}
				/>
			) : null}
		</StaffPage>
	);
}
