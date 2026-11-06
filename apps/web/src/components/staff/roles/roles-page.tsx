import type { PermissionKey } from "@berean-study/db/access-catalogue";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { cn } from "@berean-study/ui/lib/utils";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { CheckIcon, LockIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { createRole, saveRolePermissions } from "@/functions/roles";
import { auditKeys, peopleKeys, roleKeys } from "@/queries/keys";
import { roleMatrixQueryOptions } from "@/queries/roles";

import { StaffButton } from "../staff-button";
import { StaffCard } from "../staff-card";
import { ReasonField, StaffFormDialog } from "../staff-form-dialog";
import { StaffPage } from "../staff-page";

type Change = { granted: boolean; permission: PermissionKey; roleId: number };

function changeKey(roleId: number, permission: PermissionKey) {
	return `${roleId}|${permission}`;
}

export function RolesPage() {
	const { data: matrix } = useSuspenseQuery(roleMatrixQueryOptions());
	const [changes, setChanges] = useState<ReadonlyMap<string, Change>>(
		new Map(),
	);
	const [reviewing, setReviewing] = useState(false);
	const [creating, setCreating] = useState(false);

	const categories = [...new Set(matrix.permissions.map((p) => p.category))];
	const roleName = (roleId: number) =>
		matrix.roles.find(({ id }) => id === roleId)?.name ?? "This role";
	const summary = [...changes.values()].map(
		({ granted, permission, roleId }) =>
			`${roleName(roleId)} ${granted ? "gains" : "loses"} ${permission}`,
	);

	function toggle(
		role: (typeof matrix.roles)[number],
		permission: PermissionKey,
	) {
		setChanges((previous) => {
			const next = new Map(previous);
			const key = changeKey(role.id, permission);
			if (!next.delete(key)) {
				next.set(key, {
					roleId: role.id,
					permission,
					granted: !role.grants.includes(permission),
				});
			}
			return next;
		});
	}

	return (
		<StaffPage
			actions={
				<StaffButton onClick={() => setCreating(true)} variant="outline">
					New role
				</StaffButton>
			}
			description="Who can do what inside Berean Study. Superadmin permissions are fixed, so the platform can never be locked out of its own governance."
			section="Management"
			title="Roles & permissions"
		>
			<ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				{matrix.roles.map((role) => (
					<li
						className="rounded-2xl border border-border bg-card p-4"
						key={role.id}
					>
						<p className="font-semibold text-sm">{role.name}</p>
						<p className="mt-1 text-muted-foreground text-xs">
							{role.autoAssign
								? "Everyone"
								: `${role.people} ${role.people === 1 ? "person" : "people"}`}
						</p>
						{role.description ? (
							<p className="mt-2 text-muted-foreground text-xs">
								{role.description}
							</p>
						) : null}
					</li>
				))}
			</ul>

			{changes.size > 0 ? (
				<div
					className="sticky top-2 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent bg-status-attention p-4 text-sm text-status-attention-foreground shadow-sm"
					role="status"
				>
					<p className="min-w-0 flex-1 basis-64">
						<strong>
							{changes.size} unsaved {changes.size === 1 ? "change" : "changes"}
						</strong>
						: {summary.join("; ")}
					</p>
					<div className="flex gap-2">
						<StaffButton
							onClick={() => setChanges(new Map())}
							variant="outline"
						>
							Discard
						</StaffButton>
						<StaffButton onClick={() => setReviewing(true)}>
							Review &amp; save
						</StaffButton>
					</div>
				</div>
			) : null}

			<StaffCard className="mt-6 p-0 sm:p-0">
				<h2 className="p-5 pb-3 font-serif text-xl tracking-[-0.01em] sm:p-6 sm:pb-3">
					Permission matrix
				</h2>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[46rem] border-collapse text-sm">
						<thead>
							<tr className="border-border-subtle border-b text-left">
								<th
									className="sticky left-0 z-10 bg-card py-2 pr-3 pl-5 font-medium text-muted-foreground text-xs sm:pl-6"
									scope="col"
								>
									Permission
								</th>
								{matrix.roles.map((role) => (
									<th
										className="px-2 py-2 text-center font-medium text-xs"
										key={role.id}
										scope="col"
									>
										{role.name}
									</th>
								))}
							</tr>
						</thead>
						{categories.map((category) => (
							<tbody key={category}>
								<tr>
									<th
										className="sticky left-0 bg-card px-5 pt-5 pb-1 text-left font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em] sm:px-6"
										colSpan={matrix.roles.length + 1}
										scope="colgroup"
									>
										{category}
									</th>
								</tr>
								{matrix.permissions
									.filter((permission) => permission.category === category)
									.map((permission) => (
										<tr
											className="border-border-subtle border-b"
											key={permission.key}
										>
											<th
												className="sticky left-0 z-10 max-w-52 bg-card py-2 pr-3 pl-5 text-left font-normal sm:max-w-none sm:pl-6"
												scope="row"
												title={permission.description}
											>
												<span className="block">{permission.name}</span>
												<code className="block break-all text-[0.6875rem] text-muted-foreground">
													{permission.key}
												</code>
											</th>
											{matrix.roles.map((role) => {
												const change = changes.get(
													changeKey(role.id, permission.key),
												);
												return (
													<td className="px-2 py-1.5 text-center" key={role.id}>
														<PermissionToggle
															changed={change !== undefined}
															label={`${role.name}: ${permission.name}${role.locked ? " (fixed)" : ""}`}
															locked={role.locked}
															on={
																change?.granted ??
																role.grants.includes(permission.key)
															}
															onToggle={() => toggle(role, permission.key)}
														/>
													</td>
												);
											})}
										</tr>
									))}
							</tbody>
						))}
					</table>
				</div>
				<p className="p-5 text-muted-foreground text-xs sm:p-6">
					Every saved change is written to the audit log with your name and
					reason. Private member content (notes, prayers, collections) can never
					be granted as a permission.
				</p>
			</StaffCard>

			<ReviewChangesDialog
				changes={[...changes.values()]}
				onOpenChange={setReviewing}
				onSaved={() => setChanges(new Map())}
				open={reviewing}
				summary={summary}
			/>
			<NewRoleDialog onOpenChange={setCreating} open={creating} />
		</StaffPage>
	);
}

function PermissionToggle({
	changed,
	label,
	locked,
	on,
	onToggle,
}: {
	changed: boolean;
	label: string;
	locked: boolean;
	on: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			aria-label={label}
			aria-pressed={on}
			className={cn(
				"mx-auto grid size-11 place-items-center rounded-[0.625rem] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				locked &&
					"cursor-not-allowed border-border bg-sidebar text-muted-foreground",
				!locked && changed && "border-2 border-accent",
				!locked && changed && on && "bg-sidebar-accent",
				!locked &&
					!changed &&
					on &&
					"border-primary bg-primary text-primary-foreground",
				!locked && !on && "border-border-strong bg-card hover:bg-muted",
			)}
			disabled={locked}
			onClick={onToggle}
			type="button"
		>
			{locked ? (
				<LockIcon aria-hidden="true" className="size-4" />
			) : on ? (
				<CheckIcon aria-hidden="true" className="size-4" />
			) : null}
		</button>
	);
}

function ReviewChangesDialog({
	changes,
	onOpenChange,
	onSaved,
	open,
	summary,
}: {
	changes: Change[];
	onOpenChange: (open: boolean) => void;
	onSaved: () => void;
	open: boolean;
	summary: string[];
}) {
	const [reason, setReason] = useState("");
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: () => saveRolePermissions({ data: { changes, reason } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: roleKeys.all }),
				queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
				queryClient.invalidateQueries({ queryKey: auditKeys.all }),
			]);
			toast.success("Permissions saved");
			onSaved();
			setReason("");
			onOpenChange(false);
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<StaffFormDialog
			canSubmit={reason.trim().length > 0}
			description="These take effect for everyone holding the role as soon as you save."
			onOpenChange={onOpenChange}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel="Save changes"
			title="Review changes"
		>
			<ul className="list-disc space-y-1 pl-5 text-sm">
				{summary.map((line) => (
					<li key={line}>{line}</li>
				))}
			</ul>
			<ReasonField
				hint="Recorded in the audit log under your name."
				onChange={setReason}
				value={reason}
			/>
		</StaffFormDialog>
	);
}

function NewRoleDialog({
	onOpenChange,
	open,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const nameId = useId();
	const descriptionId = useId();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: () => createRole({ data: { name, description } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: roleKeys.all }),
				queryClient.invalidateQueries({ queryKey: peopleKeys.all }),
				queryClient.invalidateQueries({ queryKey: auditKeys.all }),
			]);
			toast.success(`${name.trim()} created`);
			setName("");
			setDescription("");
			onOpenChange(false);
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<StaffFormDialog
			canSubmit={name.trim().length > 0}
			description="A new role starts with no permissions. Choose them in the matrix afterwards."
			onOpenChange={onOpenChange}
			onSubmit={() => mutation.mutate()}
			open={open}
			pending={mutation.isPending}
			submitLabel="Create role"
			title="New role"
		>
			<div className="space-y-2">
				<Label htmlFor={nameId}>Name</Label>
				<Input
					className="h-11 rounded-[0.625rem]"
					id={nameId}
					maxLength={60}
					onChange={(event) => setName(event.target.value)}
					required
					value={name}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor={descriptionId}>What this role does</Label>
				<Input
					className="h-11 rounded-[0.625rem]"
					id={descriptionId}
					maxLength={200}
					onChange={(event) => setDescription(event.target.value)}
					value={description}
				/>
			</div>
		</StaffFormDialog>
	);
}
