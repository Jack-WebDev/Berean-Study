import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

/** Renders with a fresh cache so queries never leak between tests. */
export function renderWithQueryClient(ui: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
	);
}
