import { Button } from "@berean-study/ui/components/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, HelpCircle, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { useFormDraft } from "../../form-drafts";

const CODE_LENGTH = 6;

export function VerifyEmailPage({ email }: { email: string }) {
	const navigate = useNavigate({ from: "/verify-email" });
	const [draft, setDraft] = useFormDraft("auth.verify-email", { code: "" });
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isResending, setIsResending] = useState(false);

	const code = draft.code;
	const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

	useEffect(() => {
		inputRefs.current[0]?.focus();
	}, []);

	function updateCode(index: number, value: string) {
		const digit = value.replace(/\D/g, "").slice(-1);
		const nextCode = code.padEnd(CODE_LENGTH, " ").split("");

		nextCode[index] = digit || " ";

		setDraft({
			code: nextCode.join("").trimEnd(),
		});

		if (digit && index < CODE_LENGTH - 1) {
			inputRefs.current[index + 1]?.focus();
		}
	}

	function handleKeyDown(
		index: number,
		event: React.KeyboardEvent<HTMLInputElement>,
	) {
		if (event.key !== "Backspace") return;

		if (code[index]) {
			updateCode(index, "");
			return;
		}

		if (index > 0) {
			inputRefs.current[index - 1]?.focus();
		}
	}

	function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
		event.preventDefault();

		const pastedCode = event.clipboardData
			.getData("text")
			.replace(/\D/g, "")
			.slice(0, CODE_LENGTH);

		if (!pastedCode) return;

		setDraft({ code: pastedCode });

		const nextIndex = Math.min(pastedCode.length, CODE_LENGTH - 1);
		inputRefs.current[nextIndex]?.focus();
	}

	async function verifyEmail(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isSubmitting || !email || code.length !== CODE_LENGTH) return;

		setIsSubmitting(true);

		const { error } = await authClient.emailOtp.verifyEmail({
			email,
			otp: code,
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
		<main className="relative min-h-svh overflow-hidden bg-background">
			<div className="pointer-events-none absolute inset-0">
				<img
					alt=""
					className="size-full object-cover object-center"
					src="/verify-bg.png"
				/>
				<div className="absolute inset-0 bg-linear-to-r from-background/60 via-background/15 to-background/45" />
			</div>

			<header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-12 sm:py-7 lg:px-20">
				<div className="flex items-center gap-4">
					<img
						alt="Berean Study"
						className="h-10 w-auto object-contain sm:h-14"
						src="/logo.png"
					/>
				</div>

				<button
					aria-label="Get help"
					className="flex items-center gap-2 font-medium text-[0.95rem] text-foreground transition-opacity hover:opacity-70"
					type="button"
				>
					<HelpCircle className="size-5" />
					<span className="hidden sm:inline">Help</span>
				</button>
			</header>

			<div className="relative z-10 mx-auto grid min-h-svh w-full max-w-370 items-center gap-16 px-3 py-20 sm:px-6 sm:pt-28 sm:pb-10 lg:min-h-screen lg:grid-cols-[1fr_340px] lg:px-12 xl:gap-28">
				<section className="mx-auto w-full max-w-152.5 rounded-2xl border border-border/60 bg-card/95 px-4 py-6 shadow-xl backdrop-blur-sm sm:rounded-[22px] sm:px-16 sm:py-11">
					<div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 sm:size-28">
						<Mail
							className="size-9 stroke-[1.7] text-primary sm:size-12"
							aria-hidden="true"
						/>
					</div>

					<div className="mt-5 text-center sm:mt-6">
						<h1 className="font-serif text-3xl text-foreground leading-[1.02] tracking-[-0.04em] sm:text-[2.7rem]">
							Verify your email
						</h1>

						<p className="mt-4 text-muted-foreground text-sm leading-6 sm:mt-5 sm:text-[1.04rem] sm:leading-7">
							We've sent a six-digit verification code to
							<br className="hidden sm:block" />
							<strong className="font-semibold text-foreground">
								{email || "your email address"}.
							</strong>
						</p>

						<p className="mx-auto mt-4 max-w-97.5 text-muted-foreground text-sm leading-6 sm:mt-5 sm:text-[1rem] sm:leading-7">
							Enter the code below to verify your account
							<br className="hidden sm:block" /> and get started with Berean
							Study.
						</p>
					</div>

					<form className="mt-6 sm:mt-7" onSubmit={verifyEmail}>
						<div className="flex justify-center gap-1.5 sm:gap-3">
							{Array.from({ length: CODE_LENGTH }).map((_, index) => (
								<input
									aria-label={`Verification code digit ${index + 1}`}
									autoComplete={index === 0 ? "one-time-code" : "off"}
									className="h-12 w-10 rounded-lg border border-input bg-background text-center font-medium text-foreground text-xl outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-4 focus:ring-ring/20 sm:h-17 sm:w-17 sm:rounded-[11px] sm:text-2xl"
									inputMode="numeric"
									key={index}
									maxLength={1}
									onChange={(event) => updateCode(index, event.target.value)}
									onKeyDown={(event) => handleKeyDown(index, event)}
									onPaste={handlePaste}
									ref={(element) => {
										inputRefs.current[index] = element;
									}}
									value={code[index] ?? ""}
								/>
							))}
						</div>

						<Button
							className="mt-5 h-12 w-full rounded-xl font-medium text-sm shadow-none sm:mt-6 sm:h-15 sm:rounded-[13px] sm:text-base"
							disabled={isSubmitting || !email || code.length !== CODE_LENGTH}
							type="submit"
						>
							{isSubmitting ? (
								"Verifying..."
							) : (
								<>
									Verify email
									<ArrowRight className="ml-2 size-5" />
								</>
							)}
						</Button>
					</form>

					<div className="my-6 flex items-center gap-3 sm:my-7 sm:gap-4">
						<div className="h-px flex-1 bg-border" />
						<span className="text-muted-foreground text-sm uppercase tracking-[0.08em]">
							or
						</span>
						<div className="h-px flex-1 bg-border" />
					</div>

					<div className="text-center text-muted-foreground text-sm sm:text-[0.98rem]">
						Didn't receive the code?{" "}
						<button
							className="font-medium text-primary transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isResending || !email}
							onClick={resendCode}
							type="button"
						>
							{isResending ? "Sending..." : "Resend code"}
						</button>
					</div>

					<Link
						className="mx-auto mt-6 flex w-fit items-center gap-2 font-medium text-primary text-sm transition-opacity hover:opacity-70 sm:mt-8"
						to="/login"
					>
						<ArrowLeft className="size-4" />
						Back to sign in
					</Link>
				</section>

				<aside className="hidden self-center text-center lg:block">
					<blockquote className="font-serif text-[1.7rem] text-foreground/75 italic leading-[1.45] tracking-[-0.02em]">
						“Test everything;
						<br />
						hold fast what is good.”
					</blockquote>

					<div className="mx-auto mt-7 h-px w-14 bg-border" />

					<p className="mt-6 font-medium text-[0.78rem] text-muted-foreground tracking-[0.34em]">
						1 THESSALONIANS 5:21
					</p>
				</aside>
			</div>
		</main>
	);
}
