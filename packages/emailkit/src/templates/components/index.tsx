import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import type { JSX, ReactNode } from "react";
import { getGreetingName } from "../helpers";

export const emailStyles = {
	brand: "#1A3453",
	accent: "#E5BF6D",
	success: "#16A34A",
	warn: "#D97706",
	danger: "#DC2626",
	textMain: "#0F1B2B",
	textMuted: "#5F6A77",
	border: "#E2DDD4",
	bg: "#FDFAF4",
	card: "#FFFFFF",
	soft: "#F6EFE3",
};

interface EmailShellProps {
	preview: string;
	title: string;
	intro?: ReactNode;
	supportEmail?: string;
	securityNote?: string;
	unsubscribeUrl?: string;
	children: ReactNode;
}

export function EmailShell({
	preview,
	title,
	intro,
	supportEmail,
	securityNote = "Berean Study will never ask you to share your password or verification code by email.",
	unsubscribeUrl,
	children,
}: EmailShellProps): JSX.Element {
	return (
		<Html>
			<Head />
			<Preview>{preview}</Preview>
			<Body
				style={{
					margin: 0,
					padding: 0,
					backgroundColor: emailStyles.bg,
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
					color: emailStyles.textMain,
				}}
			>
				<Container
					style={{
						maxWidth: "600px",
						margin: "0 auto",
						padding: "36px 16px",
					}}
				>
					<Section
						style={{
							backgroundColor: emailStyles.card,
							borderRadius: "18px",
							border: `1px solid ${emailStyles.border}`,
							borderTop: `4px solid ${emailStyles.accent}`,
							boxShadow: "0 18px 45px rgba(15, 27, 43, 0.08)",
							overflow: "hidden",
						}}
					>
						<Section
							style={{
								padding: "22px 28px 14px 28px",
								borderBottom: `1px solid ${emailStyles.border}`,
								background:
									"linear-gradient(180deg, rgba(26,52,83,0.10) 0%, rgba(255,255,255,0) 100%)",
							}}
						>
							<Text
								style={{
									margin: 0,
									fontSize: "12px",
									letterSpacing: "0.14em",
									textTransform: "uppercase",
									color: emailStyles.brand,
									fontWeight: 800,
									textAlign: "center",
								}}
							>
								Berean Study
							</Text>
							<Heading
								style={{
									margin: "10px 0 0 0",
									fontSize: "22px",
									textAlign: "center",
									lineHeight: "1.25",
									fontWeight: 900,
									color: emailStyles.textMain,
								}}
							>
								{title}
							</Heading>
							{intro ? (
								<Text
									style={{
										margin: "10px 0 0 0",
										fontSize: "13px",
										lineHeight: "1.6",
										color: emailStyles.textMuted,
										textAlign: "center",
									}}
								>
									{intro}
								</Text>
							) : null}
						</Section>
						<Section style={{ padding: "22px 28px 10px 28px" }}>
							{children}
						</Section>
						<Hr
							style={{
								borderColor: emailStyles.border,
								margin: "12px 28px 0 28px",
							}}
						/>
						<Section style={{ padding: "16px 28px 20px 28px" }}>
							<Text
								style={{
									margin: 0,
									fontSize: "11px",
									lineHeight: "1.7",
									fontWeight: 700,
									textAlign: "center",
								}}
							>
								{securityNote}
							</Text>
							{supportEmail ? (
								<Text
									style={{
										margin: "10px 0 0 0",
										fontSize: "11px",
										lineHeight: "1.7",
										color: emailStyles.textMuted,
										textAlign: "center",
									}}
								>
									Need help? Contact{" "}
									<a
										href={`mailto:${supportEmail}`}
										style={{
											color: emailStyles.brand,
											textDecoration: "none",
										}}
									>
										{supportEmail}
									</a>
									.
								</Text>
							) : null}
							{unsubscribeUrl ? (
								<Text
									style={{
										margin: "10px 0 0 0",
										fontSize: "11px",
										lineHeight: "1.7",
										color: emailStyles.textMuted,
										textAlign: "center",
									}}
								>
									<a
										href={unsubscribeUrl}
										style={{
											color: emailStyles.textMuted,
											textDecoration: "underline",
										}}
									>
										Unsubscribe
									</a>
								</Text>
							) : null}
						</Section>
					</Section>
					<Section style={{ paddingTop: "16px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "11px",
								color: "#7F8790",
								lineHeight: 1.7,
							}}
						>
							© {new Date().getFullYear()} Berean Study.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

export function EmailGreeting({
	recipientName,
}: {
	recipientName?: string | null;
}): JSX.Element {
	const greetingName = getGreetingName(recipientName);
	return (
		<Text
			style={{
				margin: "0 0 12px 0",
				fontSize: "14px",
				lineHeight: "1.7",
				color: emailStyles.textMain,
			}}
		>
			{greetingName ? `Hi ${greetingName},` : "Hi,"}
		</Text>
	);
}

export function BodyText({ children }: { children: ReactNode }): JSX.Element {
	return (
		<Text
			style={{
				margin: "0 0 16px 0",
				fontSize: "14px",
				lineHeight: "1.7",
				color: emailStyles.textMuted,
			}}
		>
			{children}
		</Text>
	);
}

export function OtpCodeBlock({
	label,
	code,
}: {
	label: string;
	code: string;
}): JSX.Element {
	return (
		<InfoBlock label={label}>
			<Text
				style={{
					margin: 0,
					textAlign: "center",
					fontSize: "28px",
					lineHeight: "1.2",
					fontWeight: 900,
					letterSpacing: "0.25em",
					color: emailStyles.textMain,
					padding: "6px 0 2px 0",
				}}
			>
				{code}
			</Text>
			<Text
				style={{
					margin: "10px 0 0 0",
					fontSize: "12px",
					lineHeight: "1.6",
					color: emailStyles.textMuted,
					textAlign: "center",
				}}
			>
				Do not share this code with anyone.
			</Text>
		</InfoBlock>
	);
}

export function InfoBlock({
	label,
	children,
	tone = "brand",
}: {
	label?: string;
	children: ReactNode;
	tone?: "brand" | "success" | "warn" | "danger";
}): JSX.Element {
	const toneColor = emailStyles[tone];
	return (
		<Section
			style={{
				border: `1px solid ${emailStyles.border}`,
				borderRadius: "16px",
				padding: "16px",
				background:
					"linear-gradient(180deg, rgba(26,52,83,0.06) 0%, rgba(15,27,43,0.02) 100%)",
				marginBottom: "16px",
			}}
		>
			{label ? (
				<Text
					style={{
						margin: "0 0 10px 0",
						fontSize: "12px",
						letterSpacing: "0.10em",
						textTransform: "uppercase",
						color: toneColor,
						fontWeight: 800,
						textAlign: "center",
					}}
				>
					{label}
				</Text>
			) : null}
			{children}
		</Section>
	);
}

export function PrimaryButton({
	href,
	label,
}: {
	href?: string;
	label?: string;
}): JSX.Element | null {
	if (!href || !label) return null;
	return (
		<Section style={{ paddingTop: "2px", paddingBottom: "14px" }}>
			<Button
				href={href}
				style={{
					display: "block",
					width: "50%",
					textAlign: "center",
					backgroundColor: emailStyles.brand,
					color: "#FFFFFF",
					borderRadius: "14px",
					padding: "14px 16px",
					fontSize: "14px",
					fontWeight: 800,
					textDecoration: "none",
					marginInline: "auto",
				}}
			>
				{label}
			</Button>
		</Section>
	);
}

export function PlainLinkBlock({ url }: { url?: string }): JSX.Element | null {
	if (!url) return null;
	return (
		<Section style={{ paddingTop: "4px" }}>
			<Text
				style={{
					margin: 0,
					fontSize: "12px",
					lineHeight: "1.7",
					color: emailStyles.textMuted,
				}}
			>
				If the button does not work, copy and paste this link into your browser:
			</Text>
			<Text
				style={{
					margin: "10px 0 0 0",
					fontSize: "12px",
					lineHeight: "1.7",
					color: emailStyles.textMain,
					wordBreak: "break-all",
					padding: "10px 12px",
					backgroundColor: emailStyles.soft,
					border: `1px solid ${emailStyles.border}`,
					borderRadius: "12px",
				}}
			>
				{url}
			</Text>
		</Section>
	);
}

export function DetailText({ children }: { children: ReactNode }): JSX.Element {
	return (
		<Text
			style={{
				margin: "8px 0 0 0",
				fontSize: "13px",
				lineHeight: "1.7",
				color: emailStyles.textMuted,
			}}
		>
			{children}
		</Text>
	);
}
