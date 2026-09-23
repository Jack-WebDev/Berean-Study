import { env } from "@berean-study/env/server";
import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import React from "react";
import { getResend } from "./client";

let mailpitTransporter: nodemailer.Transporter | null = null;

const mailpitTransportOptions = {
	host: "localhost",
	port: 1025,
	secure: false,
};

function getFrom(from?: string) {
	const value = from?.trim() || env.RESEND_FROM_EMAIL?.trim();

	if (!value) {
		throw new Error("RESEND_FROM_EMAIL must be configured to send email.");
	}

	return value;
}

function getMailpitTransporter() {
	if (!mailpitTransporter) {
		mailpitTransporter = nodemailer.createTransport(mailpitTransportOptions);
	}

	return mailpitTransporter;
}

type SendReactEmailOpts<TProps extends Record<string, unknown>> = {
	to: string;
	subject: string;
	component: (props: TProps) => React.ReactNode;
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

	if (env.NODE_ENV === "development") {
		await getMailpitTransporter().sendMail({
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
