import { Toaster } from "@berean-study/ui/components/sonner";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";

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
				content: "#f8f6f0",
				media: "(prefers-color-scheme: light)",
			},
			{
				name: "theme-color",
				content: "#151b26",
				media: "(prefers-color-scheme: dark)",
			},
			{
				name: "color-scheme",
				content: "light dark",
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
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon.png",
				media: "(prefers-color-scheme: light)",
			},
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon-dark.png",
				media: "(prefers-color-scheme: dark)",
			},
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>

			<body className="min-h-svh bg-background text-foreground antialiased">
				<Link
					to="/"
					hash="main-content"
					className="sr-only fixed top-4 left-4 z-50 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				>
					Skip to content
				</Link>
				<div className="grid min-h-svh grid-rows-[auto_1fr]">
					<main id="main-content" className="min-h-0" tabIndex={-1}>
						<Outlet />
					</main>
				</div>

				<Toaster richColors closeButton />

				<Scripts />
			</body>
		</html>
	);
}
