import type { ReactNode } from "react";

/** The page frame shared by every Contributor, Administration and Management screen. */
export function StaffPage({
	actions,
	children,
	description,
	section,
	title,
}: {
	actions?: ReactNode;
	children: ReactNode;
	description?: string;
	section: string;
	title: string;
}) {
	return (
		<div className="px-4 py-8 sm:px-8 lg:px-12">
			<div className="mx-auto w-full max-w-6xl">
				<header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
					<div className="min-w-0 max-w-[65ch]">
						<p className="font-bold text-[0.6875rem] text-muted-foreground uppercase tracking-[0.16em]">
							{section}
						</p>
						<h1 className="mt-2 font-serif text-3xl tracking-[-0.02em] sm:text-[2.5rem] sm:leading-tight">
							{title}
						</h1>
						{description ? (
							<p className="mt-2 text-muted-foreground">{description}</p>
						) : null}
					</div>
					{actions ? (
						<div className="flex flex-wrap items-center gap-2">{actions}</div>
					) : null}
				</header>
				<div className="mt-8">{children}</div>
			</div>
		</div>
	);
}
