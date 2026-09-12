import { Button } from "@berean-study/ui/components/button";
import { Input } from "@berean-study/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/two-factor")({
	component: TwoFactorVerificationPage,
});

function TwoFactorVerificationPage() {
	const [code, setCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);

	async function verify(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsVerifying(true);
		const { error } = await authClient.twoFactor.verifyTotp({
			code,
			trustDevice: true,
		});
		setIsVerifying(false);
		if (error) {
			toast.error(error.message || "That verification code is invalid.");
			return;
		}
		window.location.assign("/home");
	}

	return (
		<main className="grid min-h-dvh place-items-center bg-background px-4">
			<form
				className="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-border/60 bg-card p-6 shadow-sm"
				onSubmit={verify}
			>
				<div>
					<h1 className="font-serif text-2xl tracking-[-0.02em]">
						Verify your identity
					</h1>
					<p className="mt-2 text-muted-foreground text-sm leading-6">
						Enter the 6-digit code from your authenticator app.
					</p>
				</div>
				<Input
					autoComplete="one-time-code"
					className="h-11 rounded-lg text-center text-base tracking-[0.4em]"
					inputMode="numeric"
					maxLength={6}
					onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
					placeholder="000000"
					required
					value={code}
				/>
				<Button disabled={isVerifying || code.length !== 6} type="submit">
					{isVerifying ? "Verifying…" : "Continue"}
				</Button>
			</form>
		</main>
	);
}
