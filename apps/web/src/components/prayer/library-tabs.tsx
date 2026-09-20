import { Link } from "@tanstack/react-router";

type LibraryTab = "prayers" | "reflections" | "testimonies";

export function PrayerLibraryTabs({ active }: { active: LibraryTab }) {
	return (
		<nav
			aria-label="Prayer library"
			className="flex h-10 items-center rounded-lg bg-muted/55 p-1"
		>
			<LibraryTab active={active} label="Prayers" to="/library/prayers" />
			<LibraryTab
				active={active}
				label="Testimonies"
				to="/library/testimonials"
			/>
			<LibraryTab
				active={active}
				label="Reflections"
				to="/library/reflections"
			/>
		</nav>
	);
}

function LibraryTab({
	active,
	label,
	to,
}: {
	active: LibraryTab;
	label: string;
	to: "/library/prayers" | "/library/reflections" | "/library/testimonials";
}) {
	const selected = active === label.toLowerCase();
	return (
		<Link
			aria-current={selected ? "page" : undefined}
			className={`inline-flex h-8 min-w-28 items-center justify-center rounded-md px-5 font-medium text-sm transition-colors ${
				selected
					? "bg-background text-foreground shadow-sm"
					: "text-muted-foreground hover:text-foreground"
			}`}
			to={to}
		>
			{label}
		</Link>
	);
}
