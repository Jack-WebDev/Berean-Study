import type { JSX } from "react";
import {
	BodyText,
	EmailGreeting,
	EmailShell,
	PlainLinkBlock,
	PrimaryButton,
} from "./components";

interface WelcomeEmailProps {
	recipientName?: string | null;
	supportEmail?: string;
	appUrl?: string;
}

export default function WelcomeEmail({
	recipientName,
	supportEmail,
	appUrl,
}: WelcomeEmailProps): JSX.Element {
	return (
		<EmailShell
			preview="Welcome to Berean Study"
			title="Welcome to Berean Study"
			intro="We're glad you're here."
			supportEmail={supportEmail}
		>
			<EmailGreeting recipientName={recipientName} />
			<BodyText>Your account is ready for deeper study.</BodyText>
			<BodyText>
				Explore Scripture in context, examine the evidence, and follow the
				questions that matter to you.
			</BodyText>
			<PrimaryButton href={appUrl} label="Begin studying" />
			<PlainLinkBlock url={appUrl} />
		</EmailShell>
	);
}

WelcomeEmail.PreviewProps = {
	recipientName: "Jane Smith",
	supportEmail: "support@example.com",
	appUrl: "https://bereanstudy.example.com",
} satisfies WelcomeEmailProps;
