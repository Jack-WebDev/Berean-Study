import { render } from "@react-email/render";

import nodemailer from "nodemailer";
import React from "react";
import { getResend } from "./client";

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER ?? "smtp";
let smtpTransporter: nodemailer.Transporter | null = null;

function getFrom(from?: string) {
	const v = from?.trim() || process.env.RESEND_FROM_EMAIL?.trim();

	if (!v) throw new Error("RESEND_FROM_EMAIL is not set");
	return v;
}

function smtpTransportOptions(connectionTimeout?: number) {
	return {
		host: process.env.SMTP_HOST ?? "localhost",
		port: Number(process.env.SMTP_PORT ?? 1025),
		secure: (process.env.SMTP_SECURE ?? "false") === "true",
		auth: process.env.SMTP_USER
			? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
			: undefined,
		connectionTimeout,
	};
}

function getSmtpTransporter() {
	if (!smtpTransporter) {
		smtpTransporter = nodemailer.createTransport(smtpTransportOptions());
	}

	return smtpTransporter;
}

type SendReactEmailOpts<TProps extends Record<string, unknown>> = {
	to: string;
	subject: string;
	component: React.FC<TProps>;
	props: TProps;
	from?: string;
};

export async function sendEmail<TProps extends Record<string, unknown>>(
	opts: SendReactEmailOpts<TProps>,
) {
	const from = getFrom(opts.from);

	const element = React.createElement(opts.component, opts.props);
	const html = await render(element, { pretty: true });
	const text = await render(element, { plainText: true });

	if (EMAIL_PROVIDER === "smtp") {
		await getSmtpTransporter().sendMail({
			from,
			to: opts.to,
			subject: opts.subject,
			html,
			text,
		});
	} else {
		await getResend().emails.send({
			from,
			to: opts.to,
			subject: opts.subject,
			html,
			text,
		});
	}
}

export const rawEmailer = {
	send: sendEmail,
};
