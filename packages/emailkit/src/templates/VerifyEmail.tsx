import type { JSX } from "react";
import {
	BodyText,
	EmailGreeting,
	EmailShell,
	OtpCodeBlock,
} from "./components";

interface VerifyEmailOtpProps {
	otpCode: string;
	recipientName?: string | null;
	supportEmail?: string;
}

export default function VerifyEmailOtp({
	otpCode,
	recipientName,
	supportEmail,
}: VerifyEmailOtpProps): JSX.Element {
	return (
		<EmailShell
			preview="Your Berean Study verification code"
			title="Verify your email"
			intro="Use this code to confirm your email. It expires in 10 minutes."
			supportEmail={supportEmail}
		>
			<EmailGreeting recipientName={recipientName} />
			<BodyText>
				Enter this code in Berean Study to finish setting up your account.
			</BodyText>
			<OtpCodeBlock label="Verification code" code={otpCode} />
		</EmailShell>
	);
}

VerifyEmailOtp.PreviewProps = {
	otpCode: "824 119",
	recipientName: "Jane Smith",
	supportEmail: "support@example.com",
} satisfies VerifyEmailOtpProps;
