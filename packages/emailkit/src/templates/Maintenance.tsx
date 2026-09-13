import { Text } from "@react-email/components";
import type { JSX } from "react";
import {
	BodyText,
	DetailText,
	EmailGreeting,
	EmailShell,
	emailStyles,
	InfoBlock,
	PlainLinkBlock,
	PrimaryButton,
} from "./components";

interface MaintenanceNoticeEmailProps {
	startsAt: string;
	endsAt?: string;
	statusPageUrl?: string;
	recipientName?: string | null;
	supportEmail?: string;
}

export default function MaintenanceNoticeEmail({
	startsAt,
	endsAt,
	statusPageUrl,
	recipientName,
	supportEmail,
}: MaintenanceNoticeEmailProps): JSX.Element {
	return (
		<EmailShell
			preview="Berean Study maintenance notice"
			title="Planned maintenance"
			intro="Berean Study may be unavailable for a short time."
			supportEmail={supportEmail}
			securityNote="You can check the status page for updates."
		>
			<EmailGreeting recipientName={recipientName} />
			<BodyText>We are doing planned maintenance.</BodyText>
			<InfoBlock label="Time" tone="warn">
				<Text
					style={{
						margin: 0,
						fontSize: "16px",
						fontWeight: 800,
						color: emailStyles.textMain,
					}}
				>
					Starts: {startsAt}
				</Text>
				{endsAt ? <DetailText>Ends: {endsAt}</DetailText> : null}
			</InfoBlock>
			<PrimaryButton href={statusPageUrl} label="View status" />
			<PlainLinkBlock url={statusPageUrl} />
		</EmailShell>
	);
}

MaintenanceNoticeEmail.PreviewProps = {
	startsAt: "12 May 2026, 22:00",
	endsAt: "12 May 2026, 23:00",
	statusPageUrl: "https://status.example.com",
	recipientName: "Jane Smith",
	supportEmail: "support@example.com",
} satisfies MaintenanceNoticeEmailProps;
