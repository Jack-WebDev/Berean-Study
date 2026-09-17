CREATE TABLE "community_post_bookmarks" (
	"user_id" text NOT NULL,
	"community_post_id" integer NOT NULL,
	CONSTRAINT "community_post_bookmarks_user_id_community_post_id_pk" PRIMARY KEY("user_id","community_post_id")
);
--> statement-breakpoint
CREATE TABLE "community_post_passages" (
	"community_post_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "community_post_passages_community_post_id_passage_id_pk" PRIMARY KEY("community_post_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "community_posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"author_user_id" text NOT NULL,
	"post_type" text NOT NULL,
	"visibility" text DEFAULT 'members' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"source_collection_id" integer,
	"source_note_id" integer,
	"source_testimony_id" integer,
	"source_prayer_id" integer,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	CONSTRAINT "community_posts_post_type_valid" CHECK ("community_posts"."post_type" IN (
				'collection',
				'note',
				'testimony',
				'prayer'
			)),
	CONSTRAINT "community_posts_visibility_valid" CHECK ("community_posts"."visibility" IN (
				'members',
				'public'
			)),
	CONSTRAINT "community_posts_snapshot_is_object" CHECK (jsonb_typeof("community_posts"."snapshot") = 'object'),
	CONSTRAINT "community_posts_single_source" CHECK (
				num_nonnulls(
					"community_posts"."source_collection_id",
					"community_posts"."source_note_id",
					"community_posts"."source_testimony_id",
					"community_posts"."source_prayer_id"
				) <= 1
			),
	CONSTRAINT "community_posts_collection_source_matches_type" CHECK (
				"community_posts"."source_collection_id" IS NULL
				OR "community_posts"."post_type" = 'collection'
			),
	CONSTRAINT "community_posts_note_source_matches_type" CHECK (
				"community_posts"."source_note_id" IS NULL
				OR "community_posts"."post_type" = 'note'
			),
	CONSTRAINT "community_posts_testimony_source_matches_type" CHECK (
				"community_posts"."source_testimony_id" IS NULL
				OR "community_posts"."post_type" = 'testimony'
			),
	CONSTRAINT "community_posts_prayer_source_matches_type" CHECK (
				"community_posts"."source_prayer_id" IS NULL
				OR "community_posts"."post_type" = 'prayer'
			)
);
--> statement-breakpoint
CREATE TABLE "community_reports" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "community_reports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"community_post_id" integer NOT NULL,
	"reported_by_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"resolution" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_reports_reason_not_blank" CHECK (btrim("community_reports"."reason") <> ''),
	CONSTRAINT "community_reports_details_not_blank" CHECK ("community_reports"."details" IS NULL OR btrim("community_reports"."details") <> ''),
	CONSTRAINT "community_reports_resolution_valid" CHECK ("community_reports"."resolution" IS NULL OR "community_reports"."resolution" IN (
				'dismissed',
				'action_taken'
			)),
	CONSTRAINT "community_reports_review_state_consistent" CHECK (
				(
					"community_reports"."resolution" IS NULL
					AND "community_reports"."reviewed_by_user_id" IS NULL
					AND "community_reports"."reviewed_at" IS NULL
				)
				OR
				(
					"community_reports"."resolution" IS NOT NULL
					AND "community_reports"."reviewed_by_user_id" IS NOT NULL
					AND "community_reports"."reviewed_at" IS NOT NULL
				)
			)
);
--> statement-breakpoint
CREATE TABLE "prayer_passages" (
	"prayer_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "prayer_passages_prayer_id_passage_id_pk" PRIMARY KEY("prayer_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "prayer_reflections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "prayer_reflections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"prayer_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prayer_reflections_content_not_blank" CHECK (btrim("prayer_reflections"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "prayers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "prayers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prayers_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "prayers_title_not_blank" CHECK (btrim("prayers"."title") <> ''),
	CONSTRAINT "prayers_content_not_blank" CHECK (btrim("prayers"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "testimonies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "testimonies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "testimonies_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "testimonies_title_not_blank" CHECK (btrim("testimonies"."title") <> ''),
	CONSTRAINT "testimonies_content_not_blank" CHECK (btrim("testimonies"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "testimony_notes" (
	"testimony_id" integer NOT NULL,
	"note_id" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "testimony_notes_testimony_id_note_id_pk" PRIMARY KEY("testimony_id","note_id")
);
--> statement-breakpoint
CREATE TABLE "testimony_passages" (
	"testimony_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "testimony_passages_testimony_id_passage_id_pk" PRIMARY KEY("testimony_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "testimony_prayers" (
	"testimony_id" integer NOT NULL,
	"prayer_id" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "testimony_prayers_testimony_id_prayer_id_pk" PRIMARY KEY("testimony_id","prayer_id")
);
--> statement-breakpoint
ALTER TABLE "community_post_bookmarks" ADD CONSTRAINT "community_post_bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_bookmarks" ADD CONSTRAINT "community_post_bookmarks_community_post_id_community_posts_id_fk" FOREIGN KEY ("community_post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_passages" ADD CONSTRAINT "community_post_passages_community_post_id_community_posts_id_fk" FOREIGN KEY ("community_post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_post_passages" ADD CONSTRAINT "community_post_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_source_collection_id_collections_id_fk" FOREIGN KEY ("source_collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_source_note_id_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_source_testimony_id_testimonies_id_fk" FOREIGN KEY ("source_testimony_id") REFERENCES "public"."testimonies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_source_prayer_id_prayers_id_fk" FOREIGN KEY ("source_prayer_id") REFERENCES "public"."prayers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_community_post_id_community_posts_id_fk" FOREIGN KEY ("community_post_id") REFERENCES "public"."community_posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reported_by_user_id_user_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_passages" ADD CONSTRAINT "prayer_passages_prayer_id_prayers_id_fk" FOREIGN KEY ("prayer_id") REFERENCES "public"."prayers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_passages" ADD CONSTRAINT "prayer_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_reflections" ADD CONSTRAINT "prayer_reflections_prayer_id_prayers_id_fk" FOREIGN KEY ("prayer_id") REFERENCES "public"."prayers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayers" ADD CONSTRAINT "prayers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimony_notes" ADD CONSTRAINT "testimony_notes_testimony_owner_fk" FOREIGN KEY ("testimony_id","user_id") REFERENCES "public"."testimonies"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimony_notes" ADD CONSTRAINT "testimony_notes_note_owner_fk" FOREIGN KEY ("note_id","user_id") REFERENCES "public"."notes"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimony_passages" ADD CONSTRAINT "testimony_passages_testimony_id_testimonies_id_fk" FOREIGN KEY ("testimony_id") REFERENCES "public"."testimonies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimony_passages" ADD CONSTRAINT "testimony_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimony_prayers" ADD CONSTRAINT "testimony_prayers_testimony_owner_fk" FOREIGN KEY ("testimony_id","user_id") REFERENCES "public"."testimonies"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimony_prayers" ADD CONSTRAINT "testimony_prayers_prayer_owner_fk" FOREIGN KEY ("prayer_id","user_id") REFERENCES "public"."prayers"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_post_bookmarks_community_post_id_idx" ON "community_post_bookmarks" USING btree ("community_post_id");--> statement-breakpoint
CREATE INDEX "community_post_passages_passage_id_idx" ON "community_post_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_posts_source_collection_unique" ON "community_posts" USING btree ("source_collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_posts_source_note_unique" ON "community_posts" USING btree ("source_note_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_posts_source_testimony_unique" ON "community_posts" USING btree ("source_testimony_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_posts_source_prayer_unique" ON "community_posts" USING btree ("source_prayer_id");--> statement-breakpoint
CREATE INDEX "community_posts_feed_idx" ON "community_posts" USING btree ("visibility","published_at" DESC NULLS LAST) WHERE "community_posts"."removed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "community_posts_type_feed_idx" ON "community_posts" USING btree ("post_type","visibility","published_at" DESC NULLS LAST) WHERE "community_posts"."removed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "community_posts_author_idx" ON "community_posts" USING btree ("author_user_id","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "community_reports_resolution_created_at_idx" ON "community_reports" USING btree ("resolution","created_at");--> statement-breakpoint
CREATE INDEX "community_reports_community_post_id_idx" ON "community_reports" USING btree ("community_post_id");--> statement-breakpoint
CREATE INDEX "prayer_passages_passage_id_idx" ON "prayer_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "prayer_reflections_prayer_id_created_at_idx" ON "prayer_reflections" USING btree ("prayer_id","created_at");--> statement-breakpoint
CREATE INDEX "prayers_user_created_at_idx" ON "prayers" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "testimonies_user_id_idx" ON "testimonies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "testimony_notes_note_id_idx" ON "testimony_notes" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "testimony_passages_passage_id_idx" ON "testimony_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "testimony_prayers_prayer_id_idx" ON "testimony_prayers" USING btree ("prayer_id");