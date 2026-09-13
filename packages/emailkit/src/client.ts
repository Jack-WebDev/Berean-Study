import { Resend } from "resend";

let resendInstance: Resend | null = null;

export const getResend = () => {
	if (!resendInstance) {
		const resendKey = process.env.RESEND_API_KEY;
		if (!resendKey) {
			throw new Error("RESEND_API_KEY is not set");
		}
		resendInstance = new Resend(resendKey);
	}
	return resendInstance;
};

export const DEFAULT_FROM_EMAIL =
	process.env.RESEND_FROM_EMAIL || "no-reply@example.com";
