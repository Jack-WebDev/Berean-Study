import { Link } from "@tanstack/react-router";

import ForgotPasswordForm from "./forgot-password-form";
import ForgotPasswordVisual from "./forgot-password-visual";

export default function ForgotPasswordPage() {
	return (
		<div className="min-h-[calc(100svh-3.5rem)] bg-background md:min-h-[calc(100svh-4rem)]">
			<div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-7xl items-stretch md:min-h-[calc(100svh-4rem)] md:px-8 md:py-10 lg:px-12 lg:py-12">
				<div className="grid w-full overflow-hidden md:grid-cols-[0.95fr_1.05fr] md:rounded-[2rem] md:border md:bg-card md:shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
					<ForgotPasswordVisual />
					<section className="flex min-h-full items-center justify-center px-5 py-10 sm:px-8 md:px-10 md:py-14 lg:px-16">
						<div className="w-full max-w-md">
							<Brand />
							<div className="text-center">
								<h1 className="text-balance font-serif text-[2.25rem] leading-[1] tracking-[-0.04em] md:text-[2.55rem]">
									Forgot your password?
								</h1>
								<p className="mx-auto mt-3 max-w-sm text-[15px] text-muted-foreground leading-6">
									Enter your email and we’ll send you a one-time code to reset
									your password.
								</p>
							</div>
							<ForgotPasswordForm />
							<div className="mt-7 border-t pt-6 text-center text-muted-foreground text-sm">
								Remember your password?{" "}
								<Link
									to="/login"
									className="font-medium text-foreground transition-colors hover:text-primary"
								>
									Sign in
								</Link>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

function Brand() {
	return (
		<div className="mb-8 flex justify-center md:mb-9">
			<Link
				to="/"
				aria-label="Berean Study home"
				className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			>
				<img
					src="/logo.png"
					alt="Berean Study"
					width={2172}
					height={724}
					className="h-9 w-auto mix-blend-multiply md:h-10"
				/>
			</Link>
		</div>
	);
}
