import { auth } from "@berean-study/auth";
import { sendAccountDeletedEmailSafely } from "@berean-study/auth/lifecycle-emails";
import { db } from "@berean-study/db";
import { deleteAccount } from "@berean-study/db/account-deletion";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { APIError } from "better-auth/api";
import { z } from "zod";

import { authMiddleware } from "@/middleware/auth";

/**
 * Replaces Better Auth's own delete, which can only remove a row outright and so
 * fails for anyone with a record of editorial or moderation work.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(z.object({ password: z.string().min(1) }))
	.handler(async ({ context, data }) => {
		if (!context.session) throw new Error("Unauthorized");

		try {
			await auth.api.verifyPassword({
				body: { password: data.password },
				headers: getRequestHeaders(),
			});
		} catch (error) {
			if (error instanceof APIError) {
				throw new Error("That password isn't right.");
			}
			throw error;
		}

		const { email, id, name } = context.session.user;
		await deleteAccount(db, id);
		await sendAccountDeletedEmailSafely({ email, name });
	});
