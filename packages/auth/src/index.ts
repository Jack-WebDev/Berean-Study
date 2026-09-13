import { createDb } from "@berean-study/db";
import * as schema from "@berean-study/db/schema/auth";
import { sendPasswordResetEmail } from "@berean-study/emailkit";
import { env } from "@berean-study/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { twoFactor } from "better-auth/plugins/two-factor";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import {
	sendAccountDeletedEmailSafely,
	sendEmailVerificationOtp,
	sendWelcomeEmailSafely,
} from "./lifecycle-emails";
import { notifySecuritySignIn } from "./security-notifications";

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
				afterDelete: async (user) => {
					await sendAccountDeletedEmailSafely(user);
				},
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			afterEmailVerification: async (user) => {
				await sendWelcomeEmailSafely(user);
			},
		},
		databaseHooks: {
			session: {
				create: {
					after: async (session) => {
						await notifySecuritySignIn(db, session);
					},
				},
			},
		},
		plugins: [
			emailOTP({
				expiresIn: 60 * 10,
				storeOTP: "hashed",
				overrideDefaultEmailVerification: true,
				async sendVerificationOTP({ email, otp, type }) {
					if (type === "email-verification") {
						await sendEmailVerificationOtp(email, otp);
						return;
					}

					if (type !== "forget-password") return;

					if (!env.RESEND_FROM_EMAIL) {
						throw new Error(
							"RESEND_FROM_EMAIL must be configured to send password reset codes.",
						);
					}

					await sendPasswordResetEmail({
						to: email,
						from: env.RESEND_FROM_EMAIL,
						otpCode: otp,
					});
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
