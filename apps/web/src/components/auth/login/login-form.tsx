import { Button } from "@berean-study/ui/components/button";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
	const navigate = useNavigate({ from: "/" });
	const [showPassword, setShowPassword] = useState(false);
	const form = useForm({
		defaultValues: { email: "", password: "" },
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{ email: value.email, password: value.password },
				{
					onSuccess: () => {
						navigate({ to: "/dashboard" });
						toast.success("Sign in successful");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Enter a valid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
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
			<form.Field name="email">
				{(field) => (
					<FormField
						label="Email"
						inputId={field.name}
						error={field.state.meta.errors[0]?.message}
					>
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
					</FormField>
				)}
			</form.Field>

			<form.Field name="password">
				{(field) => (
					<FormField
						label="Password"
						inputId={field.name}
						error={field.state.meta.errors[0]?.message}
						action={
							<Link
								to="/forgot-password"
								className="font-medium text-primary text-xs transition-colors hover:text-primary/80"
							>
								Forgot password?
							</Link>
						}
					>
						<div className="relative">
							<Input
								id={field.name}
								name={field.name}
								type={showPassword ? "text" : "password"}
								autoComplete="current-password"
								placeholder="Enter your password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								className="h-12 rounded-xl bg-background px-4 pr-12 text-[15px] shadow-none"
							/>

							<button
								type="button"
								aria-label={showPassword ? "Hide password" : "Show password"}
								onClick={() => setShowPassword((current) => !current)}
								className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
							>
								{showPassword ? (
									<EyeOffIcon
										aria-hidden="true"
										className="size-4.5"
										strokeWidth={1.6}
									/>
								) : (
									<EyeIcon
										aria-hidden="true"
										className="size-4.5"
										strokeWidth={1.6}
									/>
								)}
							</button>
						</div>
					</FormField>
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
						{isSubmitting ? "Signing in..." : "Sign in"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}

function FormField({
	action,
	children,
	error,
	inputId,
	label,
}: {
	action?: ReactNode;
	children: ReactNode;
	error?: string;
	inputId: string;
	label: string;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex min-h-5 items-center justify-between gap-4">
				<Label htmlFor={inputId} className="font-medium text-sm">
					{label}
				</Label>
				{action}
			</div>

			{children}

			{error ? (
				<p role="alert" className="text-destructive text-xs leading-5">
					{error}
				</p>
			) : null}
		</div>
	);
}
