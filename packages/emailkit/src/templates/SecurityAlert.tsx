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

interface SecurityAlertEmailProps {
	eventName: string;
	eventTime: string;
	location?: string;
	device?: string;
	recipientName?: string | null;
	supportEmail?: string;
	actionUrl?: string;
	actionLabel?: string;
}

export default function SecurityAlertEmail({
	eventName,
	eventTime,
	location,
	device,
	recipientName,
	supportEmail,
	actionUrl,
	actionLabel = "Review account",
}: SecurityAlertEmailProps): JSX.Element {
	return (
		<EmailShell
			preview="Security alert for your Berean Study account"
			title="Security alert"
			intro="We noticed activity on your account."
			supportEmail={supportEmail}
		>
			<EmailGreeting recipientName={recipientName} />
			<BodyText>{eventName}</BodyText>
			<InfoBlock label="Activity" tone="warn">
				<Text
					style={{
						margin: 0,
						fontSize: "16px",
						fontWeight: 800,
						color: emailStyles.textMain,
					}}
				>
					{eventTime}
				</Text>
				{location ? <DetailText>Location: {location}</DetailText> : null}
				{device ? <DetailText>Device: {device}</DetailText> : null}
			</InfoBlock>
			<BodyText>If this was you, you do not need to do anything.</BodyText>
			<PrimaryButton href={actionUrl} label={actionLabel} />
			<PlainLinkBlock url={actionUrl} />
		</EmailShell>
	);
}

SecurityAlertEmail.PreviewProps = {
	eventName: "New sign-in to your account.",
	eventTime: "9 May 2026, 06:30",
	location: "Cape Town, South Africa",
	device: "Chrome on macOS",
	recipientName: "Jane Smith",
	supportEmail: "support@example.com",
	actionUrl: "https://bereanstudy.example.com/settings/account",
} satisfies SecurityAlertEmailProps;
