import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { PendingChanges } from "@/components/staff/people/pending-changes";
import { PeopleDirectory } from "@/components/staff/people/people-directory";
import { staffLinkClassName } from "@/components/staff/staff-button";
import { StaffPage } from "@/components/staff/staff-page";
import {
	pendingChangesQueryOptions,
	peopleListQueryOptions,
} from "@/queries/people";

export const Route = createFileRoute("/_auth/admin/users/")({
	beforeLoad: ({ context }) => {
		if (!accessibleStaffItem("/admin/users", context.viewer.permissionKeys)) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		page: z.number().int().positive().optional().catch(undefined),
		q: z.string().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				peopleListQueryOptions({ page: deps.page ?? 1, query: deps.q }),
			),
			context.queryClient.ensureQueryData(pendingChangesQueryOptions()),
		]),
	component: UsersRoute,
});

function UsersRoute() {
	const search = Route.useSearch();
	const { viewer } = Route.useRouteContext();
	const navigate = useNavigate({ from: "/admin/users/" });

	return (
		<StaffPage
			description="Everyone with a Berean Study account. Private notes, prayers, collections and saved items are never shown here."
			section="Management"
			title="Users"
		>
			<PendingChanges viewerId={viewer.session.user.id} />
			<PeopleDirectory
				filters={{ page: search.page ?? 1, query: search.q }}
				onSearch={(query) =>
					void navigate({ search: { q: query.trim() || undefined } })
				}
				pageLink={(page, label) => (
					<Link
						className={staffLinkClassName}
						from={Route.fullPath}
						search={{ ...search, page }}
						to="."
					>
						{label}
					</Link>
				)}
			/>
		</StaffPage>
	);
}
