import { Button } from "@berean-study/ui/components/button";
import { Input } from "@berean-study/ui/components/input";
import { Label } from "@berean-study/ui/components/label";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function VerifyEmailPage({ email }: { email: string }) {
	const navigate = useNavigate({ from: "/verify-email" });
	const [code, setCode] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isResending, setIsResending] = useState(false);

	async function verifyEmail(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (isSubmitting || !email || code.trim().length !== 6) return;

		setIsSubmitting(true);
		const { error } = await authClient.emailOtp.verifyEmail({
			email,
			otp: code.trim(),
		});
		setIsSubmitting(false);

		if (error) {
			toast.error(
				error.message || "That verification code is invalid or expired.",
			);
			return;
		}

		toast.success("Your email has been verified.");
		navigate({ to: "/home" });
	}

	async function resendCode() {
		if (isResending || !email) return;

		setIsResending(true);
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "email-verification",
		});
		setIsResending(false);

		if (error) {
			toast.error(error.message || "Unable to resend the verification code.");
			return;
		}

		toast.success("A new verification code has been sent.");
	}

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
			<section className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
				<h1 className="font-serif text-3xl tracking-tight">
					Verify your email
				</h1>
				<p className="mt-3 text-muted-foreground text-sm leading-6">
					We sent a six-digit verification code to{" "}
					<strong>{email || "your email address"}</strong>.
				</p>
				<form className="mt-6 space-y-5" onSubmit={verifyEmail}>
					<div className="space-y-2">
						<Label htmlFor="verification-code">Verification code</Label>
						<Input
							autoComplete="one-time-code"
							id="verification-code"
							inputMode="numeric"
							maxLength={6}
							onChange={(event) =>
								setCode(event.target.value.replace(/\D/g, ""))
							}
							value={code}
						/>
					</div>
					<Button
						className="w-full"
						disabled={isSubmitting || !email}
						type="submit"
					>
						{isSubmitting ? "Verifying..." : "Verify email"}
					</Button>
				</form>
				<div className="mt-5 text-center text-muted-foreground text-sm">
					Didn’t receive it?{" "}
					<button
						className="font-medium text-primary hover:underline"
						disabled={isResending || !email}
						onClick={resendCode}
						type="button"
					>
						{isResending ? "Sending..." : "Resend code"}
					</button>
				</div>
				<Link
					className="mt-6 block text-center text-muted-foreground text-sm hover:underline"
					to="/login"
				>
					Back to sign in
				</Link>
			</section>
		</main>
	);
}
