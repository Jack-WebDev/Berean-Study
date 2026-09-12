import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@berean-study/ui/components/alert";
import { Button } from "@berean-study/ui/components/button";
import { Checkbox } from "@berean-study/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@berean-study/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { Input } from "@berean-study/ui/components/input";
import type { LucideIcon } from "lucide-react";
import {
	ChevronDownIcon,
	CircleAlertIcon,
	EllipsisVerticalIcon,
	LaptopIcon,
	LockKeyholeIcon,
	MonitorIcon,
	ShieldCheckIcon,
	SmartphoneIcon,
	Trash2Icon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

type SessionRecord = Awaited<
	ReturnType<typeof authClient.listSessions>
>["data"][number];

export function SecurityPage() {
	const { data: currentSession } = authClient.useSession();
	const [sessions, setSessions] = useState<SessionRecord[]>([]);
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

	const visibleSessions = showAllSessions ? sessions : sessions.slice(0, 3);
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
					<section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
						<PanelHeader
							action="Sign out all"
							description="These are the devices currently signed in to your account."
							icon={MonitorIcon}
							onAction={() => void revokeAllSessions()}
							title="Active sessions"
						/>
						<div className="mt-4 overflow-hidden rounded-lg border border-border/60">
							{isLoadingSessions ? (
								<p className="px-3 py-4 text-muted-foreground text-xs">
									Loading sessions…
								</p>
							) : visibleSessions.length > 0 ? (
								visibleSessions.map((session) => (
									<SessionRow
										current={session.id === currentSession?.session.id}
										key={session.id}
										onRevoke={revokeSession}
										session={session}
									/>
								))
							) : (
								<p className="px-3 py-4 text-muted-foreground text-xs">
									No active sessions found.
								</p>
							)}
						</div>
						{sessions.length > 3 ? (
							<Button
								className="mx-auto mt-3 h-auto px-2 py-1 text-xs"
								onClick={() => setShowAllSessions((current) => !current)}
								variant="ghost"
							>
								{showAllSessions ? "Show fewer sessions" : "Show more sessions"}
								<ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
							</Button>
						) : null}
					</section>
					<section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
						<PanelHeader
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

function SecurityPanel({
	icon,
	title,
	description,
	action,
	onAction,
	children,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	action: string;
	onAction: () => void;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
			<PanelHeader
				action={action}
				description={description}
				icon={icon}
				onAction={onAction}
				title={title}
			/>
			<div className="mt-4">{children}</div>
		</section>
	);
}

function PanelHeader({
	icon: Icon,
	title,
	description,
	action,
	onAction,
	variant = "outline",
}: {
	icon: LucideIcon;
	title: string;
	description: string;
	action: string;
	onAction: () => void;
	variant?: "outline" | "destructive";
}) {
	return (
		<header className="flex items-center gap-3 sm:gap-4">
			<div className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-secondary text-primary">
				<Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
			</div>
			<div className="min-w-0 flex-1">
				<h2 className="font-serif text-lg leading-tight tracking-[-0.015em] sm:text-xl">
					{title}
				</h2>
				<p className="mt-0.5 text-muted-foreground text-xs leading-5">
					{description}
				</p>
			</div>
			<Button className="rounded-lg" onClick={onAction} variant={variant}>
				{action}
			</Button>
		</header>
	);
}

function SecurityNotice({
	icon: Icon,
	title,
	description,
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<div className="flex gap-3 rounded-lg bg-secondary/70 px-3 py-3">
			<Icon
				aria-hidden="true"
				className="mt-0.5 size-4 shrink-0 text-primary"
				strokeWidth={1.8}
			/>
			<div>
				<p className="font-medium text-xs">{title}</p>
				<p className="mt-0.5 text-muted-foreground text-xs leading-5">
					{description}
				</p>
			</div>
		</div>
	);
}

function SessionRow({
	session,
	current,
	onRevoke,
}: {
	session: SessionRecord;
	current: boolean;
	onRevoke: (token: string) => Promise<void>;
}) {
	const device = describeDevice(session.userAgent);
	return (
		<div className="flex items-center gap-3 border-border/60 border-b px-3 py-2.5 last:border-b-0">
			<LaptopIcon
				aria-hidden="true"
				className="size-4 shrink-0 text-primary"
				strokeWidth={1.7}
			/>
			<span
				aria-hidden="true"
				className="size-2 shrink-0 rounded-full bg-primary"
			/>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-xs">{device}</p>
				<p className="truncate text-muted-foreground text-xs">
					{session.ipAddress ?? "Unknown location"} ·{" "}
					{relativeTime(session.createdAt)}
				</p>
			</div>
			{current ? (
				<span className="hidden rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground sm:inline">
					Current session
				</span>
			) : null}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							aria-label={`Manage ${device} session`}
							className="size-7 rounded-md"
							size="icon-sm"
							variant="ghost"
						/>
					}
				>
					<EllipsisVerticalIcon aria-hidden="true" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32 rounded-lg p-1">
					<DropdownMenuGroup>
						<DropdownMenuItem
							onClick={() => void onRevoke(session.token)}
							variant={current ? "default" : "destructive"}
						>
							{current ? "Sign out" : "Sign out device"}
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function ChangePasswordDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [revokeOthers, setRevokeOthers] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		const { error } = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: revokeOthers,
		});
		setIsSaving(false);
		if (error) {
			toast.error(error.message || "Unable to change password.");
			return;
		}
		setCurrentPassword("");
		setNewPassword("");
		onOpenChange(false);
		toast.success("Password changed.");
	}
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="rounded-xl p-5 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Change password</DialogTitle>
					<DialogDescription>
						Choose a unique password with at least 8 characters.
					</DialogDescription>
				</DialogHeader>
				<form className="flex flex-col gap-4" onSubmit={submit}>
					<Input
						autoComplete="current-password"
						className="rounded-lg"
						onChange={(event) => setCurrentPassword(event.target.value)}
						placeholder="Current password"
						required
						type="password"
						value={currentPassword}
					/>
					<Input
						autoComplete="new-password"
						className="rounded-lg"
						minLength={8}
						onChange={(event) => setNewPassword(event.target.value)}
						placeholder="New password"
						required
						type="password"
						value={newPassword}
					/>
					<label
						className="flex items-center gap-2 text-xs"
						htmlFor="revoke-other-sessions"
					>
						<Checkbox
							checked={revokeOthers}
							id="revoke-other-sessions"
							onCheckedChange={(checked) => setRevokeOthers(checked === true)}
						/>
						Sign out of other devices
					</label>
					<DialogFooter>
						<Button disabled={isSaving} type="submit">
							{isSaving ? "Changing password…" : "Change password"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function DeleteAccountDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (confirmation !== "DELETE") return;

		setIsDeleting(true);
		const { error } = await authClient.deleteUser({ password });
		setIsDeleting(false);

		if (error) {
			toast.error(error.message || "Unable to delete your account.");
			return;
		}

		window.location.assign("/");
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			setPassword("");
			setConfirmation("");
		}
		onOpenChange(nextOpen);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="rounded-xl p-5 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Delete your account</DialogTitle>
					<DialogDescription>
						This permanently removes your account, notes, bookmarks, settings,
						and active sessions. This cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<form className="flex flex-col gap-4" onSubmit={submit}>
					<Input
						autoComplete="current-password"
						className="rounded-lg"
						onChange={(event) => setPassword(event.target.value)}
						placeholder="Current password"
						required
						type="password"
						value={password}
					/>
					<div>
						<label
							className="font-medium text-xs"
							htmlFor="delete-account-confirmation"
						>
							Type DELETE to confirm
						</label>
						<Input
							className="mt-2 rounded-lg"
							id="delete-account-confirmation"
							onChange={(event) => setConfirmation(event.target.value)}
							placeholder="DELETE"
							required
							value={confirmation}
						/>
					</div>
					<DialogFooter>
						<Button
							disabled={isDeleting || confirmation !== "DELETE" || !password}
							type="submit"
							variant="destructive"
						>
							{isDeleting ? "Deleting account…" : "Permanently delete account"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function TwoFactorDialog({
	enabled,
	open,
	onOpenChange,
}: {
	enabled: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [enrollment, setEnrollment] = useState<{
		totpURI: string;
		backupCodes: string[];
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	async function beginEnrollment(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		const { data, error } = await authClient.twoFactor.enable({
			password,
			method: "totp",
		});
		setIsSubmitting(false);
		if (error || !data || data.method !== "totp") {
			toast.error(error?.message || "Unable to start two-factor setup.");
			return;
		}
		setEnrollment(data);
		setPassword("");
	}
	async function verifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		const { error } = await authClient.twoFactor.verifyTotp({ code });
		setIsSubmitting(false);
		if (error) {
			toast.error(error.message || "That code could not be verified.");
			return;
		}
		setCode("");
		setEnrollment(null);
		onOpenChange(false);
		toast.success("Two-factor authentication enabled.");
	}
	async function disableTwoFactor() {
		if (!password) {
			toast.error(
				"Enter your current password to disable two-factor authentication.",
			);
			return;
		}
		setIsSubmitting(true);
		const { error } = await authClient.twoFactor.disable({ password });
		setIsSubmitting(false);
		if (error) {
			toast.error(
				error.message || "Unable to disable two-factor authentication.",
			);
			return;
		}
		setPassword("");
		onOpenChange(false);
		toast.success("Two-factor authentication disabled.");
	}
	function close(nextOpen: boolean) {
		if (!nextOpen) {
			setEnrollment(null);
			setPassword("");
			setCode("");
		}
		onOpenChange(nextOpen);
	}
	return (
		<Dialog open={open} onOpenChange={close}>
			<DialogContent className="rounded-xl p-5 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{enabled
							? "Manage two-factor authentication"
							: enrollment
								? "Verify your authenticator"
								: "Set up two-factor authentication"}
					</DialogTitle>
					<DialogDescription>
						{enabled
							? "Enter your password to turn off two-factor authentication."
							: enrollment
								? "Scan this QR code, save your recovery codes, then enter the 6-digit code from your authenticator app."
								: "Use an authenticator app such as 1Password, Authy, or Google Authenticator."}
					</DialogDescription>
				</DialogHeader>
				{enabled ? (
					<div className="flex flex-col gap-4">
						<Input
							autoComplete="current-password"
							className="rounded-lg"
							onChange={(event) => setPassword(event.target.value)}
							placeholder="Current password"
							type="password"
							value={password}
						/>
						<DialogFooter>
							<Button
								disabled={isSubmitting || !password}
								onClick={() => void disableTwoFactor()}
								variant="destructive"
							>
								{isSubmitting ? "Disabling…" : "Disable 2FA"}
							</Button>
						</DialogFooter>
					</div>
				) : enrollment ? (
					<form className="flex flex-col gap-4" onSubmit={verifyEnrollment}>
						<div className="mx-auto rounded-lg bg-white p-3">
							<QRCodeSVG size={180} value={enrollment.totpURI} />
						</div>
						<div className="rounded-lg bg-secondary p-3">
							<p className="font-medium text-xs">Recovery codes</p>
							<p className="mt-1 text-muted-foreground text-xs">
								Store these in a safe place. Each can be used once.
							</p>
							<div className="mt-3 grid grid-cols-2 gap-1 font-mono text-xs">
								{enrollment.backupCodes.map((backupCode) => (
									<code key={backupCode}>{backupCode}</code>
								))}
							</div>
						</div>
						<Input
							autoComplete="one-time-code"
							className="rounded-lg text-center tracking-[0.35em]"
							inputMode="numeric"
							maxLength={6}
							onChange={(event) =>
								setCode(event.target.value.replace(/\D/g, ""))
							}
							placeholder="000000"
							required
							value={code}
						/>
						<DialogFooter>
							<Button
								disabled={isSubmitting || code.length !== 6}
								type="submit"
							>
								{isSubmitting ? "Verifying…" : "Verify and enable"}
							</Button>
						</DialogFooter>
					</form>
				) : (
					<form className="flex flex-col gap-4" onSubmit={beginEnrollment}>
						<Input
							autoComplete="current-password"
							className="rounded-lg"
							onChange={(event) => setPassword(event.target.value)}
							placeholder="Current password"
							required
							type="password"
							value={password}
						/>
						<DialogFooter>
							<Button disabled={isSubmitting || !password} type="submit">
								{isSubmitting ? "Preparing…" : "Continue"}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}

function describeDevice(userAgent: string | null | undefined) {
	if (!userAgent) return "Unknown device";
	const platform = /Android/i.test(userAgent)
		? "Android"
		: /iPhone|iPad|iOS/i.test(userAgent)
			? "iOS"
			: /Macintosh/i.test(userAgent)
				? "macOS"
				: /Windows/i.test(userAgent)
					? "Windows"
					: /Linux/i.test(userAgent)
						? "Linux"
						: "Unknown device";
	const browser = /Edg\//.test(userAgent)
		? "Edge"
		: /Firefox\//.test(userAgent)
			? "Firefox"
			: /Chrome\//.test(userAgent)
				? "Chrome"
				: /Safari\//.test(userAgent)
					? "Safari"
					: null;
	return browser ? `${platform} · ${browser}` : platform;
}
function relativeTime(value: Date | string) {
	const seconds = Math.max(
		0,
		Math.floor((Date.now() - new Date(value).getTime()) / 1000),
	);
	if (seconds < 60) return "Active now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	const days = Math.floor(hours / 24);
	return `${days} day${days === 1 ? "" : "s"} ago`;
}
