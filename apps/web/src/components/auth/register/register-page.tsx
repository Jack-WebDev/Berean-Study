import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import Loader from "../../loader";
import RegisterForm from "./register-form";
import RegisterVisual from "./register-visual";
export default function RegisterPage() {
	const { isPending } = authClient.useSession();
	if (isPending) return <Loader />;
	return (
		<div className="min-h-[calc(100svh-3.5rem)] bg-background md:min-h-[calc(100svh-4rem)]">
			<div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-7xl items-stretch md:min-h-[calc(100svh-4rem)] md:px-8 md:py-10 lg:px-12 lg:py-12">
				<div className="grid w-full overflow-hidden md:grid-cols-[0.95fr_1.05fr] md:rounded-[2rem] md:border md:bg-card md:shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
					<RegisterVisual />
					<section className="flex min-h-full items-center justify-center px-5 py-10 sm:px-8 md:px-10 md:py-12 lg:px-16">
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
									Create your account.
								</h1>
								<p className="mt-3 text-[15px] text-muted-foreground leading-6">
									Join Berean Study and continue your study anywhere.
								</p>
							</div>
							<RegisterForm />
							<p className="mt-5 text-center text-muted-foreground text-xs leading-5">
								By creating an account, you agree to the Berean Study{" "}
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
							<div className="mt-7 border-t pt-6 text-center text-muted-foreground text-sm">
								Already have an account?{" "}
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
