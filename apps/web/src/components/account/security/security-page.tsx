import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@berean-study/ui/components/alert";
import { Button } from "@berean-study/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
	CircleAlertIcon,
	LockKeyholeIcon,
	ShieldCheckIcon,
	SmartphoneIcon,
	Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { accountSessionsQueryOptions } from "@/queries/account";

import {
	ChangePasswordDialog,
	DeleteAccountDialog,
	TwoFactorDialog,
} from "./security-dialogs";
import { SecurityPanelHeader } from "./security-panel";
import { ActiveSessionsPanel } from "./security-sessions";

export function SecurityPage() {
	const { data: currentSession } = authClient.useSession();
	const queryClient = useQueryClient();
	const sessionsQuery = useQuery({
		...accountSessionsQueryOptions(),
		enabled: Boolean(currentSession?.user.id),
	});
	const [showAllSessions, setShowAllSessions] = useState(false);
	const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
	const [isTwoFactorDialogOpen, setIsTwoFactorDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const sessionsError = sessionsQuery.error;
	useEffect(() => {
		if (sessionsError) toast.error(sessionsError.message);
	}, [sessionsError]);

	const revokeSessionMutation = useMutation({
		mutationFn: async (token: string) => {
			const { error } = await authClient.revokeSession({ token });
			if (error)
				throw new Error(error.message || "Unable to sign out that session.");
		},
		onSuccess: () => {
			toast.success("Session signed out.");
			void queryClient.invalidateQueries({
				queryKey: accountSessionsQueryOptions().queryKey,
			});
		},
		onError: (error) => toast.error(error.message),
	});

	const revokeAllSessionsMutation = useMutation({
		mutationFn: async () => {
			const { error } = await authClient.revokeSessions();
			if (error)
				throw new Error(error.message || "Unable to sign out of all sessions.");
		},
		// Every session is gone, so leave with a full reload that drops all state.
		onSuccess: () => window.location.assign("/login"),
		onError: (error) => toast.error(error.message),
	});

	const isTwoFactorEnabled = currentSession?.user.twoFactorEnabled ?? false;

	return (
		<>
			<div className="mx-auto w-full max-w-3xl">
				<main className="flex min-w-0 flex-col gap-5">
					<SecuritySummary isTwoFactorEnabled={isTwoFactorEnabled} />
					<section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
						<header className="border-border/60 border-b px-4 py-4 sm:px-5">
							<h2 className="font-serif text-lg leading-tight tracking-[-0.015em] sm:text-xl">
								Sign-in methods
							</h2>
							<p className="mt-1 max-w-xl text-muted-foreground text-xs leading-5">
								Manage the credentials used to access your account.
							</p>
						</header>
						<div className="divide-y divide-border/60">
							<SecuritySetting
								action="Change password"
								description="Use a unique password that you do not use on other websites."
								icon={LockKeyholeIcon}
								onAction={() => setIsPasswordDialogOpen(true)}
								title="Password"
							/>
							<SecuritySetting
								action={isTwoFactorEnabled ? "Manage 2FA" : "Set up 2FA"}
								description={
									isTwoFactorEnabled
										? "Your authenticator app is required when you sign in on an untrusted device."
										: "Use an authenticator app to add a second check when you sign in."
								}
								icon={SmartphoneIcon}
								onAction={() => setIsTwoFactorDialogOpen(true)}
								status={isTwoFactorEnabled ? "Enabled" : "Not set up"}
								title="Two-factor authentication"
							/>
						</div>
					</section>
					<ActiveSessionsPanel
						currentSessionId={currentSession?.session.id}
						isLoading={sessionsQuery.isPending}
						onRevoke={(token) =>
							revokeSessionMutation.mutateAsync(token).catch(() => undefined)
						}
						onRevokeAll={() => revokeAllSessionsMutation.mutate()}
						onShowAllChange={() => setShowAllSessions((current) => !current)}
						sessions={sessionsQuery.data ?? []}
						showAll={showAllSessions}
					/>
					<section className="rounded-xl border border-destructive/30 bg-card p-4 shadow-sm sm:p-5">
						<SecurityPanelHeader
							action="Delete account"
							description="Permanently delete your account and all associated data."
							icon={Trash2Icon}
							onAction={() => setIsDeleteDialogOpen(true)}
							title="Remove account"
							variant="destructive"
						/>
						<Alert
							className="mt-4 border-0 bg-destructive/10 px-4 py-3"
							variant="destructive"
						>
							<CircleAlertIcon aria-hidden="true" />
							<AlertTitle>This action cannot be undone</AlertTitle>
							<AlertDescription>
								All your data, notes, bookmarks, and settings will be
								permanently removed.
							</AlertDescription>
						</Alert>
					</section>
				</main>
			</div>
			<ChangePasswordDialog
				open={isPasswordDialogOpen}
				onOpenChange={setIsPasswordDialogOpen}
			/>
			<DeleteAccountDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			/>
			<TwoFactorDialog
				enabled={isTwoFactorEnabled}
				open={isTwoFactorDialogOpen}
				onOpenChange={setIsTwoFactorDialogOpen}
			/>
		</>
	);
}

function SecuritySummary({
	isTwoFactorEnabled,
}: {
	isTwoFactorEnabled: boolean;
}) {
	return (
		<section className="overflow-hidden rounded-xl bg-primary px-4 py-5 text-primary-foreground shadow-sm sm:px-5 sm:py-6">
			<div className="flex items-start gap-3 sm:gap-4">
				<div className="grid size-10 shrink-0 place-items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10">
					<ShieldCheckIcon
						aria-hidden="true"
						className="size-5"
						strokeWidth={1.7}
					/>
				</div>
				<div className="min-w-0">
					<p className="text-primary-foreground/70 text-xs">
						Two-factor authentication
					</p>
					<h2 className="mt-1 font-serif text-xl leading-tight tracking-[-0.02em] sm:text-2xl">
						{isTwoFactorEnabled
							? "An extra sign-in check is active"
							: "Add a second check at sign-in"}
					</h2>
					<p className="mt-2 max-w-xl text-primary-foreground/75 text-sm leading-6">
						{isTwoFactorEnabled
							? "Your authenticator app helps keep your account protected when you use a new device."
							: "An authenticator app helps protect your account if your password is exposed."}
					</p>
				</div>
			</div>
		</section>
	);
}

function SecuritySetting({
	icon: Icon,
	title,
	description,
	action,
	onAction,
	status,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	action: string;
	onAction: () => void;
	status?: string;
}) {
	return (
		<div className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5">
			<Icon
				aria-hidden="true"
				className="size-4 shrink-0 text-primary"
				strokeWidth={1.7}
			/>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<h3 className="font-medium text-sm">{title}</h3>
					{status ? (
						<span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground text-xs">
							{status}
						</span>
					) : null}
				</div>
				<p className="mt-1 text-muted-foreground text-xs leading-5">
					{description}
				</p>
			</div>
			<Button
				className="shrink-0 rounded-lg"
				onClick={onAction}
				variant="outline"
			>
				{action}
			</Button>
		</div>
	);
}
