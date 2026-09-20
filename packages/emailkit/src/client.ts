import { env } from "@berean-study/env/server";
import { Resend } from "resend";

let resendInstance: Resend | null = null;

export const getResend = () => {
	if (!resendInstance) {
		resendInstance = new Resend(env.RESEND_API_KEY);
	}
	return resendInstance;
};

export const DEFAULT_FROM_EMAIL = env.RESEND_FROM_EMAIL;
