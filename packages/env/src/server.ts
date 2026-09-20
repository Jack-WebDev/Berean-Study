import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const server = {
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),
	DATABASE_URL: z.string().min(1),
	EMAIL_PROVIDER: z.enum(["resend", "smtp"]),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	RESEND_API_KEY: z.string().min(1).optional(),
	RESEND_FROM_EMAIL: z.email(),
	SMTP_HOST: z.string().min(1).optional(),
	SMTP_PASS: z.string().min(1).optional(),
	SMTP_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
	SMTP_SECURE: z
		.enum(["true", "false"])
		.default("false")
		.transform((value) => value === "true"),
	SMTP_USER: z.string().min(1).optional(),
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
			if (value.EMAIL_PROVIDER === "resend" && !value.RESEND_API_KEY) {
				context.addIssue({
					code: "custom",
					message: "RESEND_API_KEY is required when EMAIL_PROVIDER=resend.",
					path: ["RESEND_API_KEY"],
				});
			}

			if (value.EMAIL_PROVIDER === "smtp") {
				if (!value.SMTP_HOST) {
					context.addIssue({
						code: "custom",
						message: "SMTP_HOST is required when EMAIL_PROVIDER=smtp.",
						path: ["SMTP_HOST"],
					});
				}
				if (!value.SMTP_PORT) {
					context.addIssue({
						code: "custom",
						message: "SMTP_PORT is required when EMAIL_PROVIDER=smtp.",
						path: ["SMTP_PORT"],
					});
				}
				if (Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASS)) {
					context.addIssue({
						code: "custom",
						message: "SMTP_USER and SMTP_PASS must be set together.",
						path: [value.SMTP_USER ? "SMTP_PASS" : "SMTP_USER"],
					});
				}
			}
		}),
});
