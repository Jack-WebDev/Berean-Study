import { createDb } from "@berean-study/db";
import * as schema from "@berean-study/db/schema/auth";
import { env } from "@berean-study/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { twoFactor } from "better-auth/plugins/two-factor";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		appName: "Berean Study",
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.BETTER_AUTH_URL],
		emailAndPassword: {
			enabled: true,
			resetPasswordTokenExpiresIn: 60 * 30,
			revokeSessionsOnPasswordReset: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		user: {
			deleteUser: {
				enabled: true,
			},
		},
		plugins: [
			emailOTP({
				expiresIn: 60 * 10,
				storeOTP: "hashed",
				async sendVerificationOTP({ email, otp, type }) {
					if (type !== "forget-password") return;

					if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
						throw new Error(
							"RESEND_API_KEY and RESEND_FROM_EMAIL must be configured to send password reset codes.",
						);
					}

					const response = await fetch("https://api.resend.com/emails", {
						method: "POST",
						headers: {
							Authorization: `Bearer ${env.RESEND_API_KEY}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							from: env.RESEND_FROM_EMAIL,
							to: [email],
							subject: "Your Berean Study password reset code",
							html: `<p>Your password reset code is:</p><p style="font-size: 24px; font-weight: 700; letter-spacing: 0.2em">${otp}</p><p>This code expires in 10 minutes.</p>`,
						}),
					});

					if (!response.ok) {
						throw new Error("Unable to send password reset code.");
					}
				},
			}),
			twoFactor({
				issuer: "Berean Study",
			}),
			tanstackStartCookies(),
		],
	});
}

export const auth = createAuth();
