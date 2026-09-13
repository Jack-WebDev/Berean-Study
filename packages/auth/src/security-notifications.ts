import type { createDb } from "@berean-study/db";
import { shouldDeliverEmailNotification } from "@berean-study/db/notification-preferences";
import {
	claimSecurityEmailDelivery,
	getNotificationPreferences,
	getNotificationRecipient,
} from "@berean-study/db/notification-settings";
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
