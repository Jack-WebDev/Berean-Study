CREATE TABLE "moderation_actions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "moderation_actions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"community_post_id" integer NOT NULL,
	"moderator_user_id" text NOT NULL,
	"action" text NOT NULL,
	"rule_key" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_actions_action_check" CHECK ("moderation_actions"."action" IN (
				'removed',
				'removed_and_warned',
				'restricted',
				'dismissed',
				'restored'
			)),
	CONSTRAINT "moderation_actions_rule_check" CHECK (
				"moderation_actions"."action" IN ('dismissed', 'restored')
				OR "moderation_actions"."rule_key" IS NOT NULL
			),
	CONSTRAINT "moderation_actions_note_not_blank_check" CHECK ("moderation_actions"."note" IS NULL OR btrim("moderation_actions"."note") <> '')
);
--> statement-breakpoint
CREATE TABLE "posting_restrictions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posting_restrictions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"restricted_by_user_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"lifted_by_user_id" text,
	"lifted_at" timestamp with time zone,
	CONSTRAINT "posting_restrictions_ends_after_start_check" CHECK ("posting_restrictions"."ends_at" > "posting_restrictions"."started_at"),
	CONSTRAINT "posting_restrictions_lifted_state_check" CHECK (("posting_restrictions"."lifted_by_user_id" IS NULL) = ("posting_restrictions"."lifted_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "community_reports" DROP CONSTRAINT "community_reports_resolution_valid";--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_community_post_id_community_posts_id_fk" FOREIGN KEY ("community_post_id") REFERENCES "public"."community_posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_user_id_user_id_fk" FOREIGN KEY ("moderator_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_restrictions" ADD CONSTRAINT "posting_restrictions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_restrictions" ADD CONSTRAINT "posting_restrictions_restricted_by_user_id_user_id_fk" FOREIGN KEY ("restricted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posting_restrictions" ADD CONSTRAINT "posting_restrictions_lifted_by_user_id_user_id_fk" FOREIGN KEY ("lifted_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_actions_post_idx" ON "moderation_actions" USING btree ("community_post_id","created_at");--> statement-breakpoint
CREATE INDEX "posting_restrictions_user_idx" ON "posting_restrictions" USING btree ("user_id","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "community_reports_post_reporter_unique" ON "community_reports" USING btree ("community_post_id","reported_by_user_id");--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_resolution_valid" CHECK ("community_reports"."resolution" IS NULL OR "community_reports"."resolution" IN (
				'removed',
				'removed_and_warned',
				'restricted',
				'dismissed'
			));