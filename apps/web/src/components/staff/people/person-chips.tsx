import type { AccountStatus } from "@berean-study/db/people";

import { StatusChip, type StatusTone } from "../status-chip";

const statusPresentation: Record<
	AccountStatus,
	{ label: string; tone: StatusTone }
> = {
	active: { label: "Active", tone: "success" },
	suspended: { label: "Suspended", tone: "danger" },
	deleted: { label: "Deleted", tone: "neutral" },
};

export function AccountStatusChip({ status }: { status: AccountStatus }) {
	const { label, tone } = statusPresentation[status];
	return <StatusChip tone={tone}>{label}</StatusChip>;
}

export function RoleChips({ roles }: { roles: readonly string[] }) {
	if (roles.length === 0) {
		return <span className="text-muted-foreground text-sm">No roles</span>;
	}

	return (
		<span className="flex flex-wrap gap-1">
			{roles.map((role) => (
				<StatusChip key={role} tone="neutral">
					{role}
				</StatusChip>
			))}
		</span>
	);
}
