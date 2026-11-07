import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { z } from "zod";

import { accessibleStaffItem } from "@/components/navigation/navigation-items";
import { PeopleDirectory } from "@/components/staff/people/people-directory";
import { staffLinkClassName } from "@/components/staff/staff-button";
import { StaffPage } from "@/components/staff/staff-page";
import { peopleListQueryOptions } from "@/queries/people";

export const Route = createFileRoute("/_auth/admin/contributors")({
	beforeLoad: ({ context }) => {
		if (
			!accessibleStaffItem("/admin/contributors", context.viewer.permissionKeys)
		) {
			throw redirect({ to: "/home" });
		}
	},
	validateSearch: z.object({
		everyone: z.boolean().optional().catch(undefined),
		page: z.number().int().positive().optional().catch(undefined),
		q: z.string().optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) =>
		context.queryClient.query({
			...peopleListQueryOptions({
				page: deps.page ?? 1,
				query: deps.q,
				staffOnly: !deps.everyone,
			}),
			staleTime: "static",
		}),
	component: ContributorsRoute,
});

function ContributorsRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: "/admin/contributors" });

	return (
		<StaffPage
			description="The people working on Berean Study. Search everyone to find a member to bring on."
			section="Administration"
			title="Contributors"
		>
			<PeopleDirectory
				filters={{
					page: search.page ?? 1,
					query: search.q,
					staffOnly: !search.everyone,
				}}
				onSearch={(query) =>
					void navigate({
						search: { everyone: search.everyone, q: query.trim() || undefined },
					})
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
				toolbar={
					<Link
						className={staffLinkClassName}
						from={Route.fullPath}
						search={{
							everyone: search.everyone ? undefined : true,
							q: search.q,
						}}
						to="."
					>
						{search.everyone ? "Show staff only" : "Search everyone"}
					</Link>
				}
			/>
		</StaffPage>
	);
}
