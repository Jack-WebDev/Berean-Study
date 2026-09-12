import { Link } from "@tanstack/react-router";
import ResetPasswordForm from "./reset-password-form";
import ResetPasswordVisual from "./reset-password-visual";

type Props = { email?: string };

export default function ResetPasswordPage({ email }: Props) {
	if (!email) return <UnavailableResetCode />;
	return (
		<div className="bg-background">
			<div className="grid h-screen w-full overflow-auto md:grid-cols-[0.95fr_1.05fr]">
				<ResetPasswordVisual />
				<section className="flex min-h-full items-center justify-center px-5 py-10 sm:px-8 md:px-10 md:py-14 lg:px-16">
					<div className="w-full max-w-lg">
						<div className="mb-8 flex justify-center md:mb-9">
							<Link to="/" aria-label="Berean Study home">
								<img
									src="/logo.png"
									alt="Berean Study"
									className="mx-auto h-auto w-1/2 mix-blend-multiply dark:hidden"
								/>
								<img
									src="/logo-dark.png"
									alt=""
									aria-hidden="true"
									className="mx-auto hidden h-auto w-1/2 dark:block"
								/>
							</Link>
						</div>
						<div className="text-center">
							<h1 className="text-balance font-serif text-[2.25rem] leading-none tracking-[-0.04em]">
								Choose a new password.
							</h1>
							<p className="mt-3 text-[15px] text-muted-foreground leading-6">
								Enter the code we emailed to you, then create a secure password.
							</p>
						</div>
						<ResetPasswordForm email={email} />
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
	);
}

function UnavailableResetCode() {
	return (
		<div className="flex min-h-[calc(100svh-3.5rem)] items-center justify-center bg-background px-5 py-10 md:min-h-[calc(100svh-4rem)]">
			<div className="w-full max-w-md text-center">
				<Link to="/" aria-label="Berean Study home">
					<img
						src="/logo.png"
						alt="Berean Study"
						className="mx-auto h-auto w-1/2 mix-blend-multiply dark:hidden"
					/>
					<img
						src="/logo-dark.png"
						alt=""
						aria-hidden="true"
						className="mx-auto hidden h-auto w-1/2 dark:block"
					/>
				</Link>
				<h1 className="mt-12 text-balance font-serif text-[2.25rem] leading-none tracking-[-0.04em]">
					Reset code required.
				</h1>
				<p className="mx-auto mt-4 max-w-sm text-[15px] text-muted-foreground leading-6">
					Request a password reset code before choosing a new password.
				</p>
				<Link
					to="/forgot-password"
					className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary font-medium text-primary-foreground text-sm shadow-none"
				>
					Request a reset code
				</Link>
			</div>
		</div>
	);
}
