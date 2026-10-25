import { defaultNotificationPreferences } from "@berean-study/db/notification-preferences";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notificationPreferenceMocks = vi.hoisted(() => ({
	get: vi.fn(),
	update: vi.fn(),
}));

vi.mock("../src/functions/notification-preferences", () => ({
	getNotificationPreferences: notificationPreferenceMocks.get,
	updateNotificationPreferences: notificationPreferenceMocks.update,
}));

import { NotificationsPage } from "../src/components/account/notifications/notifications-page";
import { renderWithQueryClient } from "./render-with-query-client";

afterEach(cleanup);

async function renderLoadedPage() {
	renderWithQueryClient(<NotificationsPage />);
	await waitFor(() => {
		expect(
			screen
				.getByRole("button", { name: "Save preferences" })
				.hasAttribute("disabled"),
		).toBe(false);
	});
}

beforeEach(() => {
	notificationPreferenceMocks.get.mockReset();
	notificationPreferenceMocks.update.mockReset();
	notificationPreferenceMocks.get.mockResolvedValue({
		...defaultNotificationPreferences,
		push: true,
		security: true,
	});
	notificationPreferenceMocks.update.mockResolvedValue(undefined);
});

describe("NotificationsPage", () => {
	it("keeps in-app and email topic preferences independent", async () => {
		await renderLoadedPage();

		fireEvent.click(
			screen.getByRole("switch", { name: "In-app Reading reminders" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

		await waitFor(() => {
			expect(notificationPreferenceMocks.update).toHaveBeenCalledWith({
				data: {
					...defaultNotificationPreferences,
					push: true,
					resources: true,
					security: true,
				},
			});
		});

		fireEvent.click(
			screen.getByRole("switch", { name: "Email Reading reminders" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

		await waitFor(() => {
			expect(notificationPreferenceMocks.update).toHaveBeenLastCalledWith({
				data: {
					...defaultNotificationPreferences,
					emailTopics: {
						...defaultNotificationPreferences.emailTopics,
						resources: true,
					},
					push: true,
					resources: true,
					security: true,
				},
			});
		});
	});

	it("resets notification preferences before saving", async () => {
		await renderLoadedPage();

		fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
		fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

		await waitFor(() => {
			expect(notificationPreferenceMocks.update).toHaveBeenLastCalledWith({
				data: defaultNotificationPreferences,
			});
		});
	});
});
