import { createFileRoute } from "@tanstack/react-router";
import HomePage from "@/components/home/home-page";
import { getReaderHomeOverview } from "@/functions/get-reader-home-overview";

export const Route = createFileRoute("/_auth/home")({
	loader: () => getReaderHomeOverview(),
	component: HomePageComponent,
});

function HomePageComponent() {
	return <HomePage overview={Route.useLoaderData()} />;
}
