import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { Checkbox } from "@berean-study/ui/components/checkbox";
import { Label } from "@berean-study/ui/components/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "@berean-study/ui/components/native-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";

import {
	changeRoles,
	decideChange,
	liftSuspension,
	openAccessCase,
	suspendAccount,
} from "@/functions/people";
import { auditKeys, peopleKeys, staffQueueKeys } from "@/queries/keys";
import { assignableRolesQueryOptions } from "@/queries/people";

import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { StatusChip } from "../status-chip";

/** Everything these dialogs change also shows on the profile, lists, audit log and counts. */
function usePeopleMutationSettled() {
	const queryClient = useQueryClient();
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
			queryClient.invalidateQueries({ queryKey: auditKeys.all }),
			queryClient.invalidateQueries({ queryKey: staffQueueKeys.all }),
		]);
}

type DialogProps = {
	onOpenChange: (open: boolean) => void;
	open: boolean;
};

export function ChangeRolesDialog({
	currentRoleIds,
	onOpenChange,
	open,
	personName,
	targetUserId,
	viewerPermissions,
}: DialogProps & {
	currentRoleIds: readonly number[];
	personName: string;
	targetUserId: string;
	viewerPermissions: readonly PermissionKey[];
}) {
	const { data: roles } = useQuery({
		...assignableRolesQueryOptions(),
		enabled: open,
	});
	const [toggled, setToggled] = useState<ReadonlySet<number>>(new Set());
	const [reason, setReason] = useState("");
	const settled = usePeopleMutationSettled();
	const canManageAdmins = viewerPermissions.includes("admins.manage");

	function close() {
		setToggled(new Set());
		setReason("");
		onOpenChange(false);
	}

	const mutation = useMutation({
		mutationFn: () =>
			changeRoles({
				data: {
					targetUserId,
					reason,
					grant: [...toggled].filter((id) => !currentRoleIds.includes(id)),
					revoke: [...toggled].filter((id) => currentRoleIds.includes(id)),
				},
			}),
		onSuccess: async ({ applied, proposed }) => {
			await settled();
			if (applied.length > 0) toast.success(`Saved: ${applied.join(", ")}`);
			if (proposed.length > 0) {
				toast.success(
					`Sent for a second person to confirm: ${proposed.join(", ")}`,
				);
			}
			close();
		},
		onError: (error) => toast.error(error.message),
	});

	function toggle(roleId: number) {
		setToggled((previous) => {
			const next = new Set(previous);
			if (!next.delete(roleId)) next.add(roleId);
			return next;
		});
	}

	return (
		<StaffFormDialog
			canSubmit={toggled.size > 0 && reason.trim().length > 0}
			description={`Choose the roles ${personName} should hold.`}
			onOpenChange={(next) => (next ? onOpenChange(true) : close())}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel="Save changes"
			title="Change roles"
		>
			<fieldset className="space-y-1">
				<legend className="sr-only">Roles</legend>
				{roles?.map((role) => {
					const held = currentRoleIds.includes(role.id);
					const checked = toggled.has(role.id) ? !held : held;
					const unavailable =
						role.autoAssign || (role.superadminOnly && !canManageAdmins);
					return (
						<Label
							className="flex min-h-11 items-center gap-3 rounded-[0.625rem] px-2 py-1.5 font-normal has-data-disabled:opacity-60"
							key={role.id}
						>
							<Checkbox
								checked={checked}
								disabled={unavailable}
								onCheckedChange={() => toggle(role.id)}
							/>
							<span className="min-w-0 flex-1">
								<span className="block font-medium text-sm">{role.name}</span>
								{role.description ? (
									<span className="block text-muted-foreground text-xs">
										{role.description}
									</span>
								) : null}
							</span>
							{role.autoAssign ? (
								<StatusChip tone="neutral">Everyone</StatusChip>
							) : role.superadminOnly && !canManageAdmins ? (
								<StatusChip tone="neutral">Superadmins only</StatusChip>
							) : role.protected ? (
								<StatusChip tone="info">Needs a second person</StatusChip>
							) : null}
						</Label>
					);
				})}
			</fieldset>
			<ReasonField
				hint="Recorded in the audit log under your name."
				onChange={setReason}
				value={reason}
			/>
		</StaffFormDialog>
	);
}

export function DecisionDialog({
	decision,
	description,
	onOpenChange,
	open,
	proposalId,
}: DialogProps & {
	decision: "confirm" | "reject";
	description: string;
	proposalId: number;
}) {
	const [note, setNote] = useState("");
	const settled = usePeopleMutationSettled();
	const mutation = useMutation({
		mutationFn: () => decideChange({ data: { proposalId, decision, note } }),
		onSuccess: async () => {
			await settled();
			toast.success(decision === "confirm" ? "Confirmed" : "Declined");
			setNote("");
			onOpenChange(false);
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<StaffFormDialog
			canSubmit={note.trim().length > 0}
			description={description}
			destructive={decision === "reject"}
			onOpenChange={onOpenChange}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel={decision === "confirm" ? "Confirm" : "Decline"}
			title={
				decision === "confirm" ? "Confirm this change" : "Decline this change"
			}
		>
			<ReasonField
				hint="The person who proposed this will see your note."
				label="Note"
				onChange={setNote}
				value={note}
			/>
		</StaffFormDialog>
	);
}

const suspensionLengths = [
	{ label: "7 days", value: "7" },
	{ label: "14 days", value: "14" },
	{ label: "30 days", value: "30" },
	{ label: "Until someone lifts it", value: "open" },
];

export function SuspendDialog({
	onOpenChange,
	open,
	personName,
	targetUserId,
}: DialogProps & { personName: string; targetUserId: string }) {
	const lengthId = useId();
	const [length, setLength] = useState("14");
	const [reason, setReason] = useState("");
	const settled = usePeopleMutationSettled();
	const mutation = useMutation({
		mutationFn: () =>
			suspendAccount({
				data: {
					targetUserId,
					reason,
					days: length === "open" ? null : Number(length),
				},
			}),
		onSuccess: async () => {
			await settled();
			toast.success(`${personName} is suspended`);
			setReason("");
			onOpenChange(false);
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<StaffFormDialog
			canSubmit={reason.trim().length > 0}
			description={`${personName} will be signed out everywhere and can't sign in until this ends.`}
			destructive
			onOpenChange={onOpenChange}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel="Suspend account"
			title="Suspend account"
		>
			<div className="space-y-2">
				<Label htmlFor={lengthId}>How long</Label>
				<NativeSelect
					className="h-11 w-full rounded-[0.625rem]"
					id={lengthId}
					onChange={(event) => setLength(event.target.value)}
					value={length}
				>
					{suspensionLengths.map(({ label, value }) => (
						<NativeSelectOption key={value} value={value}>
							{label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>
			<ReasonField
				hint="Recorded in the audit log under your name."
				onChange={setReason}
				value={reason}
			/>
		</StaffFormDialog>
	);
}

export function LiftSuspensionDialog({
	onOpenChange,
	open,
	personName,
	targetUserId,
}: DialogProps & { personName: string; targetUserId: string }) {
	const [reason, setReason] = useState("");
	const settled = usePeopleMutationSettled();
	const mutation = useMutation({
		mutationFn: () => liftSuspension({ data: { targetUserId, reason } }),
		onSuccess: async () => {
			await settled();
			toast.success(`${personName} can sign in again`);
			setReason("");
			onOpenChange(false);
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<StaffFormDialog
			canSubmit={reason.trim().length > 0}
			description={`${personName} will be able to sign in again straight away.`}
			onOpenChange={onOpenChange}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel="Lift suspension"
			title="Lift suspension"
		>
			<ReasonField
				hint="Recorded in the audit log under your name."
				onChange={setReason}
				value={reason}
			/>
		</StaffFormDialog>
	);
}

export const accessCaseGrounds = [
	{ label: "Legal order", value: "legal" },
	{ label: "Someone's safety", value: "safety" },
	{ label: "Abuse investigation", value: "abuse" },
] as const;

export const accessCaseScopes = [
	{ label: "Notes", value: "notes" },
	{ label: "Prayer Journal", value: "prayer_journal" },
	{ label: "Collections", value: "collections" },
	{ label: "Saved", value: "saved" },
] as const;

type AccessCaseGround = (typeof accessCaseGrounds)[number]["value"];
type AccessCaseScope = (typeof accessCaseScopes)[number]["value"];

export function AccessCaseDialog({
	onOpenChange,
	open,
	personName,
	targetUserId,
}: DialogProps & { personName: string; targetUserId: string }) {
	const groundId = useId();
	const expiryId = useId();
	const [ground, setGround] = useState<AccessCaseGround>("legal");
	const [scope, setScope] = useState<ReadonlySet<AccessCaseScope>>(new Set());
	const [days, setDays] = useState("14");
	const [reason, setReason] = useState("");
	const settled = usePeopleMutationSettled();
	const mutation = useMutation({
		mutationFn: () =>
			openAccessCase({
				data: {
					targetUserId,
					ground,
					scope: [...scope],
					expiresInDays: Number(days),
					reason,
				},
			}),
		onSuccess: async () => {
			await settled();
			toast.success("Case opened. A second Superadmin has been told.");
			setReason("");
			setScope(new Set());
			onOpenChange(false);
		},
		onError: (error) => toast.error(error.message),
	});

	function toggleScope(value: AccessCaseScope) {
		setScope((previous) => {
			const next = new Set(previous);
			if (!next.delete(value)) next.add(value);
			return next;
		});
	}

	return (
		<StaffFormDialog
			canSubmit={scope.size > 0 && reason.trim().length > 0}
			description={`A second Superadmin decides this case. Approving it records the decision and doesn't open ${personName}'s private content in Berean Study.`}
			onOpenChange={onOpenChange}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel="Open case"
			title="Open an access case"
		>
			<div className="space-y-2">
				<Label htmlFor={groundId}>Grounds</Label>
				<NativeSelect
					className="h-11 w-full rounded-[0.625rem]"
					id={groundId}
					onChange={(event) => {
						const next = accessCaseGrounds.find(
							({ value }) => value === event.target.value,
						);
						if (next) setGround(next.value);
					}}
					value={ground}
				>
					{accessCaseGrounds.map(({ label, value }) => (
						<NativeSelectOption key={value} value={value}>
							{label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>
			<fieldset className="space-y-1">
				<legend className="mb-1 font-medium text-sm">What it covers</legend>
				{accessCaseScopes.map(({ label, value }) => (
					<Label
						className="flex min-h-11 items-center gap-3 rounded-[0.625rem] px-2 font-normal"
						key={value}
					>
						<Checkbox
							checked={scope.has(value)}
							onCheckedChange={() => toggleScope(value)}
						/>
						{label}
					</Label>
				))}
			</fieldset>
			<div className="space-y-2">
				<Label htmlFor={expiryId}>Ends after</Label>
				<NativeSelect
					className="h-11 w-full rounded-[0.625rem]"
					id={expiryId}
					onChange={(event) => setDays(event.target.value)}
					value={days}
				>
					{["7", "14", "30", "90"].map((value) => (
						<NativeSelectOption key={value} value={value}>
							{value} days
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>
			<ReasonField
				hint="Include any case or order reference."
				onChange={setReason}
				value={reason}
			/>
		</StaffFormDialog>
	);
}
