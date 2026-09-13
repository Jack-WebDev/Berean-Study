import type { JSX } from "react";
import {
	BodyText,
	EmailGreeting,
	EmailShell,
	PlainLinkBlock,
	PrimaryButton,
} from "./components";

interface AccountCreatedEmailProps {
	recipientName?: string | null;
	supportEmail?: string;
	appUrl?: string;
}

export default function AccountCreatedEmail({
	recipientName,
	supportEmail,
	appUrl,
}: AccountCreatedEmailProps): JSX.Element {
	return (
		<EmailShell
			preview="Your Berean Study account is ready"
			title="Your account is ready"
			intro="Start exploring Scripture in context."
			supportEmail={supportEmail}
		>
			<EmailGreeting recipientName={recipientName} />
			<BodyText>Your Berean Study account has been created.</BodyText>
			<PrimaryButton href={appUrl} label="Open Berean Study" />
			<PlainLinkBlock url={appUrl} />
		</EmailShell>
	);
}

AccountCreatedEmail.PreviewProps = {
	recipientName: "Jane Smith",
	supportEmail: "support@example.com",
	appUrl: "https://bereanstudy.example.com",
} satisfies AccountCreatedEmailProps;
