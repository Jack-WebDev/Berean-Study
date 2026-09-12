import { Button } from "@berean-study/ui/components/button";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

import Loader from "../../loader";
import LoginForm from "./login-form";
import LoginVisual from "./login-visual";

export default function LoginPage() {
	const { isPending } = authClient.useSession();

	if (isPending) {
		return <Loader />;
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="grid h-screen w-full overflow-auto md:grid-cols-[0.95fr_1.05fr]">
				<LoginVisual />

				<section className="flex min-h-full items-center justify-center px-5 py-10 sm:px-8 md:px-10 md:py-14 lg:px-16">
					<div className="w-full max-w-md">
						<div className="mb-9 flex justify-center md:mb-10">
							<Link
								to="/"
								aria-label="Berean Study home"
								className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
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
							<h1 className="text-balance font-serif text-[2.35rem] leading-none tracking-[-0.04em] md:text-[2.65rem]">
								Welcome back.
							</h1>

							<p className="mt-3 text-[15px] text-muted-foreground leading-6">
								Continue your study.
							</p>
						</div>

						<LoginForm />

						<div className="mt-8 flex items-center gap-4">
							<div className="h-px flex-1 bg-border" />

							<span className="text-muted-foreground text-xs">
								New to Berean Study?
							</span>

							<div className="h-px flex-1 bg-border" />
						</div>

						<Button
							render={<Link to="/register" />}
							variant="outline"
							className="mt-5 h-12 w-full rounded-xl bg-background font-medium text-sm shadow-none"
						>
							Create an account
						</Button>

						<p className="mt-8 text-center text-muted-foreground text-xs leading-5">
							By continuing, you agree to the Berean Study{" "}
							<a
								href="/terms"
								className="text-foreground underline underline-offset-4 hover:text-primary"
							>
								Terms
							</a>{" "}
							and{" "}
							<a
								href="/privacy"
								className="text-foreground underline underline-offset-4 hover:text-primary"
							>
								Privacy Policy
							</a>
							.
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
