import type { JSX } from "react";
import { BodyText, EmailGreeting, EmailShell } from "./components";

interface AccountDeletionConfirmationEmailProps {
	recipientName?: string | null;
	supportEmail?: string;
}

export default function AccountDeletionConfirmationEmail({
	recipientName,
	supportEmail,
}: AccountDeletionConfirmationEmailProps): JSX.Element {
	return (
		<EmailShell
			preview="Your Berean Study account was deleted"
			title="Your account was deleted"
			intro="This confirms your account deletion."
			supportEmail={supportEmail}
		>
			<EmailGreeting recipientName={recipientName} />
			<BodyText>Your Berean Study account has been deleted.</BodyText>
			<BodyText>
				If this was a mistake, contact support as soon as possible.
			</BodyText>
		</EmailShell>
	);
}

AccountDeletionConfirmationEmail.PreviewProps = {
	recipientName: "Jane Smith",
	supportEmail: "support@example.com",
} satisfies AccountDeletionConfirmationEmailProps;
