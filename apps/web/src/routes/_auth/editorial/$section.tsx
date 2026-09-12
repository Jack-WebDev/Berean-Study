import { createFileRoute, redirect } from "@tanstack/react-router";

import { DestinationPage } from "@/components/application/destination-page";
import { editorialNavigationItems } from "@/components/navigation/navigation-items";

export const Route = createFileRoute("/_auth/editorial/$section")({
	beforeLoad: ({ context, params }) => {
		const item = editorialNavigationItems.find(
			(candidate) => candidate.href === `/editorial/${params.section}`,
		);
		if (
			!item ||
			(item.requiredPermission &&
				!context.viewer.permissionKeys.includes(item.requiredPermission))
		) {
			throw redirect({ to: "/home" });
		}
	},
	component: EditorialSectionPage,
});

function EditorialSectionPage() {
	const { section } = Route.useParams();
	const item = editorialNavigationItems.find(
		(candidate) => candidate.href === `/editorial/${section}`,
	);

	if (!item) {
		return null;
	}

	return (
		<DestinationPage
			description="Editorial work is presented here when it is relevant to your responsibilities."
			icon={item.icon}
			title={item.label}
		/>
	);
}
