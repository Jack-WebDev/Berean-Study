CREATE TABLE "account_suspensions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_suspensions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"suspended_by_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"lifted_by_user_id" text,
	"lifted_at" timestamp with time zone,
	CONSTRAINT "account_suspensions_reason_not_blank_check" CHECK (btrim("account_suspensions"."reason") <> ''),
	CONSTRAINT "account_suspensions_ends_after_start_check" CHECK ("account_suspensions"."ends_at" IS NULL OR "account_suspensions"."ends_at" > "account_suspensions"."started_at"),
	CONSTRAINT "account_suspensions_lifted_state_check" CHECK (("account_suspensions"."lifted_by_user_id" IS NULL) = ("account_suspensions"."lifted_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "change_proposals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "change_proposals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"proposer_user_id" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"decided_by_user_id" text,
	"decision_note" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_proposals_status_check" CHECK ("change_proposals"."status" IN ('proposed', 'applied', 'returned', 'rejected')),
	CONSTRAINT "change_proposals_reason_not_blank_check" CHECK (btrim("change_proposals"."reason") <> ''),
	CONSTRAINT "change_proposals_decider_not_proposer_check" CHECK ("change_proposals"."decided_by_user_id" <> "change_proposals"."proposer_user_id"),
	CONSTRAINT "change_proposals_decision_state_check" CHECK (
				(
					"change_proposals"."status" = 'proposed'
					AND "change_proposals"."decided_by_user_id" IS NULL
					AND "change_proposals"."decision_note" IS NULL
					AND "change_proposals"."decided_at" IS NULL
				)
				OR
				(
					"change_proposals"."status" <> 'proposed'
					AND "change_proposals"."decided_by_user_id" IS NOT NULL
					AND btrim("change_proposals"."decision_note") <> ''
					AND "change_proposals"."decided_at" IS NOT NULL
				)
			)
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "account_suspensions" ADD CONSTRAINT "account_suspensions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_suspensions" ADD CONSTRAINT "account_suspensions_suspended_by_user_id_user_id_fk" FOREIGN KEY ("suspended_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_suspensions" ADD CONSTRAINT "account_suspensions_lifted_by_user_id_user_id_fk" FOREIGN KEY ("lifted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_proposals" ADD CONSTRAINT "change_proposals_proposer_user_id_user_id_fk" FOREIGN KEY ("proposer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_proposals" ADD CONSTRAINT "change_proposals_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_suspensions_user_idx" ON "account_suspensions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "change_proposals_status_created_at_idx" ON "change_proposals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "change_proposals_target_idx" ON "change_proposals" USING btree ("target_type","target_id");