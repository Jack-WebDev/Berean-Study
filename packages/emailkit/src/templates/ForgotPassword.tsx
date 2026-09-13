import type { JSX } from "react";
import {
	BodyText,
	EmailGreeting,
	EmailShell,
	OtpCodeBlock,
} from "./components";

interface ForgotPasswordOtpEmailProps {
	otpCode: string;
	recipientName?: string | null;
	supportEmail?: string;
}

export default function ForgotPasswordOtpEmail({
	otpCode,
	recipientName,
	supportEmail,
}: ForgotPasswordOtpEmailProps): JSX.Element {
	return (
		<EmailShell
			preview="Your Berean Study password reset code"
			title="Reset your password"
			intro="Use this code to reset your password. It expires in 5 minutes."
			supportEmail={supportEmail}
		>
			<EmailGreeting recipientName={recipientName} />
			<BodyText>
				Enter this code in Berean Study to choose a new password.
			</BodyText>
			<OtpCodeBlock label="One-time code" code={otpCode} />
			<BodyText>
				If you did not ask for this, you can ignore this email. Your password
				will not change.
			</BodyText>
		</EmailShell>
	);
}

ForgotPasswordOtpEmail.PreviewProps = {
	otpCode: "493 821",
	recipientName: "Jane Smith",
	supportEmail: "support@example.com",
} satisfies ForgotPasswordOtpEmailProps;
