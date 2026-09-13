import {
	sendAccountDeletionConfirmationEmail,
	sendWelcomeEmail,
	verificationEmail,
} from "@berean-study/emailkit";
import { env } from "@berean-study/env/server";

type LifecycleUser = {
	email: string;
	name?: string | null;
};

function hasEmailAddress(user: LifecycleUser) {
	return user.email.trim().length > 0;
}

function getFromEmail() {
	if (!env.RESEND_FROM_EMAIL) {
		throw new Error("RESEND_FROM_EMAIL must be configured to send email.");
	}

	return env.RESEND_FROM_EMAIL;
}

export async function sendEmailVerificationOtp(email: string, otpCode: string) {
	await verificationEmail({
		to: email,
		from: getFromEmail(),
		otpCode,
	});
}

export async function sendWelcomeEmailSafely(user: LifecycleUser) {
	if (!hasEmailAddress(user)) return;

	try {
		await sendWelcomeEmail({
			to: user.email,
			from: getFromEmail(),
			recipientName: user.name,
			appUrl: env.BETTER_AUTH_URL,
		});
	} catch (error) {
		console.error("Unable to send welcome email.", error);
	}
}

export async function sendAccountDeletedEmailSafely(user: LifecycleUser) {
	if (!hasEmailAddress(user)) return;

	try {
		await sendAccountDeletionConfirmationEmail({
			to: user.email,
			from: getFromEmail(),
			recipientName: user.name,
			appUrl: env.BETTER_AUTH_URL,
		});
	} catch (error) {
		console.error("Unable to send account-deleted email.", error);
	}
}
