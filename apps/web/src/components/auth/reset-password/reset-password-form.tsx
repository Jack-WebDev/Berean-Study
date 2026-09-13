import { Button } from "@berean-study/ui/components/button";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { useFormDraft } from "../../form-drafts";
import {
	isWeakPassword,
	minimumPasswordLength,
	PasswordStrengthIndicator,
} from "../password-strength";

export default function ResetPasswordForm({ email }: { email: string }) {
	const navigate = useNavigate({ from: "/reset-password" });
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [otpVerified, setOtpVerified] = useState(false);
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
	const [draft, setDraft] = useFormDraft("auth.reset-password", {
		confirmPassword: "",
		otp: "",
		password: "",
	});
	const form = useForm({
		defaultValues: draft,
		onSubmit: async ({ value }) => {
			await authClient.emailOtp.resetPassword(
				{ email, otp: value.otp, password: value.password },
				{
					onSuccess: () => {
						toast.success("Your password has been reset. Sign in to continue.");
						navigate({ to: "/login" });
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z
				.object({
					otp: z
						.string()
						.regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
					password: z
						.string()
						.min(
							minimumPasswordLength,
							`Password must be at least ${minimumPasswordLength} characters`,
						),
					confirmPassword: z.string(),
				})
				.refine((value) => value.password === value.confirmPassword, {
					message: "Passwords must match",
					path: ["confirmPassword"],
				}),
		},
	});
	const verifyOtp = async () => {
		const otp = form.getFieldValue("otp");
		if (!/^\d{6}$/.test(otp)) {
			toast.error("Enter the 6-digit code from your email.");
			return;
		}

		setIsVerifyingOtp(true);
		const { error } = await authClient.$fetch(
			"/email-otp/check-verification-otp",
			{
				method: "POST",
				body: { email, otp, type: "forget-password" },
			},
		);
		setIsVerifyingOtp(false);
		if (error) {
			setOtpVerified(false);
			toast.error(error.message || "That code is invalid or has expired.");
			return;
		}
		setOtpVerified(true);
		toast.success("Code verified. You can now choose a new password.");
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="mt-9 flex flex-col gap-5"
		>
			<form.Field name="otp">
				{(field) => (
					<CodeField
						field={field}
						isVerifying={isVerifyingOtp}
						onChange={(otp) => {
							setOtpVerified(false);
							setDraft((current) => ({ ...current, otp }));
						}}
						onVerify={verifyOtp}
						verified={otpVerified}
					/>
				)}
			</form.Field>
			<form.Field name="password">
				{(field) => (
					<PasswordField
						field={field}
						label="New password"
						placeholder="Create a new password"
						showStrength
						disabled={!otpVerified}
						visible={showPassword}
						onToggle={() => setShowPassword((value) => !value)}
						onValueChange={(password) =>
							setDraft((current) => ({ ...current, password }))
						}
					/>
				)}
			</form.Field>
			<form.Field name="confirmPassword">
				{(field) => (
					<PasswordField
						field={field}
						label="Confirm new password"
						placeholder="Confirm your new password"
						disabled={!otpVerified}
						visible={showConfirmation}
						onToggle={() => setShowConfirmation((value) => !value)}
						onValueChange={(confirmPassword) =>
							setDraft((current) => ({ ...current, confirmPassword }))
						}
					/>
				)}
			</form.Field>
			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting,
					password: state.values.password,
				})}
			>
				{({ canSubmit, isSubmitting, password }) => (
					<Button
						type="submit"
						disabled={
							!canSubmit ||
							isSubmitting ||
							!otpVerified ||
							isWeakPassword(password)
						}
						className="mt-1 h-12 w-full rounded-xl font-medium text-sm shadow-none"
					>
						{isSubmitting ? "Resetting password..." : "Reset password"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

type Field = {
	handleBlur: () => void;
	handleChange: (value: string) => void;
	name: string;
	state: {
		meta: { errors: Array<{ message?: string } | undefined> };
		value: string;
	};
};

function CodeField({
	field,
	isVerifying,
	onChange,
	onVerify,
	verified,
}: {
	field: Field;
	isVerifying: boolean;
	onChange: (otp: string) => void;
	onVerify: () => void;
	verified: boolean;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={field.name} className="font-medium text-sm">
				Verification code
			</Label>
			<div className="flex gap-2">
				<Input
					id={field.name}
					name={field.name}
					type="text"
					inputMode="numeric"
					autoComplete="one-time-code"
					placeholder="Enter the 6-digit code"
					maxLength={6}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => {
						const otp = event.target.value.replace(/\D/g, "");
						onChange(otp);
						field.handleChange(otp);
					}}
					className="h-12 rounded-xl bg-background px-4 text-[15px] shadow-none"
				/>
				<Button
					type="button"
					onClick={onVerify}
					disabled={isVerifying || verified}
					className="h-12 rounded-xl px-4 text-sm shadow-none"
				>
					{verified ? "Verified" : isVerifying ? "Verifying..." : "Verify"}
				</Button>
			</div>
			{field.state.meta.errors[0]?.message ? (
				<p role="alert" className="text-destructive text-xs leading-5">
					{field.state.meta.errors[0].message}
				</p>
			) : null}
		</div>
	);
}

function PasswordField({
	field,
	label,
	showStrength = false,
	disabled,
	onToggle,
	onValueChange,
	placeholder,
	visible,
}: {
	field: Field;
	disabled: boolean;
	label: string;
	showStrength?: boolean;
	onToggle: () => void;
	onValueChange: (value: string) => void;
	placeholder: string;
	visible: boolean;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={field.name} className="font-medium text-sm">
				{label}
			</Label>
			<div className="relative">
				<Input
					id={field.name}
					name={field.name}
					type={visible ? "text" : "password"}
					disabled={disabled}
					autoComplete="new-password"
					placeholder={placeholder}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => {
						const value = event.target.value;
						field.handleChange(value);
						onValueChange(value);
					}}
					className="h-12 rounded-xl bg-background px-4 pr-12 text-[15px] shadow-none"
				/>
				<button
					type="button"
					disabled={disabled}
					aria-label={visible ? "Hide password" : "Show password"}
					onClick={onToggle}
					className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
				>
					{visible ? (
						<EyeOffIcon aria-hidden="true" className="size-4.5" />
					) : (
						<EyeIcon aria-hidden="true" className="size-4.5" />
					)}
				</button>
			</div>
			{showStrength ? (
				<PasswordStrengthIndicator password={field.state.value} />
			) : null}
			{field.state.meta.errors[0]?.message ? (
				<p role="alert" className="text-destructive text-xs leading-5">
					{field.state.meta.errors[0].message}
				</p>
			) : null}
		</div>
	);
}
