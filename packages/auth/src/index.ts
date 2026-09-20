import { db } from "@berean-study/db";
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
import {
	notifySecurityEvent,
	notifySecuritySignIn,
} from "./security-notifications";

export function createAuth() {
	return betterAuth({
		appName: "Berean Study",
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.BETTER_AUTH_URL],
		rateLimit: {
			enabled: true,
			storage: "database",
			window: 60,
			max: 60,
			customRules: {
				"/sign-in/email": { window: 60, max: 5 },
				"/sign-in/email-otp": { window: 60, max: 3 },
				"/sign-up/email": { window: 60 * 60, max: 5 },
				"/request-password-reset": { window: 60 * 60, max: 3 },
				"/email-otp/*": { window: 60 * 10, max: 3 },
				"/forget-password/*": { window: 60 * 10, max: 3 },
				"/two-factor/*": { window: 60 * 15, max: 5 },
			},
		},
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 12,
			resetPasswordTokenExpiresIn: 60 * 30,
			revokeSessionsOnPasswordReset: true,
			onPasswordReset: async ({ user }) => {
				await notifySecurityEvent(db, user.id, "password_reset");
			},
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
			account: {
				update: {
					after: async (account, context) => {
						if (context?.path !== "/change-password") return;
						await notifySecurityEvent(db, account.userId, "password_changed");
					},
				},
			},
			session: {
				create: {
					after: async (session, context) => {
						if (
							context?.path === "/change-password" ||
							context?.path === "/two-factor/verify-totp" ||
							context?.path === "/two-factor/disable"
						) {
							return;
						}
						await notifySecuritySignIn(db, session);
					},
				},
				delete: {
					after: async (session, context) => {
						if (context?.path !== "/revoke-session") return;
						await notifySecurityEvent(db, session.userId, "session_revoked");
					},
				},
			},
			user: {
				update: {
					after: async (user, context) => {
						const event =
							context?.path === "/two-factor/verify-totp"
								? "two_factor_enabled"
								: context?.path === "/two-factor/disable"
									? "two_factor_disabled"
									: null;

						if (event) await notifySecurityEvent(db, user.id, event);
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
