import {
	type PermissionKey,
	permissionCatalogue,
} from "@berean-study/db/access-catalogue";
import {
	auditActionLabels,
	isAuditAction,
} from "@berean-study/db/audit-catalogue";
import { cn } from "@berean-study/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LockIcon } from "lucide-react";
import { useState } from "react";

import {
	formatStaffDate,
	formatStaffDateTime,
	getInitials,
} from "@/lib/format";
import { personProfileQueryOptions } from "@/queries/people";

import { StaffButton, staffLinkClassName } from "../staff-button";
import { StaffCard } from "../staff-card";
import { StatusChip, type StatusTone } from "../status-chip";
import { AccountStatusChip } from "./person-chips";
import {
	AccessCaseDialog,
	accessCaseGrounds,
	accessCaseScopes,
	ChangeRolesDialog,
	DecisionDialog,
	LiftSuspensionDialog,
	SuspendDialog,
} from "./person-dialogs";

type Viewer = {
	id: string;
	permissionKeys: readonly PermissionKey[];
};

type OpenDialog =
	| { name: "roles" | "suspend" | "lift" | "case" }
	| {
			name: "decide";
			decision: "confirm" | "reject";
			description: string;
			proposalId: number;
	  }
	| null;

const permissionNames = new Map<string, string>(
	permissionCatalogue.map(({ key, name }) => [key, name]),
);

function PersonNotFound() {
	return (
		<div className="px-4 py-16 text-center sm:px-8">
			<h1 className="font-serif text-3xl">We can't find this person</h1>
			<p className="mt-2 text-muted-foreground">
				They may have deleted their account.
			</p>
			<Link className={cn(staffLinkClassName, "mt-6")} to="/admin/contributors">
				Back to people
			</Link>
		</div>
	);
}

export function PersonProfilePage({
	userId,
	viewer,
}: {
	userId: string;
	viewer: Viewer;
}) {
	const { data: profile } = useSuspenseQuery(personProfileQueryOptions(userId));
	const [dialog, setDialog] = useState<OpenDialog>(null);

	if (!profile) return <PersonNotFound />;

	const { person } = profile;
	const canManageAdmins = viewer.permissionKeys.includes("admins.manage");
	const isSelf = viewer.id === person.id;
	const isDeleted = person.status === "deleted";
	const closeDialog = (open: boolean) => {
		if (!open) setDialog(null);
	};

	return (
		<div className="px-4 py-8 sm:px-8 lg:px-12">
			<div className="mx-auto w-full max-w-6xl">
				<nav
					aria-label="Breadcrumb"
					className="flex flex-wrap gap-2 text-muted-foreground text-sm"
				>
					<Link
						className="underline-offset-4 hover:underline"
						to={canManageAdmins ? "/admin/users" : "/admin/contributors"}
					>
						{canManageAdmins ? "Users" : "Contributors"}
					</Link>
					<span aria-hidden="true">/</span>
					<span className="text-foreground">{person.name}</span>
				</nav>

				<header className="mt-4 flex flex-wrap items-center justify-between gap-4">
					<div className="flex min-w-0 items-center gap-4">
						<span
							aria-hidden="true"
							className="grid size-16 shrink-0 place-items-center rounded-full bg-primary font-semibold text-lg text-primary-foreground"
						>
							{getInitials(person.name)}
						</span>
						<div className="min-w-0">
							<h1 className="font-serif text-3xl tracking-[-0.02em] sm:text-[2.5rem] sm:leading-tight">
								{person.name}
							</h1>
							<div className="mt-2 flex flex-wrap items-center gap-1.5">
								{profile.roles.map((role) => (
									<StatusChip key={role.id} tone="neutral">
										{role.name}
									</StatusChip>
								))}
								<AccountStatusChip status={person.status} />
								<span className="ml-1 text-muted-foreground text-sm">
									Member since {formatStaffDate(person.createdAt)}
								</span>
							</div>
						</div>
					</div>
					{isSelf || isDeleted ? null : (
						<div className="flex flex-wrap gap-2">
							<StaffButton
								onClick={() => setDialog({ name: "roles" })}
								variant="outline"
							>
								Change roles
							</StaffButton>
							{canManageAdmins && profile.suspension ? (
								<StaffButton
									onClick={() => setDialog({ name: "lift" })}
									variant="outline"
								>
									Lift suspension
								</StaffButton>
							) : null}
							{canManageAdmins &&
							!profile.suspension &&
							!person.managesAdmins ? (
								<StaffButton
									onClick={() => setDialog({ name: "suspend" })}
									variant="destructive"
								>
									Suspend account
								</StaffButton>
							) : null}
						</div>
					)}
				</header>

				{profile.suspension ? (
					<p
						className="mt-6 rounded-2xl bg-status-danger p-4 text-sm text-status-danger-foreground"
						role="status"
					>
						Suspended{" "}
						{profile.suspension.endsAt
							? `until ${formatStaffDateTime(profile.suspension.endsAt)}`
							: "until someone lifts it"}
						. {profile.suspension.reason}
					</p>
				) : null}

				{profile.pendingRoleChanges.map((change) => {
					const canDecide =
						canManageAdmins && !isSelf && change.proposerUserId !== viewer.id;
					return (
						<section
							aria-label={change.description}
							className="mt-6 rounded-2xl border border-status-info-foreground/25 bg-status-info p-5 sm:p-6"
							key={change.id}
						>
							<StatusChip className="bg-card" tone="info">
								Needs a Superadmin
							</StatusChip>
							<h2 className="mt-2 font-serif text-xl tracking-[-0.01em]">
								{change.description}
							</h2>
							<p className="mt-1 max-w-[65ch] text-sm">
								Requested by {change.proposerName} on{" "}
								{formatStaffDate(change.createdAt)}: {change.reason}
							</p>
							{change.change === "grant" && change.wouldGain.length > 0 ? (
								<div className="mt-3">
									<p className="font-medium text-sm">
										{person.name} would gain
									</p>
									<div className="mt-1.5 flex flex-wrap gap-1">
										{change.wouldGain.map((key) => (
											<StatusChip key={key} tone="neutral">
												{permissionNames.get(key) ?? key}
											</StatusChip>
										))}
									</div>
								</div>
							) : null}
							{canDecide ? (
								<div className="mt-4 flex flex-wrap gap-2">
									<StaffButton
										onClick={() =>
											setDialog({
												name: "decide",
												decision: "confirm",
												description: change.description,
												proposalId: change.id,
											})
										}
									>
										Confirm
									</StaffButton>
									<StaffButton
										onClick={() =>
											setDialog({
												name: "decide",
												decision: "reject",
												description: change.description,
												proposalId: change.id,
											})
										}
										variant="outline"
									>
										Decline
									</StaffButton>
								</div>
							) : (
								<p className="mt-3 font-medium text-sm">
									{change.proposerUserId === viewer.id
										? "You proposed this, so another Superadmin has to decide it."
										: isSelf
											? "This is about you, so another Superadmin has to decide it."
											: "A Superadmin has to decide this."}
								</p>
							)}
						</section>
					);
				})}

				<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
					<div className="grid min-w-0 gap-6">
						<StaffCard title="Editorial participation">
							<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
								<Stat
									label="Revisions authored"
									value={profile.stats.revisionsAuthored}
								/>
								<Stat
									label="Reviews completed"
									value={profile.stats.reviewsCompleted}
								/>
								<Stat
									label="Pieces published"
									value={profile.stats.piecesPublished}
								/>
								<Stat
									label="Open assignments"
									value={profile.stats.openAssignments}
								/>
							</dl>
						</StaffCard>
						<StaffCard title="Community">
							<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
								<Stat label="Posts" value={profile.stats.posts} />
								<Stat
									label="Reports against"
									value={profile.stats.reportsAgainst}
								/>
								<Stat
									label="Reports filed"
									value={profile.stats.reportsFiled}
								/>
								<Stat label="Removals" value={profile.stats.removals} />
							</dl>
							{profile.postingRestrictedUntil ? (
								<p className="mt-4 text-muted-foreground text-sm" role="status">
									Can't share with Community until{" "}
									{formatStaffDateTime(profile.postingRestrictedUntil)}.
								</p>
							) : null}
						</StaffCard>
					</div>

					<aside className="grid min-w-0 gap-6">
						<StaffCard>
							<div className="flex items-center gap-2">
								<LockIcon aria-hidden="true" className="size-4" />
								<h2 className="font-serif text-xl tracking-[-0.01em]">
									Private library
								</h2>
							</div>
							{isDeleted ? (
								<p className="mt-3 text-sm">
									Their notes, Prayer Journal, Collections and Saved items were
									erased when the account was deleted.
								</p>
							) : (
								<>
									<p className="mt-3 text-sm">
										Notes, Prayer Journal, Collections and Saved items belong to{" "}
										{person.name} and are not shown in administration.
									</p>
									<p className="mt-2 text-muted-foreground text-sm">
										Exceptional access for legal, safety or abuse cases needs a
										recorded case and a second Superadmin.
									</p>
								</>
							)}
							{canManageAdmins && !isSelf && !isDeleted ? (
								<StaffButton
									className="mt-4"
									onClick={() => setDialog({ name: "case" })}
									variant="outline"
								>
									Open a case
								</StaffButton>
							) : null}
							{canManageAdmins && profile.accessCases.length > 0 ? (
								<ul className="mt-4 divide-y divide-border-subtle border-border-subtle border-t">
									{profile.accessCases.map((accessCase) => (
										<AccessCaseRow
											accessCase={accessCase}
											canDecide={
												!isSelf && accessCase.proposerUserId !== viewer.id
											}
											key={accessCase.id}
											onDecide={(decision) =>
												setDialog({
													name: "decide",
													decision,
													description: `An access case about ${person.name}`,
													proposalId: accessCase.id,
												})
											}
										/>
									))}
								</ul>
							) : null}
						</StaffCard>

						<StaffCard title="Account">
							<dl className="space-y-3 text-sm">
								{isDeleted ? null : (
									<Detail label="Email" value={person.email} />
								)}
								<Detail
									label="Last active"
									value={
										person.lastActiveAt
											? formatStaffDate(person.lastActiveAt)
											: "Not recently"
									}
								/>
								<Detail
									label="Email confirmed"
									value={person.emailVerified ? "Yes" : "No"}
								/>
								<Detail
									label="Two-step sign-in"
									value={person.twoFactorEnabled ? "On" : "Off"}
								/>
							</dl>
						</StaffCard>

						<StaffCard
							actions={
								viewer.permissionKeys.includes("audit.view_all") ? (
									<Link
										className="text-sm underline-offset-4 hover:underline"
										to="/admin/audit"
									>
										Audit log
									</Link>
								) : null
							}
							title="Role history"
						>
							<ul className="space-y-3 text-sm">
								{profile.roleHistory.map((entry) => (
									<li key={entry.id}>
										<p className="font-medium">
											{historyLabel(entry.action, entry.details)}
										</p>
										<p className="text-muted-foreground text-xs">
											{entry.actorName}, {formatStaffDate(entry.occurredAt)}
										</p>
									</li>
								))}
								<li>
									<p className="font-medium">Joined as a member</p>
									<p className="text-muted-foreground text-xs">
										{formatStaffDate(person.createdAt)}
									</p>
								</li>
							</ul>
						</StaffCard>
					</aside>
				</div>
			</div>

			<ChangeRolesDialog
				currentRoleIds={profile.roles.map(({ id }) => id)}
				onOpenChange={closeDialog}
				open={dialog?.name === "roles"}
				personName={person.name}
				targetUserId={person.id}
				viewerPermissions={viewer.permissionKeys}
			/>
			<SuspendDialog
				onOpenChange={closeDialog}
				open={dialog?.name === "suspend"}
				personName={person.name}
				targetUserId={person.id}
			/>
			<LiftSuspensionDialog
				onOpenChange={closeDialog}
				open={dialog?.name === "lift"}
				personName={person.name}
				targetUserId={person.id}
			/>
			<AccessCaseDialog
				onOpenChange={closeDialog}
				open={dialog?.name === "case"}
				personName={person.name}
				targetUserId={person.id}
			/>
			{dialog?.name === "decide" ? (
				<DecisionDialog
					decision={dialog.decision}
					description={dialog.description}
					key={`${dialog.proposalId}-${dialog.decision}`}
					onOpenChange={closeDialog}
					open
					proposalId={dialog.proposalId}
				/>
			) : null}
		</div>
	);
}

const decisionLabels: Record<string, string> = {
	confirm: "confirmed",
	reject: "declined",
	return: "sent back",
};

function historyLabel(
	action: string,
	details: { decision?: string; role?: string },
) {
	const label = isAuditAction(action) ? auditActionLabels[action] : action;
	const detail =
		details.role ?? (details.decision && decisionLabels[details.decision]);
	return detail ? `${label}: ${detail}` : label;
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div>
			<dd className="font-serif text-3xl tabular-nums">{value}</dd>
			<dt className="mt-1 text-muted-foreground text-xs">{label}</dt>
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-wrap justify-between gap-x-4">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="min-w-0 break-words">{value}</dd>
		</div>
	);
}

const accessCaseStatus: Record<
	"proposed" | "applied" | "returned" | "rejected",
	{ label: string; tone: StatusTone }
> = {
	proposed: { label: "Needs a decision", tone: "info" },
	applied: { label: "Approved", tone: "success" },
	returned: { label: "Sent back", tone: "attention" },
	rejected: { label: "Declined", tone: "neutral" },
};

function AccessCaseRow({
	accessCase,
	canDecide,
	onDecide,
}: {
	accessCase: {
		ground: string;
		scope: string[];
		reason: string;
		status: "proposed" | "applied" | "returned" | "rejected";
		expiresAt: Date | null;
		proposerName: string;
		createdAt: Date;
	};
	canDecide: boolean;
	onDecide: (decision: "confirm" | "reject") => void;
}) {
	const expired = accessCase.expiresAt && accessCase.expiresAt < new Date();
	const status = expired
		? { label: "Ended", tone: "neutral" as const }
		: accessCaseStatus[accessCase.status];
	const ground =
		accessCaseGrounds.find(({ value }) => value === accessCase.ground)?.label ??
		accessCase.ground;
	const scope = accessCase.scope
		.map(
			(value) =>
				accessCaseScopes.find((option) => option.value === value)?.label ??
				value,
		)
		.join(", ");

	return (
		<li className="py-3 text-sm">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="font-medium">{ground}</span>
				<StatusChip tone={status.tone}>{status.label}</StatusChip>
			</div>
			<p className="mt-1 text-muted-foreground text-xs">
				{scope}. Opened by {accessCase.proposerName},{" "}
				{formatStaffDate(accessCase.createdAt)}.
				{accessCase.expiresAt && !expired
					? ` Ends ${formatStaffDate(accessCase.expiresAt)}.`
					: ""}
			</p>
			<p className="mt-1">{accessCase.reason}</p>
			{accessCase.status === "proposed" && canDecide ? (
				<div className="mt-2 flex flex-wrap gap-2">
					<StaffButton onClick={() => onDecide("confirm")}>Approve</StaffButton>
					<StaffButton onClick={() => onDecide("reject")} variant="outline">
						Decline
					</StaffButton>
				</div>
			) : null}
		</li>
	);
}
