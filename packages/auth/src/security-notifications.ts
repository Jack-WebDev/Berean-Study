import type { createDb } from "@berean-study/db";
import { shouldDeliverEmailNotification } from "@berean-study/db/notification-preferences";
import {
	claimSecurityEmailDelivery,
	getNotificationPreferences,
	getNotificationRecipient,
} from "@berean-study/db/notification-settings";
import { createNotification } from "@berean-study/db/notifications";
import { sendSecurityAlertEmail } from "@berean-study/emailkit";
import { env } from "@berean-study/env/server";

type DbClient = ReturnType<typeof createDb>;

type SessionCreated = {
	id: string;
	userId: string;
	createdAt: Date;
	ipAddress?: string | null;
	userAgent?: string | null;
};

type NotificationRecipient = {
	email: string;
	name: string;
};

type SecurityEmailSender = typeof sendSecurityAlertEmail;

export const securityNotificationEvents = [
	"password_changed",
	"password_reset",
	"two_factor_enabled",
	"two_factor_disabled",
	"session_revoked",
] as const;

export type SecurityNotificationEvent =
	(typeof securityNotificationEvents)[number];

const securityNotificationContent: Record<
	SecurityNotificationEvent,
	{ body: string; eventName: string; title: string }
> = {
	password_changed: {
		title: "Your password was changed",
		body: "Your account password was changed. Review your account security if this was not you.",
		eventName: "Your account password was changed.",
	},
	password_reset: {
		title: "Your password was reset",
		body: "Your account password was reset and your active sessions were signed out.",
		eventName: "Your account password was reset.",
	},
	two_factor_enabled: {
		title: "Two-factor authentication was enabled",
		body: "An authenticator app is now required when signing in on an untrusted device.",
		eventName: "Two-factor authentication was enabled.",
	},
	two_factor_disabled: {
		title: "Two-factor authentication was disabled",
		body: "Your account no longer requires an authenticator code at sign-in.",
		eventName: "Two-factor authentication was disabled.",
	},
	session_revoked: {
		title: "A session was signed out",
		body: "One of your active sessions was signed out from account security.",
		eventName: "An active session was signed out.",
	},
};

export async function deliverSecuritySignInEmail({
	preferences,
	recipient,
	session,
	claimDelivery,
	sendEmail,
	from,
	appUrl,
}: {
	preferences: Awaited<ReturnType<typeof getNotificationPreferences>>;
	recipient: NotificationRecipient | undefined;
	session: SessionCreated;
	claimDelivery: () => Promise<boolean>;
	sendEmail: SecurityEmailSender;
	from: string | undefined;
	appUrl: string;
}): Promise<void> {
	if (!shouldDeliverEmailNotification(preferences, "security")) return;
	if (!recipient?.email.trim()) return;
	if (!(await claimDelivery())) return;
	if (!from) {
		throw new Error(
			"RESEND_FROM_EMAIL must be configured to send security notification emails.",
		);
	}

	await sendEmail({
		to: recipient.email,
		from,
		recipientName: recipient.name,
		eventName: "New sign-in to your account.",
		eventTime: session.createdAt.toISOString(),
		location: session.ipAddress ?? undefined,
		device: session.userAgent ?? undefined,
		actionUrl: new URL("/account/security", appUrl).toString(),
		actionLabel: "Review account security",
	});
}

export async function notifySecuritySignIn(
	db: DbClient,
	createdSession: SessionCreated,
): Promise<void> {
	try {
		await createNotification(db, {
			userId: createdSession.userId,
			kind: "security_sign_in",
			title: "New sign-in to your account",
			body: "Review your account security if you do not recognise this sign-in.",
			destination: "/account/security",
		});
	} catch (error) {
		console.error("Unable to create security sign-in notification.", error);
	}

	try {
		const preferences = await getNotificationPreferences(
			db,
			createdSession.userId,
		);
		const recipient = await getNotificationRecipient(db, createdSession.userId);

		await deliverSecuritySignInEmail({
			preferences,
			recipient,
			session: createdSession,
			claimDelivery: () => claimSecurityEmailDelivery(db, createdSession.id),
			sendEmail: sendSecurityAlertEmail,
			from: env.RESEND_FROM_EMAIL,
			appUrl: env.BETTER_AUTH_URL,
		});
	} catch (error) {
		console.error("Unable to send security sign-in notification email.", error);
	}
}

/**
 * Records a completed account-security action and, when the member opted in,
 * sends the matching security alert email. Notification delivery never changes
 * the outcome of the security operation that triggered it.
 */
export async function notifySecurityEvent(
	db: DbClient,
	userId: string,
	event: SecurityNotificationEvent,
): Promise<void> {
	const content = securityNotificationContent[event];

	try {
		await createNotification(db, {
			userId,
			kind: `security_${event}`,
			title: content.title,
			body: content.body,
			destination: "/account/security",
		});
	} catch (error) {
		console.error("Unable to create security event notification.", error);
	}

	try {
		const [preferences, recipient] = await Promise.all([
			getNotificationPreferences(db, userId),
			getNotificationRecipient(db, userId),
		]);

		await deliverSecuritySignInEmail({
			preferences,
			recipient,
			session: { id: event, userId, createdAt: new Date() },
			claimDelivery: async () => true,
			sendEmail: sendSecurityAlertEmail,
			from: env.RESEND_FROM_EMAIL,
			appUrl: env.BETTER_AUTH_URL,
		});
	} catch (error) {
		console.error("Unable to send security event notification email.", error);
	}
}
