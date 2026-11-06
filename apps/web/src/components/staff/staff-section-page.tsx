import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@berean-study/ui/components/empty";

import {
	type NavigationItem,
	staffNavigationSections,
} from "@/components/navigation/navigation-items";

import { StaffPage } from "./staff-page";

/**
 * Holds a staff address until its real screen is built, so the sidebar and its
 * permission rules can be used and checked first. Each screen replaces this with
 * its own route file.
 */
export function StaffSectionPage({ item }: { item: NavigationItem }) {
	const section = staffNavigationSections.find(({ items }) =>
		items.some(({ href }) => href === item.href),
	);
	const Icon = item.icon;

	return (
		<StaffPage section={section?.label ?? "Staff"} title={item.label}>
			<Empty className="min-h-64 border-border">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Icon aria-hidden="true" />
					</EmptyMedia>
					<EmptyTitle>Not built yet</EmptyTitle>
					<EmptyDescription>
						You have access to this page, and its tools will appear here once
						they're ready.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</StaffPage>
	);
}
