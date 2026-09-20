import { env } from "@berean-study/env/server";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import React from "react";
import { getResend } from "./client";

let smtpTransporter: nodemailer.Transporter | null = null;

function getFrom(from?: string) {
	const v = from?.trim() || env.RESEND_FROM_EMAIL.trim();

	return v;
}

function smtpTransportOptions(connectionTimeout?: number) {
	return {
		host: env.SMTP_HOST,
		port: env.SMTP_PORT,
		secure: env.SMTP_SECURE,
		auth: env.SMTP_USER
			? { user: env.SMTP_USER, pass: env.SMTP_PASS }
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

	if (env.EMAIL_PROVIDER === "smtp") {
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
