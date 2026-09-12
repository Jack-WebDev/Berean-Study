import type { authClient } from "@/lib/auth-client";

export type SecuritySession = Awaited<
	ReturnType<typeof authClient.listSessions>
>["data"][number];
