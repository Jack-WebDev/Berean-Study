import { createFileRoute, redirect } from "@tanstack/react-router";

import { DestinationPage } from "@/components/application/destination-page";
import { administrationNavigationItems } from "@/components/navigation/navigation-items";

export const Route = createFileRoute("/_auth/admin/$section")({
	beforeLoad: ({ context, params }) => {
		const item = administrationNavigationItems.find(
			(candidate) => candidate.href === `/admin/${params.section}`,
		);
		if (
			!item ||
			(item.requiredPermission &&
				!context.viewer.permissionKeys.includes(item.requiredPermission))
		) {
			throw redirect({ to: "/home" });
		}
	},
	component: AdministrationSectionPage,
});

function AdministrationSectionPage() {
	const { section } = Route.useParams();
	const item = administrationNavigationItems.find(
		(candidate) => candidate.href === `/admin/${section}`,
	);

	if (!item) {
		return null;
	}

	return (
		<DestinationPage
			description="Administrative capabilities are available only to people granted the relevant permission."
			icon={item.icon}
			title={item.label}
		/>
	);
}
