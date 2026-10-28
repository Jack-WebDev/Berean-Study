import { DialogTrigger } from "@berean-study/ui/components/dialog";
import {
	BookOpenIcon,
	ListIcon,
	PresentationIcon,
	StarIcon,
} from "lucide-react";

import { coverPresets, coverStyle } from "./collection-colors";
import type { CollectionType } from "./collection-library";

/*
 * A template only preselects the collection's type for now.
 * TODO(collections): give each template its starting sections and, for
 * memory verses, review reminders, once those exist.
 */
const templates = [
	{
		color: coverPresets[0].value,
		description:
			"Trace one theme — grace, covenant, prayer — across both Testaments.",
		icon: ListIcon,
		title: "Topical study",
		type: "list",
	},
	{
		color: coverPresets[1].value,
		description:
			"Work through a book chapter by chapter, with progress tracking.",
		icon: BookOpenIcon,
		title: "Book study",
		type: "project",
	},
	{
		color: coverPresets[3].value,
		description:
			"Outline, key passages, discussion questions and handout notes.",
		icon: PresentationIcon,
		title: "Teaching prep",
		type: "teaching",
	},
	{
		color: coverPresets[2].value,
		description: "A short list of verses you want to learn by heart.",
		icon: StarIcon,
		title: "Memory verses",
		type: "list",
	},
] as const satisfies readonly {
	color: string;
	description: string;
	icon: typeof ListIcon;
	title: string;
	type: CollectionType;
}[];

/** Template cards that open the new collection dialog with a type chosen. */
export function CollectionTemplates({
	onChoose,
}: {
	onChoose: (type: CollectionType) => void;
}) {
	return (
		<section
			aria-labelledby="collection-templates-heading"
			className="flex flex-col gap-4 pt-2"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2
					className="font-serif text-[1.625rem] tracking-[-0.01em]"
					id="collection-templates-heading"
				>
					Start from a template
				</h2>
				<p className="text-muted-foreground text-sm">
					Each sets up the collection type; you can change it later
				</p>
			</div>
			<ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.75rem),1fr))] gap-4">
				{templates.map((template) => {
					const Icon = template.icon;
					return (
						<li className="flex flex-col *:flex-1" key={template.title}>
							<DialogTrigger
								className="flex flex-col items-start gap-2 rounded-[14px] border border-border bg-card p-5 text-left outline-none transition-[box-shadow,translate] duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_color-mix(in_oklab,var(--primary),transparent_88%)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0"
								onClick={() => onChoose(template.type)}
							>
								<span
									aria-hidden="true"
									className="collection-cover grid size-9 place-items-center rounded-[10px]"
									style={coverStyle(template.color)}
								>
									<Icon className="size-4.5" />
								</span>
								<strong className="font-semibold text-[15px]">
									{template.title}
								</strong>{" "}
								<span className="text-muted-foreground text-sm">
									{template.description}
								</span>
							</DialogTrigger>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
