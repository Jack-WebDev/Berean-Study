import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/components/home/home-page";
import { readerHomeQueryOptions } from "@/queries/library";

export const Route = createFileRoute("/_auth/home")({
	loader: ({ context }) =>
		// "static" returns cached data at once; the page refreshes it if old.
		context.queryClient.query({
			...readerHomeQueryOptions(),
			staleTime: "static",
		}),
	component: HomePageComponent,
});

function HomePageComponent() {
	const { data: overview } = useSuspenseQuery(readerHomeQueryOptions());
	return <HomePage overview={overview} />;
}
