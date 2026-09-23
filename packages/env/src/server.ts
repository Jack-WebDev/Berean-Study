import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const server = {
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),
	DATABASE_URL: z.string().min(1),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	RESEND_API_KEY: z.string().min(1).optional(),
	RESEND_FROM_EMAIL: z.email().optional(),
};

export const env = createEnv({
	server,
	runtimeEnv: process.env,
	skipValidation:
		process.env.NODE_ENV !== "production" &&
		process.env.SKIP_ENV_VALIDATION === "true",
	emptyStringAsUndefined: true,
	createFinalSchema: (shape) =>
		z.object(shape).superRefine((value, context) => {
			if (value.NODE_ENV !== "development" && !value.RESEND_API_KEY) {
				context.addIssue({
					code: "custom",
					message:
						"RESEND_API_KEY is required outside the local development environment.",
					path: ["RESEND_API_KEY"],
				});
			}

			if (value.NODE_ENV !== "development" && !value.RESEND_FROM_EMAIL) {
				context.addIssue({
					code: "custom",
					message:
						"RESEND_FROM_EMAIL is required outside the local development environment.",
					path: ["RESEND_FROM_EMAIL"],
				});
			}
		}),
});
