import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ReflectionsPage } from "@/components/prayer/reflections-page";

export const Route = createFileRoute("/_auth/library/reflections")({
	component: ReflectionsRoute,
	validateSearch: z.object({
		category: z.string().trim().min(1).max(50).optional(),
		q: z.string().trim().max(200).optional(),
		reflection: z.coerce.number().int().positive().optional(),
		sort: z.enum(["oldest", "recent"]).default("recent"),
	}),
});

function ReflectionsRoute() {
	const { category, q, reflection, sort } = Route.useSearch();
	const navigate = useNavigate({ from: "/library/reflections" });
	return (
		<ReflectionsPage
			filters={{ category, query: q, sort }}
			onClearSelection={() =>
				navigate({ to: "/library/reflections", search: { category, q, sort } })
			}
			onFiltersChange={(filters) =>
				navigate({
					to: "/library/reflections",
					search: {
						category: filters.category,
						q: filters.query,
						sort: filters.sort,
					},
				})
			}
			onSelectReflection={(reflectionId) =>
				navigate({
					to: "/library/reflections",
					search: { category, q, reflection: reflectionId, sort },
				})
			}
			selectedReflectionId={reflection}
		/>
	);
}
