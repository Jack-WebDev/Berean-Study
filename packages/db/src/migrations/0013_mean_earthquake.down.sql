ALTER TABLE "rate_limit" DROP CONSTRAINT "rate_limit_key_unique";
--> statement-breakpoint
ALTER TABLE "rate_limit" DROP CONSTRAINT "rate_limit_pkey";
--> statement-breakpoint
ALTER TABLE "rate_limit" DROP COLUMN "id";
--> statement-breakpoint
ALTER TABLE "rate_limit" ADD CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key");
