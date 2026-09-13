import type { JSX } from "react";
import {
	BodyText,
	EmailGreeting,
	EmailShell,
	OtpCodeBlock,
} from "./components";

interface OnboardingVerificationOtpProps {
	otpCode: string;
	supportEmail?: string;
	recipientName?: string | null;
}

export default function OnboardingVerificationOtp({
	otpCode,
	recipientName,
	supportEmail,
}: OnboardingVerificationOtpProps): JSX.Element {
	return (
		<EmailShell
			preview="Your Berean Study sign-in code"
			title="Your onboarding code"
			intro="Use this code to continue setting up your account. It expires in 5 minutes."
			supportEmail={supportEmail}
		>
			<EmailGreeting recipientName={recipientName} />
			<BodyText>
				Enter this code in Berean Study to continue setting up your account.
			</BodyText>
			<OtpCodeBlock label="Onboarding code" code={otpCode} />
		</EmailShell>
	);
}

OnboardingVerificationOtp.PreviewProps = {
	otpCode: "824 119",
	recipientName: "Jane Smith",
	supportEmail: "support@example.com",
} satisfies OnboardingVerificationOtpProps;
