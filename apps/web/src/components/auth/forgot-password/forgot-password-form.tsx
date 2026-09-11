import { Button } from "@berean-study/ui/components/button";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordForm() {
	const navigate = useNavigate({ from: "/forgot-password" });
	const form = useForm({
		defaultValues: { email: "" },
		onSubmit: async ({ value }) => {
			await authClient.emailOtp.requestPasswordReset(
				{
					email: value.email,
				},
				{
					onSuccess: () => {
						toast.success(
							"If an account exists for that email, a reset code is on its way.",
						);
						navigate({ to: "/reset-password", search: { email: value.email } });
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({ email: z.email("Enter a valid email address") }),
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
			<form.Field name="email">
				{(field) => (
					<div className="flex flex-col gap-2">
						<Label htmlFor={field.name} className="font-medium text-sm">
							Email
						</Label>
						<Input
							id={field.name}
							name={field.name}
							type="email"
							autoComplete="email"
							placeholder="you@example.com"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							className="h-12 rounded-xl bg-background px-4 text-[15px] shadow-none"
						/>
						{field.state.meta.errors[0]?.message ? (
							<p role="alert" className="text-destructive text-xs leading-5">
								{field.state.meta.errors[0].message}
							</p>
						) : null}
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
						disabled={!canSubmit || isSubmitting}
						className="mt-1 h-12 w-full rounded-xl font-medium text-sm shadow-none"
					>
						{isSubmitting ? "Sending code..." : "Email reset code"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
