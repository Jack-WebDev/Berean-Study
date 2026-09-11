import { MailIcon } from "lucide-react";
export default function ForgotPasswordVisual() {
	return (
		<aside className="relative hidden min-h-168 overflow-hidden md:block">
			<img
				src="/auth/auth-forgot-password.png"
				alt=""
				className="absolute inset-0 size-full object-cover"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-linear-to-r from-background/95 via-background/75 to-background/20"
			/>
			<div className="relative z-10 flex h-full max-w-xl flex-col justify-center p-10 lg:p-12">
				<div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
					<MailIcon aria-hidden="true" className="size-5" strokeWidth={1.5} />
				</div>
				<h2 className="mt-7 font-serif text-4xl leading-[1.05] tracking-[-0.035em]">
					Reset your password.
				</h2>
				<p className="mt-5 max-w-sm text-muted-foreground text-sm leading-6">
					Enter the email associated with your account and we’ll send you a
					secure password reset code.
				</p>
			</div>
		</aside>
	);
}
