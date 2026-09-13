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
import { Label } from "@berean-study/ui/components/label";
import {
	Check,
	Copy,
	Eye,
	EyeOff,
	KeyRound,
	ShieldCheck,
	Smartphone,
	Trash2,
	TriangleAlert,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

type DialogState = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type DialogIconProps = {
	children: ReactNode;
	variant?: "default" | "destructive";
};

function DialogIcon({ children, variant = "default" }: DialogIconProps) {
	return (
		<div
			className={
				variant === "destructive"
					? "flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
					: "flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			}
		>
			{children}
		</div>
	);
}

type PasswordFieldProps = {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	autoComplete?: string;
	placeholder?: string;
	required?: boolean;
};

function PasswordField({
	id,
	label,
	value,
	onChange,
	autoComplete,
	placeholder,
	required = false,
}: PasswordFieldProps) {
	const [visible, setVisible] = useState(false);

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>

			<div className="relative">
				<Input
					autoComplete={autoComplete}
					className="h-11 rounded-xl pr-11"
					id={id}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
					required={required}
					type={visible ? "text" : "password"}
					value={value}
				/>

				<button
					aria-label={visible ? "Hide password" : "Show password"}
					className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
					onClick={() => setVisible((current) => !current)}
					type="button"
				>
					{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
				</button>
			</div>
		</div>
	);
}

function DialogDivider() {
	return <div className="h-px bg-border/70" />;
}

export function ChangePasswordDialog({ open, onOpenChange }: DialogState) {
	const currentPasswordId = useId();
	const newPasswordId = useId();

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [revokeOthers, setRevokeOthers] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	function reset() {
		setCurrentPassword("");
		setNewPassword("");
		setRevokeOthers(true);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) reset();
		onOpenChange(nextOpen);
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isSaving) return;

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

		reset();
		onOpenChange(false);
		toast.success("Password changed.");
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-2xl sm:max-w-125">
				<div className="px-6 pt-6 pb-5 sm:px-7">
					<DialogHeader className="space-y-4 text-left">
						<DialogIcon>
							<KeyRound className="size-5" />
						</DialogIcon>

						<div className="space-y-1.5">
							<DialogTitle className="font-serif text-2xl tracking-tight">
								Change password
							</DialogTitle>

							<DialogDescription className="max-w-sm leading-6">
								Choose a strong, unique password that you do not use for another
								account.
							</DialogDescription>
						</div>
					</DialogHeader>
				</div>

				<DialogDivider />

				<form onSubmit={submit}>
					<div className="space-y-5 px-6 py-6 sm:px-7">
						<PasswordField
							autoComplete="current-password"
							id={currentPasswordId}
							label="Current password"
							onChange={setCurrentPassword}
							placeholder="Enter your current password"
							required
							value={currentPassword}
						/>

						<div className="space-y-2">
							<PasswordField
								autoComplete="new-password"
								id={newPasswordId}
								label="New password"
								onChange={setNewPassword}
								placeholder="Enter a new password"
								required
								value={newPassword}
							/>

							<p className="text-muted-foreground text-xs leading-5">
								Use at least 8 characters. A longer, unique password is
								recommended.
							</p>
						</div>

						<label
							className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
							htmlFor="revoke-other-sessions"
						>
							<Checkbox
								checked={revokeOthers}
								className="mt-0.5"
								id="revoke-other-sessions"
								onCheckedChange={(checked) => setRevokeOthers(checked === true)}
							/>

							<span className="space-y-1">
								<span className="block font-medium text-sm">
									Sign out of other devices
								</span>

								<span className="block text-muted-foreground text-xs leading-5">
									Ends your other active sessions after your password changes.
								</span>
							</span>
						</label>
					</div>

					<DialogDivider />

					<DialogFooter className="gap-2 bg-muted/20 px-6 py-4 sm:px-7">
						<Button
							disabled={isSaving}
							onClick={() => handleOpenChange(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>

						<Button
							disabled={isSaving || !currentPassword || newPassword.length < 8}
							type="submit"
						>
							{isSaving ? "Changing password…" : "Change password"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteAccountDialog({ open, onOpenChange }: DialogState) {
	const passwordId = useId();
	const confirmationId = useId();

	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);

	const canDelete =
		Boolean(password) && confirmation === "DELETE" && !isDeleting;

	function reset() {
		setPassword("");
		setConfirmation("");
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) reset();
		onOpenChange(nextOpen);
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canDelete) return;

		setIsDeleting(true);

		const { error } = await authClient.deleteUser({ password });

		setIsDeleting(false);

		if (error) {
			toast.error(error.message || "Unable to delete your account.");
			return;
		}

		window.location.assign("/");
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-2xl sm:max-w-130">
				<div className="px-6 pt-6 pb-5 sm:px-7">
					<DialogHeader className="items-center space-y-4 text-center">
						<DialogIcon variant="destructive">
							<Trash2 className="size-5" />
						</DialogIcon>

						<div className="space-y-2">
							<DialogTitle className="font-serif text-2xl tracking-tight">
								Delete your account
							</DialogTitle>

							<DialogDescription className="mx-auto max-w-md leading-6">
								This permanently removes your account, notes, bookmarks,
								settings, and active sessions.
							</DialogDescription>
						</div>
					</DialogHeader>
				</div>

				<DialogDivider />

				<form onSubmit={submit}>
					<div className="space-y-5 px-6 py-6 sm:px-7">
						<p className="font-medium text-sm">
							To continue, verify that this account belongs to you.
						</p>

						<PasswordField
							autoComplete="current-password"
							id={passwordId}
							label="Current password"
							onChange={setPassword}
							placeholder="Enter your current password"
							required
							value={password}
						/>

						<div className="space-y-2">
							<Label htmlFor={confirmationId}>
								Type <span className="font-semibold">DELETE</span> to confirm
							</Label>

							<Input
								autoComplete="off"
								className="h-11 rounded-xl"
								id={confirmationId}
								onChange={(event) => setConfirmation(event.target.value)}
								placeholder="DELETE"
								required
								value={confirmation}
							/>
						</div>

						<div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/6 p-4">
							<TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />

							<div className="space-y-1">
								<p className="font-medium text-destructive text-sm">
									This action cannot be undone.
								</p>

								<p className="text-destructive/80 text-xs leading-5">
									Your Berean Study account and associated personal data will be
									permanently removed.
								</p>
							</div>
						</div>
					</div>

					<DialogDivider />

					<DialogFooter className="gap-2 bg-muted/20 px-6 py-4 sm:px-7">
						<Button
							disabled={isDeleting}
							onClick={() => handleOpenChange(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>

						<Button disabled={!canDelete} type="submit" variant="destructive">
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
	const passwordId = useId();
	const codeId = useId();

	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [enrollment, setEnrollment] = useState<{
		totpURI: string;
		backupCodes: string[];
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [copied, setCopied] = useState(false);

	function reset() {
		setEnrollment(null);
		setPassword("");
		setCode("");
		setCopied(false);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) reset();
		onOpenChange(nextOpen);
	}

	async function beginEnrollment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isSubmitting || !password) return;

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

	async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isSubmitting || code.length !== 6) return;

		setIsSubmitting(true);

		const { error } = await authClient.twoFactor.verifyTotp({ code });

		setIsSubmitting(false);

		if (error) {
			toast.error(error.message || "That code could not be verified.");
			return;
		}

		reset();
		onOpenChange(false);
		toast.success("Two-factor authentication enabled.");
	}

	async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isSubmitting || !password) return;

		setIsSubmitting(true);

		const { error } = await authClient.twoFactor.disable({ password });

		setIsSubmitting(false);

		if (error) {
			toast.error(
				error.message || "Unable to disable two-factor authentication.",
			);
			return;
		}

		reset();
		onOpenChange(false);
		toast.success("Two-factor authentication disabled.");
	}

	async function copyBackupCodes() {
		if (!enrollment) return;

		await navigator.clipboard.writeText(enrollment.backupCodes.join("\n"));

		setCopied(true);
		toast.success("Recovery codes copied.");

		window.setTimeout(() => setCopied(false), 2000);
	}

	const title = enabled
		? "Turn off two-factor authentication"
		: enrollment
			? "Connect your authenticator"
			: "Set up two-factor authentication";

	const description = enabled
		? "Enter your password to remove the additional verification step from your account."
		: enrollment
			? "Scan the QR code, save your recovery codes, then confirm setup with a six-digit code."
			: "Add an extra layer of protection to your Berean Study account.";

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-2xl sm:max-w-130">
				<div className="px-6 pt-6 pb-5 sm:px-7">
					<DialogHeader className="space-y-4 text-left">
						<DialogIcon variant={enabled ? "destructive" : "default"}>
							{enabled ? (
								<ShieldCheck className="size-5" />
							) : (
								<Smartphone className="size-5" />
							)}
						</DialogIcon>

						<div className="space-y-1.5">
							<DialogTitle className="font-serif text-2xl tracking-tight">
								{title}
							</DialogTitle>

							<DialogDescription className="max-w-md leading-6">
								{description}
							</DialogDescription>
						</div>
					</DialogHeader>
				</div>

				<DialogDivider />

				{enabled ? (
					<form onSubmit={disableTwoFactor}>
						<div className="space-y-5 px-6 py-6 sm:px-7">
							<PasswordField
								autoComplete="current-password"
								id={passwordId}
								label="Current password"
								onChange={setPassword}
								placeholder="Enter your current password"
								required
								value={password}
							/>

							<div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/6 p-4">
								<TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />

								<div className="space-y-1">
									<p className="font-medium text-destructive text-sm">
										Your account will be less protected
									</p>

									<p className="text-destructive/80 text-xs leading-5">
										You will no longer be asked for an authenticator code when
										signing in.
									</p>
								</div>
							</div>
						</div>

						<DialogDivider />

						<DialogFooter className="gap-2 bg-muted/20 px-6 py-4 sm:px-7">
							<Button
								disabled={isSubmitting}
								onClick={() => handleOpenChange(false)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>

							<Button
								disabled={isSubmitting || !password}
								type="submit"
								variant="destructive"
							>
								{isSubmitting ? "Turning off…" : "Turn off 2FA"}
							</Button>
						</DialogFooter>
					</form>
				) : enrollment ? (
					<form onSubmit={verifyEnrollment}>
						<div className="space-y-5 px-6 py-6 sm:px-7">
							<div className="space-y-3">
								<div>
									<p className="font-medium text-sm">1. Scan the QR code</p>
									<p className="mt-1 text-muted-foreground text-xs leading-5">
										Open your authenticator app and scan this code.
									</p>
								</div>

								<div className="mx-auto flex w-fit items-center justify-center rounded-2xl border bg-white p-4 shadow-sm">
									<QRCodeSVG className="size-45" value={enrollment.totpURI} />
								</div>
							</div>

							<div className="space-y-3">
								<div className="flex items-center justify-between gap-4">
									<div>
										<p className="font-medium text-sm">
											2. Save your recovery codes
										</p>
										<p className="mt-1 text-muted-foreground text-xs leading-5">
											Each code can be used once if you lose access to your
											authenticator.
										</p>
									</div>

									<Button
										className="shrink-0"
										onClick={() => void copyBackupCodes()}
										size="sm"
										type="button"
										variant="outline"
									>
										{copied ? (
											<Check className="mr-2 size-3.5" />
										) : (
											<Copy className="mr-2 size-3.5" />
										)}

										{copied ? "Copied" : "Copy"}
									</Button>
								</div>

								<div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border bg-muted/30 p-4 font-mono text-xs">
									{enrollment.backupCodes.map((backupCode) => (
										<code key={backupCode}>{backupCode}</code>
									))}
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor={codeId}>3. Enter the six-digit code</Label>

								<Input
									autoComplete="one-time-code"
									className="h-12 rounded-xl text-center font-medium text-lg tracking-[0.4em]"
									id={codeId}
									inputMode="numeric"
									maxLength={6}
									onChange={(event) =>
										setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
									}
									placeholder="000000"
									required
									value={code}
								/>
							</div>
						</div>

						<DialogDivider />

						<DialogFooter className="gap-2 bg-muted/20 px-6 py-4 sm:px-7">
							<Button
								disabled={isSubmitting}
								onClick={() => handleOpenChange(false)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>

							<Button
								disabled={isSubmitting || code.length !== 6}
								type="submit"
							>
								{isSubmitting ? "Verifying…" : "Verify and enable"}
							</Button>
						</DialogFooter>
					</form>
				) : (
					<form onSubmit={beginEnrollment}>
						<div className="space-y-5 px-6 py-6 sm:px-7">
							<div className="rounded-xl border bg-muted/30 p-4">
								<div className="flex items-start gap-3">
									<ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />

									<div>
										<p className="font-medium text-sm">Protect your account</p>

										<p className="mt-1 text-muted-foreground text-xs leading-5">
											You'll use an authenticator app such as 1Password, Authy,
											or Google Authenticator when signing in.
										</p>
									</div>
								</div>
							</div>

							<PasswordField
								autoComplete="current-password"
								id={passwordId}
								label="Current password"
								onChange={setPassword}
								placeholder="Enter your current password"
								required
								value={password}
							/>
						</div>

						<DialogDivider />

						<DialogFooter className="gap-2 bg-muted/20 px-6 py-4 sm:px-7">
							<Button
								disabled={isSubmitting}
								onClick={() => handleOpenChange(false)}
								type="button"
								variant="outline"
							>
								Cancel
							</Button>

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
