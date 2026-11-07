import { createFileRoute, redirect } from "@tanstack/react-router";

import { PersonProfilePage } from "@/components/staff/people/person-profile-page";
import { personProfileQueryOptions } from "@/queries/people";

export const Route = createFileRoute("/_auth/admin/users/$userId")({
	beforeLoad: ({ context }) => {
		const keys = context.viewer.permissionKeys;
		if (
			!keys.includes("contributors.manage") &&
			!keys.includes("admins.manage")
		) {
			throw redirect({ to: "/home" });
		}
	},
	loader: ({ context, params }) =>
		context.queryClient.query({
			...personProfileQueryOptions(params.userId),
			staleTime: "static",
		}),
	component: PersonProfileRoute,
});

function PersonProfileRoute() {
	const { userId } = Route.useParams();
	const { viewer } = Route.useRouteContext();

	return (
		<PersonProfilePage
			userId={userId}
			viewer={{
				id: viewer.session.user.id,
				permissionKeys: viewer.permissionKeys,
			}}
		/>
	);
}
