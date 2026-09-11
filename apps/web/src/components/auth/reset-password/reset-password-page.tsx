import { Button } from "@berean-study/ui/components/button";
import { Link } from "@tanstack/react-router";
import { KeyRoundIcon } from "lucide-react";
import ResetPasswordForm from "./reset-password-form";
import ResetPasswordVisual from "./reset-password-visual";

type Props = { error?: string; token?: string };
export default function ResetPasswordPage({ error, token }: Props) {
	if (!token) return <UnavailableResetLink error={error} />;
	return (
		<div className="min-h-[calc(100svh-3.5rem)] bg-background md:min-h-[calc(100svh-4rem)]">
			<div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-7xl items-stretch md:min-h-[calc(100svh-4rem)] md:px-8 md:py-10 lg:px-12 lg:py-12">
				<div className="grid w-full overflow-hidden md:grid-cols-[0.95fr_1.05fr] md:rounded-[2rem] md:border md:bg-card md:shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
					<ResetPasswordVisual />
					<section className="flex min-h-full items-center justify-center px-5 py-10 sm:px-8 md:px-10 md:py-14 lg:px-16">
						<div className="w-full max-w-md">
							<div className="mb-8 flex justify-center md:mb-9">
								<Link to="/" aria-label="Berean Study home">
									<img
										src="/logo.png"
										alt="Berean Study"
										width={2172}
										height={724}
										className="h-9 w-auto mix-blend-multiply md:h-10"
									/>
								</Link>
							</div>
							<div className="text-center">
								<h1 className="text-balance font-serif text-[2.25rem] leading-[1] tracking-[-0.04em] md:text-[2.55rem]">
									Choose a new password.
								</h1>
								<p className="mt-3 text-[15px] text-muted-foreground leading-6">
									Create a secure password for your account.
								</p>
							</div>
							<ResetPasswordForm token={token} />
							<div className="mt-7 border-t pt-6 text-center">
								<Link
									to="/login"
									className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
								>
									Back to sign in
								</Link>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
function UnavailableResetLink({ error }: { error?: string }) {
	const isInvalid = error === "INVALID_TOKEN";
	return (
		<div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center bg-background px-5 py-10 md:min-h-[calc(100svh-4rem)]">
			<div className="w-full max-w-md text-center">
				<Link to="/" aria-label="Berean Study home">
					<img
						src="/logo.png"
						alt="Berean Study"
						width={2172}
						height={724}
						className="h-9 w-auto mix-blend-multiply"
					/>
				</Link>
				<div className="mx-auto mt-12 grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
					<KeyRoundIcon
						aria-hidden="true"
						className="size-6"
						strokeWidth={1.5}
					/>
				</div>
				<h1 className="mt-6 text-balance font-serif text-[2.25rem] leading-[1] tracking-[-0.04em]">
					Reset link unavailable.
				</h1>
				<p className="mx-auto mt-4 max-w-sm text-[15px] text-muted-foreground leading-6">
					{isInvalid
						? "This password reset link is invalid or has expired. Request a new link to continue."
						: "Use the link in your password reset email to choose a new password."}
				</p>
				<Button
					render={<Link to="/forgot-password" />}
					className="mt-8 h-12 w-full rounded-xl font-medium text-sm shadow-none"
				>
					Request a new link
				</Button>
				<Link
					to="/login"
					className="mt-5 inline-flex min-h-11 items-center font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					Back to sign in
				</Link>
			</div>
		</div>
	);
}
