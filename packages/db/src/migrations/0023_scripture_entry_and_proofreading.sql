CREATE TABLE "verse_text_revisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "verse_text_revisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"translation_id" integer NOT NULL,
	"verse_id" integer NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"entered_by_user_id" text NOT NULL,
	"based_on_revision_id" integer,
	"correction_reason" text,
	"checked_against" text,
	"submitted_at" timestamp with time zone,
	"proof_mark" text,
	"proofread_by_user_id" text,
	"proofread_at" timestamp with time zone,
	"suggested_text" text,
	"proof_note" text,
	"returned_by_user_id" text,
	"published_by_user_id" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verse_text_revisions_status_check" CHECK ("verse_text_revisions"."status" IN (
				'draft',
				'submitted',
				'needs_fix',
				'proofread',
				'published',
				'superseded'
			)),
	CONSTRAINT "verse_text_revisions_text_not_blank_check" CHECK (btrim("verse_text_revisions"."text") <> ''),
	CONSTRAINT "verse_text_revisions_proof_mark_check" CHECK ("verse_text_revisions"."proof_mark" IS NULL OR "verse_text_revisions"."proof_mark" IN ('matches', 'needs_fix')),
	CONSTRAINT "verse_text_revisions_mark_has_proofreader_check" CHECK (("verse_text_revisions"."proof_mark" IS NULL) = ("verse_text_revisions"."proofread_by_user_id" IS NULL)
				AND ("verse_text_revisions"."proof_mark" IS NULL) = ("verse_text_revisions"."proofread_at" IS NULL)),
	CONSTRAINT "verse_text_revisions_second_person_check" CHECK ("verse_text_revisions"."proofread_by_user_id" IS NULL OR "verse_text_revisions"."proofread_by_user_id" <> "verse_text_revisions"."entered_by_user_id"),
	CONSTRAINT "verse_text_revisions_passed_was_checked_check" CHECK ("verse_text_revisions"."status" NOT IN ('proofread', 'published', 'superseded') OR "verse_text_revisions"."proof_mark" = 'matches'),
	CONSTRAINT "verse_text_revisions_published_state_check" CHECK ("verse_text_revisions"."status" NOT IN ('published', 'superseded')
				OR ("verse_text_revisions"."published_by_user_id" IS NOT NULL AND "verse_text_revisions"."published_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "verse_text_revisions" ADD CONSTRAINT "verse_text_revisions_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_text_revisions" ADD CONSTRAINT "verse_text_revisions_verse_id_verses_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."verses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_text_revisions" ADD CONSTRAINT "verse_text_revisions_entered_by_user_id_user_id_fk" FOREIGN KEY ("entered_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_text_revisions" ADD CONSTRAINT "verse_text_revisions_based_on_revision_id_verse_text_revisions_id_fk" FOREIGN KEY ("based_on_revision_id") REFERENCES "public"."verse_text_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_text_revisions" ADD CONSTRAINT "verse_text_revisions_proofread_by_user_id_user_id_fk" FOREIGN KEY ("proofread_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_text_revisions" ADD CONSTRAINT "verse_text_revisions_returned_by_user_id_user_id_fk" FOREIGN KEY ("returned_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_text_revisions" ADD CONSTRAINT "verse_text_revisions_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "verse_text_revisions_one_open_idx" ON "verse_text_revisions" USING btree ("translation_id","verse_id") WHERE "verse_text_revisions"."status" IN ('draft', 'submitted', 'needs_fix', 'proofread');--> statement-breakpoint
CREATE UNIQUE INDEX "verse_text_revisions_one_published_idx" ON "verse_text_revisions" USING btree ("translation_id","verse_id") WHERE "verse_text_revisions"."status" = 'published';--> statement-breakpoint
CREATE INDEX "verse_text_revisions_verse_idx" ON "verse_text_revisions" USING btree ("verse_id");--> statement-breakpoint
CREATE INDEX "verse_text_revisions_status_idx" ON "verse_text_revisions" USING btree ("status");