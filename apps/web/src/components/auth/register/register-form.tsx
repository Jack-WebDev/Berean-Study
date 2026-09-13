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
export default function RegisterForm() {
	const navigate = useNavigate({ from: "/" });
	const [showPassword, setShowPassword] = useState(false);
	const form = useForm({
		defaultValues: { email: "", name: "", password: "" },
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{ email: value.email, name: value.name, password: value.password },
				{
					onSuccess: () => {
						navigate({ to: "/verify-email", search: { email: value.email } });
						toast.success("Check your email for a verification code.");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
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
			className="mt-8 flex flex-col gap-5"
		>
			<form.Field name="name">
				{(field) => (
					<Field
						label="Name"
						id={field.name}
						error={field.state.meta.errors[0]?.message}
					>
						<Input
							id={field.name}
							name={field.name}
							autoComplete="name"
							placeholder="Your name"
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							className="h-12 rounded-xl bg-background px-4 text-[15px] shadow-none"
						/>
					</Field>
				)}
			</form.Field>
			<form.Field name="email">
				{(field) => (
					<Field
						label="Email"
						id={field.name}
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
					</Field>
				)}
			</form.Field>
			<form.Field name="password">
				{(field) => (
					<Field
						label="Password"
						id={field.name}
						error={field.state.meta.errors[0]?.message}
					>
						<div className="relative">
							<Input
								id={field.name}
								name={field.name}
								type={showPassword ? "text" : "password"}
								autoComplete="new-password"
								placeholder="Create a password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								className="h-12 rounded-xl bg-background px-4 pr-12 text-[15px] shadow-none"
							/>
							<button
								type="button"
								aria-label={showPassword ? "Hide password" : "Show password"}
								onClick={() => setShowPassword((current) => !current)}
								className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
							>
								{showPassword ? (
									<EyeOffIcon aria-hidden="true" className="size-[18px]" />
								) : (
									<EyeIcon aria-hidden="true" className="size-[18px]" />
								)}
							</button>
						</div>
					</Field>
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
						{isSubmitting ? "Creating account..." : "Create account"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
function Field({
	children,
	error,
	id,
	label,
}: {
	children: React.ReactNode;
	error?: string;
	id: string;
	label: string;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={id} className="font-medium text-sm">
				{label}
			</Label>
			{children}
			{error ? (
				<p role="alert" className="text-destructive text-xs leading-5">
					{error}
				</p>
			) : null}
		</div>
	);
}
