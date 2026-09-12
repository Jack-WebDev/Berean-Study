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
import { Input } from "@berean-study/ui/components/input";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

type DialogState = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ChangePasswordDialog({ open, onOpenChange }: DialogState) {
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

export function DeleteAccountDialog({ open, onOpenChange }: DialogState) {
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

export function TwoFactorDialog({
	enabled,
	open,
	onOpenChange,
}: DialogState & { enabled: boolean }) {
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
