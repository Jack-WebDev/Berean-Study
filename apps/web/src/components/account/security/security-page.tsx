import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@berean-study/ui/components/alert";
import {
	CircleAlertIcon,
	LockKeyholeIcon,
	ShieldCheckIcon,
	SmartphoneIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import {
	ChangePasswordDialog,
	DeleteAccountDialog,
	TwoFactorDialog,
} from "./security-dialogs";
import {
	SecurityNotice,
	SecurityPanel,
	SecurityPanelHeader,
} from "./security-panel";
import { ActiveSessionsPanel } from "./security-sessions";
import type { SecuritySession } from "./types";

export function SecurityPage() {
	const { data: currentSession } = authClient.useSession();
	const [sessions, setSessions] = useState<SecuritySession[]>([]);
	const [isLoadingSessions, setIsLoadingSessions] = useState(true);
	const [showAllSessions, setShowAllSessions] = useState(false);
	const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
	const [isTwoFactorDialogOpen, setIsTwoFactorDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const loadSessions = useCallback(async () => {
		setIsLoadingSessions(true);
		const { data, error } = await authClient.listSessions();
		setIsLoadingSessions(false);
		if (error) {
			toast.error(error.message || "Unable to load active sessions.");
			return;
		}
		setSessions(data ?? []);
	}, []);

	useEffect(() => {
		if (currentSession?.user.id) void loadSessions();
	}, [currentSession?.user.id, loadSessions]);

	async function revokeSession(token: string) {
		const { error } = await authClient.revokeSession({ token });
		if (error) {
			toast.error(error.message || "Unable to sign out that session.");
			return;
		}
		toast.success("Session signed out.");
		void loadSessions();
	}

	async function revokeAllSessions() {
		const { error } = await authClient.revokeSessions();
		if (error) {
			toast.error(error.message || "Unable to sign out of all sessions.");
			return;
		}
		window.location.assign("/login");
	}

	const isTwoFactorEnabled = currentSession?.user.twoFactorEnabled ?? false;

	return (
		<>
			<div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
				<main className="flex min-w-0 flex-col gap-3">
					<SecurityPanel
						action="Change password"
						description="Use a strong password to keep your account secure."
						icon={LockKeyholeIcon}
						onAction={() => setIsPasswordDialogOpen(true)}
						title="Password"
					>
						<SecurityNotice
							description="Use a unique password that you don’t use on other websites."
							icon={ShieldCheckIcon}
							title="A strong password helps protect your account"
						/>
					</SecurityPanel>
					<SecurityPanel
						action={isTwoFactorEnabled ? "Manage 2FA" : "Set up 2FA"}
						description="Add an extra layer of security to your account."
						icon={SmartphoneIcon}
						onAction={() => setIsTwoFactorDialogOpen(true)}
						title="Two-factor authentication"
					>
						<SecurityNotice
							description={
								isTwoFactorEnabled
									? "Your authenticator app is required when you sign in on an untrusted device."
									: "Two-factor authentication helps protect your account even if someone knows your password."
							}
							icon={ShieldCheckIcon}
							title={isTwoFactorEnabled ? "Enabled" : "Not enabled"}
						/>
					</SecurityPanel>
					<ActiveSessionsPanel
						currentSessionId={currentSession?.session.id}
						isLoading={isLoadingSessions}
						onRevoke={revokeSession}
						onRevokeAll={() => void revokeAllSessions()}
						onShowAllChange={() => setShowAllSessions((current) => !current)}
						sessions={sessions}
						showAll={showAllSessions}
					/>
					<section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
						<SecurityPanelHeader
							action="Delete account"
							description="Permanently delete your account and all associated data."
							icon={Trash2Icon}
							onAction={() => setIsDeleteDialogOpen(true)}
							title="Delete account"
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
