import { z } from "zod";

import {
	describeThemeMerge,
	mergeThemeInto,
	readThemeMerge,
} from "../theme-merge";
import type { ChangeKindDefinition } from "../two-person";

const themeMergePayload = z.object({
	intoThemeId: z.number().int().positive(),
	themeId: z.number().int().positive(),
});

export type ThemeMergePayload = z.infer<typeof themeMergePayload>;

export const themeMergeKind: ChangeKindDefinition<ThemeMergePayload> = {
	payload: themeMergePayload,
	decidePermission: "content.confirm_foundational",
	title: "Merging two published themes",
	target: ({ themeId }) => ({ id: String(themeId), type: "theme" }),
	destination: ({ themeId }) => `/work/themes?theme=${themeId}`,
	describe: describeThemeMerge,
	async assertAllowed(client, payload) {
		await readThemeMerge(client, payload);
	},
	apply: (client, payload, { deciderUserId, proposalId, reason }) =>
		mergeThemeInto(client, payload, { deciderUserId, proposalId, reason }),
	proposedAction: "theme.merge_proposed",
	decidedAction(decision) {
		if (decision === "confirm") return "theme.merged";
		return decision === "return"
			? "theme.merge_returned"
			: "theme.merge_rejected";
	},
};
