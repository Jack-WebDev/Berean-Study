import { defineNodeTestConfig } from "@berean-study/testkit/vitest";

// Database tests use the local Mailpit SMTP service and never send email.
process.env.EMAIL_PROVIDER ??= "smtp";
process.env.SMTP_HOST ??= "localhost";
process.env.SMTP_PORT ??= "1025";

export default defineNodeTestConfig();
