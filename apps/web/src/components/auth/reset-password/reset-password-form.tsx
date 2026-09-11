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
export default function ResetPasswordForm({ token }: { token: string }) {
	const navigate = useNavigate({ from: "/reset-password" });
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const form = useForm({
		defaultValues: { password: "", confirmPassword: "" },
		onSubmit: async ({ value }) => {
			await authClient.resetPassword(
				{ newPassword: value.password, token },
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
					password: z.string().min(8, "Password must be at least 8 characters"),
					confirmPassword: z.string(),
				})
				.refine((value) => value.password === value.confirmPassword, {
					message: "Passwords must match",
					path: ["confirmPassword"],
				}),
		},
	});
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
			className="mt-9 flex flex-col gap-5"
		>
			<form.Field name="password">
				{(field) => (
					<PasswordField
						field={field}
						label="New password"
						placeholder="Create a new password"
						visible={showPassword}
						onToggle={() => setShowPassword((value) => !value)}
					/>
				)}
			</form.Field>
			<form.Field name="confirmPassword">
				{(field) => (
					<PasswordField
						field={field}
						label="Confirm new password"
						placeholder="Confirm your new password"
						visible={showConfirmation}
						onToggle={() => setShowConfirmation((value) => !value)}
					/>
				)}
			</form.Field>
			<form.Subscribe
				selector={(state) => ({
					canSubmit: state.canSubmit,
					isSubmitting: state.isSubmitting,
				})}
			>
				{({ canSubmit, isSubmitting }) => (
					<Button
						type="submit"
						disabled={!canSubmit || isSubmitting}
						className="mt-1 h-12 w-full rounded-xl font-medium text-sm shadow-none"
					>
						{isSubmitting ? "Resetting password..." : "Reset password"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
function PasswordField({
	field,
	label,
	onToggle,
	placeholder,
	visible,
}: {
	field: {
		handleBlur: () => void;
		handleChange: (value: string) => void;
		name: string;
		state: {
			meta: { errors: Array<{ message?: string } | undefined> };
			value: string;
		};
	};
	label: string;
	onToggle: () => void;
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
					autoComplete="new-password"
					placeholder={placeholder}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					className="h-12 rounded-xl bg-background px-4 pr-12 text-[15px] shadow-none"
				/>
				<button
					type="button"
					aria-label={visible ? "Hide password" : "Show password"}
					onClick={onToggle}
					className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
				>
					{visible ? (
						<EyeOffIcon aria-hidden="true" className="size-[18px]" />
					) : (
						<EyeIcon aria-hidden="true" className="size-[18px]" />
					)}
				</button>
			</div>
			{field.state.meta.errors[0]?.message ? (
				<p role="alert" className="text-destructive text-xs leading-5">
					{field.state.meta.errors[0].message}
				</p>
			) : null}
		</div>
	);
}
