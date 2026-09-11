export default function LoginVisual() {
	return (
		<aside className="relative hidden min-h-168 overflow-hidden md:block">
			<img
				src="/auth/auth-login.png"
				alt=""
				className="absolute inset-0 size-full object-cover"
			/>

			<div
				aria-hidden="true"
				className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/5"
			/>

			<div className="relative z-10 flex h-full max-w-xl flex-col justify-center p-10 text-white lg:p-12">
				<p className="font-serif text-4xl leading-[1.05] tracking-[-0.035em]">
					Study deeper.
					<br />
					Read with confidence.
				</p>

				<p className="mt-5 text-sm text-white/90 leading-6">
					Clear context. Multiple perspectives. Trusted sources.
				</p>

				<div className="mt-8 h-px w-12 bg-white/50" />

				<blockquote className="mt-8 max-w-xs text-sm text-white/90 leading-6">
					“Search the Scriptures...”
				</blockquote>

				<p className="mt-1 text-white/60 text-xs">John 5:39</p>
			</div>
		</aside>
	);
}
