import { ArrowRight } from "lucide-react";

type SectionHeaderProps = {
	title: string;
	href: string;
	label?: string;
};

export function SectionHeader({
	title,
	href,
	label = "See All",
}: SectionHeaderProps) {
	return (
		<div className="flex items-center justify-between gap-4">
			<h2 className="font-serif text-2xl text-foreground tracking-[-0.015em]">
				{title}
			</h2>
			<a
				href={href}
				className="inline-flex items-center gap-2 font-medium text-primary text-sm transition hover:text-primary/80"
			>
				{label}
				<ArrowRight className="size-4" />
			</a>
		</div>
	);
}
