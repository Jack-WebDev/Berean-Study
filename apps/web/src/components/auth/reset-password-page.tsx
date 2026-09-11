import { Button } from "@berean-study/ui/components/button";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

type ResetPasswordPageProps = {
	error?: string;
	token?: string;
};

export default function ResetPasswordPage({
	error,
	token,
}: ResetPasswordPageProps) {
	const navigate = useNavigate({ from: "/reset-password" });
	const form = useForm({
		defaultValues: { password: "", confirmPassword: "" },
		onSubmit: async ({ value }) => {
			if (!token) {
				return;
			}

			await authClient.resetPassword(
				{ newPassword: value.password, token },
				{
					onSuccess: () => {
						toast.success("Your password has been reset. Sign in to continue.");
						navigate({ to: "/login" });
					},
					onError: (resetError) => {
						toast.error(
							resetError.error.message || resetError.error.statusText,
						);
					},
				},
			);
		},
		validators: {
			onSubmit: z
				.object({
					confirmPassword: z.string(),
					password: z.string().min(8, "Password must be at least 8 characters"),
				})
				.refine((value) => value.password === value.confirmPassword, {
					message: "Passwords must match",
					path: ["confirmPassword"],
				}),
		},
	});

	if (!token) {
		return (
			<div className="mx-auto mt-10 w-full max-w-md p-6 text-center">
				<h1 className="font-bold text-3xl">Reset link unavailable</h1>
				<p className="mt-2 text-muted-foreground text-sm">
					{error === "INVALID_TOKEN"
						? "This reset link is invalid or has expired."
						: "Use the link in your password reset email to choose a new password."}
				</p>
				<Link
					to="/forgot-password"
					className="mt-6 inline-block text-indigo-600 text-sm hover:text-indigo-800"
				>
					Request a new link
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="text-center font-bold text-3xl">Choose a new password</h1>

			<form
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="mt-6 space-y-4"
			>
				<form.Field name="password">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>New password</Label>
							<Input
								id={field.name}
								name={field.name}
								type="password"
								autoComplete="new-password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
							{field.state.meta.errors.map((fieldError) => (
								<p key={fieldError?.message} className="text-red-500">
									{fieldError?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="confirmPassword">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Confirm new password</Label>
							<Input
								id={field.name}
								name={field.name}
								type="password"
								autoComplete="new-password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
							/>
							{field.state.meta.errors.map((fieldError) => (
								<p key={fieldError?.message} className="text-red-500">
									{fieldError?.message}
								</p>
							))}
						</div>
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
							className="w-full"
							disabled={!canSubmit || isSubmitting}
						>
							{isSubmitting ? "Resetting..." : "Reset password"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
