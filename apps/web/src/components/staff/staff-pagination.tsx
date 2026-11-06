import type { ReactNode } from "react";

/** Previous and next links, kept in the URL so a page can be shared or reloaded. */
export function StaffPagination({
	next,
	page,
	pageSize,
	previous,
	total,
}: {
	next: ReactNode;
	page: number;
	pageSize: number;
	previous: ReactNode;
	total: number;
}) {
	const pages = Math.max(1, Math.ceil(total / pageSize));
	if (pages === 1) return null;

	return (
		<nav
			aria-label="Pages"
			className="mt-4 flex items-center justify-between gap-3 text-sm"
		>
			<span>{page > 1 ? previous : null}</span>
			<span className="text-muted-foreground">
				Page {page} of {pages}
			</span>
			<span>{page < pages ? next : null}</span>
		</nav>
	);
}
