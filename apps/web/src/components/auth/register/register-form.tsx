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

const minimumNameLength = 5;
const emailSchema = z.email("Enter a valid email address");
const registrationSchema = z
	.object({
		name: z
			.string()
			.min(
				minimumNameLength,
				`Name must be at least ${minimumNameLength} characters`,
			),
		email: emailSchema,
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
	});

export default function RegisterForm() {
	const navigate = useNavigate({ from: "/" });
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [draft, setDraft] = useFormDraft("auth.register", {
		confirmPassword: "",
		email: "",
		name: "",
		password: "",
	});
	const form = useForm({
		defaultValues: draft,
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
			onSubmit: registrationSchema,
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
							onChange={(event) => {
								const name = event.target.value;
								field.handleChange(name);
								setDraft((current) => ({ ...current, name }));
							}}
							className="h-12 rounded-xl bg-background px-4 text-[15px] shadow-none"
						/>
					</Field>
				)}
			</form.Field>
			<form.Field name="email">
				{(field) => (
					<form.Subscribe selector={(state) => state.values.name}>
						{(name) => (
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
									disabled={name.length < minimumNameLength}
									placeholder="you@example.com"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => {
										const email = event.target.value;
										field.handleChange(email);
										setDraft((current) => ({ ...current, email }));
									}}
									className="h-12 rounded-xl bg-background px-4 text-[15px] shadow-none"
								/>
							</Field>
						)}
					</form.Subscribe>
				)}
			</form.Field>
			<form.Field name="password">
				{(field) => (
					<form.Subscribe
						selector={(state) => ({
							email: state.values.email,
							name: state.values.name,
						})}
					>
						{({ email, name }) => (
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
										disabled={
											name.length < minimumNameLength ||
											!emailSchema.safeParse(email).success
										}
										placeholder="Create a password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => {
											const password = event.target.value;
											field.handleChange(password);
											setDraft((current) => ({ ...current, password }));
										}}
										className="h-12 rounded-xl bg-background px-4 pr-12 text-[15px] shadow-none"
									/>
									<button
										type="button"
										disabled={
											name.length < minimumNameLength ||
											!emailSchema.safeParse(email).success
										}
										aria-label={
											showPassword ? "Hide password" : "Show password"
										}
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
								<PasswordStrengthIndicator password={field.state.value} />
							</Field>
						)}
					</form.Subscribe>
				)}
			</form.Field>
			<form.Field name="confirmPassword">
				{(field) => (
					<form.Subscribe
						selector={(state) => ({
							email: state.values.email,
							name: state.values.name,
							password: state.values.password,
						})}
					>
						{({ email, name, password }) => (
							<Field
								label="Confirm password"
								id={field.name}
								error={field.state.meta.errors[0]?.message}
							>
								<div className="relative">
									<Input
										id={field.name}
										name={field.name}
										type={showConfirmation ? "text" : "password"}
										autoComplete="new-password"
										placeholder="Confirm your password"
										disabled={
											name.length < minimumNameLength ||
											!emailSchema.safeParse(email).success ||
											isWeakPassword(password)
										}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => {
											const confirmPassword = event.target.value;
											field.handleChange(confirmPassword);
											setDraft((current) => ({ ...current, confirmPassword }));
										}}
										className="h-12 rounded-xl bg-background px-4 pr-12 text-[15px] shadow-none"
									/>
									<button
										type="button"
										disabled={
											name.length < minimumNameLength ||
											!emailSchema.safeParse(email).success ||
											isWeakPassword(password)
										}
										aria-label={
											showConfirmation
												? "Hide confirmation"
												: "Show confirmation"
										}
										onClick={() => setShowConfirmation((current) => !current)}
										className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground"
									>
										{showConfirmation ? (
											<EyeOffIcon aria-hidden="true" className="size-[18px]" />
										) : (
											<EyeIcon aria-hidden="true" className="size-[18px]" />
										)}
									</button>
								</div>
							</Field>
						)}
					</form.Subscribe>
				)}
			</form.Field>
			<form.Subscribe
				selector={(state) => ({
					isSubmitting: state.isSubmitting,
					values: state.values,
				})}
			>
				{({ isSubmitting, values }) => (
					<Button
						type="submit"
						disabled={
							!registrationSchema.safeParse(values).success ||
							isSubmitting ||
							isWeakPassword(values.password)
						}
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
