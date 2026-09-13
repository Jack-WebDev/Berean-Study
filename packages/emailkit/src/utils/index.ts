import { sendEmail } from "../mailer";
import {
	AccountCreatedEmail,
	AccountDeletionConfirmationEmail,
	ForgotPasswordOtpEmail,
	MaintenanceNoticeEmail,
	OnboardingVerificationOtp,
	SecurityAlertEmail,
	VerifyEmailOtp,
	WelcomeEmail,
} from "../templates";

type BaseSendArgs = {
	to: string;
	from: string;
	recipientName?: string | null;
	supportEmail?: string;
	appUrl?: string;
};

function getSupportEmail(args: { from: string; supportEmail?: string }) {
	return args.supportEmail ?? args.from;
}

export async function sendPasswordResetEmail(args: {
	to: string;
	from: string;
	otpCode: string;
	recipientName?: string | null;
}) {
	await sendEmail({
		to: args.to,
		from: args.from,
		subject: "Your Berean Study password reset code",
		component: ForgotPasswordOtpEmail,
		props: {
			otpCode: args.otpCode,
			recipientName: args.recipientName,
			supportEmail: args.from,
		},
	});
}

export async function verificationEmail(args: {
	to: string;
	from: string;
	otpCode: string;
	recipientName?: string | null;
}) {
	await sendEmail({
		to: args.to,
		from: args.from,
		subject: "Verify your Berean Study email address",
		component: VerifyEmailOtp,
		props: {
			otpCode: args.otpCode,
			recipientName: args.recipientName,
			supportEmail: args.from,
		},
	});
}

export async function onboardingVerification(args: {
	to: string;
	from: string;
	otpCode: string;
	recipientName?: string | null;
}) {
	await sendEmail({
		to: args.to,
		from: args.from,
		subject: "Your Berean Study onboarding code",
		component: OnboardingVerificationOtp,
		props: {
			otpCode: args.otpCode,
			recipientName: args.recipientName,
			supportEmail: args.from,
		},
	});
}

export async function sendAccountCreatedEmail(args: BaseSendArgs) {
	await sendEmail({
		to: args.to,
		from: args.from,
		subject: "Your Berean Study account is ready",
		component: AccountCreatedEmail,
		props: { ...args, supportEmail: getSupportEmail(args) },
	});
}

export async function sendWelcomeEmail(args: BaseSendArgs) {
	await sendEmail({
		to: args.to,
		from: args.from,
		subject: "Welcome to Berean Study",
		component: WelcomeEmail,
		props: { ...args, supportEmail: getSupportEmail(args) },
	});
}

export async function sendSecurityAlertEmail(
	args: BaseSendArgs & {
		eventName: string;
		eventTime: string;
		location?: string;
		device?: string;
		actionUrl?: string;
		actionLabel?: string;
	},
) {
	await sendEmail({
		to: args.to,
		from: args.from,
		subject: "Security alert for your Berean Study account",
		component: SecurityAlertEmail,
		props: { ...args, supportEmail: getSupportEmail(args) },
	});
}

export async function sendMaintenanceNoticeEmail(
	args: BaseSendArgs & {
		startsAt: string;
		endsAt?: string;
		statusPageUrl?: string;
	},
) {
	await sendEmail({
		to: args.to,
		from: args.from,
		subject: "Berean Study maintenance notice",
		component: MaintenanceNoticeEmail,
		props: { ...args, supportEmail: getSupportEmail(args) },
	});
}

export async function sendAccountDeletionConfirmationEmail(args: BaseSendArgs) {
	await sendEmail({
		to: args.to,
		from: args.from,
		subject: "Your Berean Study account was deleted",
		component: AccountDeletionConfirmationEmail,
		props: { ...args, supportEmail: getSupportEmail(args) },
	});
}

export const emailer = {
	sendPasswordReset: sendPasswordResetEmail,
	sendVerification: verificationEmail,
	sendOnboardingVerification: onboardingVerification,
	sendAccountCreated: sendAccountCreatedEmail,
	sendWelcome: sendWelcomeEmail,
	sendSecurityAlert: sendSecurityAlertEmail,
	sendMaintenanceNotice: sendMaintenanceNoticeEmail,
	sendAccountDeletionConfirmation: sendAccountDeletionConfirmationEmail,
};
