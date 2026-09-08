import { Toaster } from "@berean-study/ui/components/sonner";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "../components/header";
import appCss from "../index.css?url";

// biome-ignore lint/complexity/noBannedTypes: biome-ignore lint: false positive
export type RouterAppContext = {};

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{
				name: "theme-color",
				content: "#09090b",
			},
			{
				name: "description",
				content:
					"Berean Study is a Bible study and commentary resource for reading Scripture in context and examining the evidence behind interpretation.",
			},
			{
				title: "Berean Study",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="en" className="dark" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>

			<body className="min-h-svh bg-background text-foreground antialiased">
				<div className="grid min-h-svh grid-rows-[auto_1fr]">
					<Header />

					<main className="min-h-0">
						<Outlet />
					</main>
				</div>

				<Toaster richColors closeButton />

				{import.meta.env.DEV && (
					<TanStackRouterDevtools position="bottom-left" />
				)}

				<Scripts />
			</body>
		</html>
	);
}
