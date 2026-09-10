CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"details" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_log_action_not_empty_check" CHECK (btrim("audit_log"."action") <> ''),
	CONSTRAINT "audit_log_target_type_not_empty_check" CHECK (btrim("audit_log"."target_type") <> ''),
	CONSTRAINT "audit_log_target_id_not_empty_check" CHECK (btrim("audit_log"."target_id") <> ''),
	CONSTRAINT "audit_log_details_object_check" CHECK (
				"audit_log"."details" IS NULL
				OR jsonb_typeof("audit_log"."details") = 'object'
			)
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biblical_people" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "biblical_people_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "biblical_people_name_not_blank" CHECK (btrim("biblical_people"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "book_aliases" (
	"book_id" integer NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "book_aliases_pk" PRIMARY KEY("book_id","alias"),
	CONSTRAINT "book_aliases_alias_not_blank_check" CHECK ("book_aliases"."alias" = btrim("book_aliases"."alias") AND "book_aliases"."alias" <> '')
);
--> statement-breakpoint
CREATE TABLE "book_introduction_sections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "book_introduction_sections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"book_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "book_introduction_sections_book_type_unique" UNIQUE("book_id","type"),
	CONSTRAINT "book_introduction_sections_book_position_unique" UNIQUE("book_id","position"),
	CONSTRAINT "book_introduction_sections_type_not_empty_check" CHECK (btrim("book_introduction_sections"."type") <> ''),
	CONSTRAINT "book_introduction_sections_title_not_empty_check" CHECK (btrim("book_introduction_sections"."title") <> ''),
	CONSTRAINT "book_introduction_sections_content_not_empty_check" CHECK (btrim("book_introduction_sections"."content") <> ''),
	CONSTRAINT "book_introduction_sections_position_positive_check" CHECK ("book_introduction_sections"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "book_introductions" (
	"book_id" integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"user_id" text NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "bookmarks_user_id_passage_id_pk" PRIMARY KEY("user_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "books_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"testament" text NOT NULL,
	CONSTRAINT "books_name_unique" UNIQUE("name"),
	CONSTRAINT "books_slug_unique" UNIQUE("slug"),
	CONSTRAINT "books_testament_check" CHECK ("books"."testament" IN ('old', 'new')),
	CONSTRAINT "books_name_not_empty_check" CHECK (btrim("books"."name") <> ''),
	CONSTRAINT "books_slug_not_empty_check" CHECK (btrim("books"."slug") <> '')
);
--> statement-breakpoint
CREATE TABLE "canon_books" (
	"canon_id" integer NOT NULL,
	"book_id" integer NOT NULL,
	"canonical_order" smallint NOT NULL,
	CONSTRAINT "canon_books_pkey" PRIMARY KEY("canon_id","book_id"),
	CONSTRAINT "canon_books_order_unique" UNIQUE("canon_id","canonical_order"),
	CONSTRAINT "canon_books_order_positive_check" CHECK ("canon_books"."canonical_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "canon_traditions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "canon_traditions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "canon_traditions_name_unique" UNIQUE("name"),
	CONSTRAINT "canon_traditions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "canon_traditions_name_not_empty_check" CHECK (btrim("canon_traditions"."name") <> ''),
	CONSTRAINT "canon_traditions_slug_not_empty_check" CHECK (btrim("canon_traditions"."slug") <> '')
);
--> statement-breakpoint
CREATE TABLE "canonical_relationships" (
	"source_passage_id" integer NOT NULL,
	"target_passage_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"explanation" text NOT NULL,
	CONSTRAINT "canonical_relationships_source_passage_id_target_passage_id_relationship_type_pk" PRIMARY KEY("source_passage_id","target_passage_id","relationship_type"),
	CONSTRAINT "canonical_relationships_no_self_reference_check" CHECK ("canonical_relationships"."source_passage_id" <> "canonical_relationships"."target_passage_id"),
	CONSTRAINT "canonical_relationships_relationship_type_not_empty_check" CHECK (btrim("canonical_relationships"."relationship_type") <> ''),
	CONSTRAINT "canonical_relationships_explanation_not_empty_check" CHECK (btrim("canonical_relationships"."explanation") <> '')
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chapters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"book_id" integer NOT NULL,
	"versification_system_id" integer NOT NULL,
	"number" smallint NOT NULL,
	CONSTRAINT "chapters_versification_book_number_unique" UNIQUE("versification_system_id","book_id","number"),
	CONSTRAINT "chapters_number_positive_check" CHECK ("chapters"."number" > 0)
);
--> statement-breakpoint
CREATE TABLE "citations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "citations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer NOT NULL,
	"locator" text,
	"content_revision_id" integer NOT NULL,
	CONSTRAINT "citations_locator_not_empty_check" CHECK (
				"citations"."locator" IS NULL
				OR btrim("citations"."locator") <> ''
			)
);
--> statement-breakpoint
CREATE TABLE "claim_sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "claim_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"claim_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"relationship" text NOT NULL,
	"locator" text,
	CONSTRAINT "claim_sources_relationship_check" CHECK ("claim_sources"."relationship" IN ('supports', 'disputes', 'discusses')),
	CONSTRAINT "claim_sources_locator_not_empty_check" CHECK ("claim_sources"."locator" IS NULL OR btrim("claim_sources"."locator") <> '')
);
--> statement-breakpoint
CREATE TABLE "claim_usages" (
	"claim_id" integer NOT NULL,
	"content_revision_id" integer NOT NULL,
	CONSTRAINT "claim_usages_claim_id_content_revision_id_pk" PRIMARY KEY("claim_id","content_revision_id")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "claims_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"statement" text NOT NULL,
	"status" text DEFAULT 'unverified' NOT NULL,
	CONSTRAINT "claims_statement_not_empty_check" CHECK (btrim("claims"."statement") <> ''),
	CONSTRAINT "claims_status_check" CHECK ("claims"."status" IN ('unverified', 'verified', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "commentaries" (
	"passage_id" integer PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "commentaries_content_not_empty_check" CHECK (btrim("commentaries"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "commentary_sections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "commentary_sections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"passage_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "commentary_sections_passage_position_unique" UNIQUE("passage_id","position"),
	CONSTRAINT "commentary_sections_title_not_empty_check" CHECK (btrim("commentary_sections"."title") <> ''),
	CONSTRAINT "commentary_sections_content_not_empty_check" CHECK (btrim("commentary_sections"."content") <> ''),
	CONSTRAINT "commentary_sections_position_positive_check" CHECK ("commentary_sections"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "content_issue_comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_issue_comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content_issue_id" integer NOT NULL,
	"author_user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_issue_comments_content_not_empty_check" CHECK (btrim("content_issue_comments"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "content_issues" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_issues_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content_revision_id" integer NOT NULL,
	"reported_by_user_id" text,
	"issue_type" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_by_user_id" text,
	"closed_at" timestamp with time zone,
	CONSTRAINT "content_issues_issue_type_check" CHECK ("content_issues"."issue_type" IN (
				'factual_error',
				'citation_problem',
				'typo',
				'interpretation_concern',
				'broken_reference',
				'other'
			)),
	CONSTRAINT "content_issues_description_not_empty_check" CHECK (btrim("content_issues"."description") <> ''),
	CONSTRAINT "content_issues_status_check" CHECK ("content_issues"."status" IN (
				'open',
				'resolved',
				'dismissed'
			)),
	CONSTRAINT "content_issues_closed_state_check" CHECK (
				(
					"content_issues"."status" = 'open'
					AND "content_issues"."closed_by_user_id" IS NULL
					AND "content_issues"."closed_at" IS NULL
				)
				OR
				(
					"content_issues"."status" IN ('resolved', 'dismissed')
					AND "content_issues"."closed_by_user_id" IS NOT NULL
					AND "content_issues"."closed_at" IS NOT NULL
				)
			)
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_revisions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content" text NOT NULL,
	"title" text,
	"position" integer,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"book_introduction_section_id" integer,
	"commentary_passage_id" integer,
	"commentary_section_id" integer,
	CONSTRAINT "content_revisions_id_book_intro_section_unique" UNIQUE("id","book_introduction_section_id"),
	CONSTRAINT "content_revisions_id_commentary_unique" UNIQUE("id","commentary_passage_id"),
	CONSTRAINT "content_revisions_id_commentary_section_unique" UNIQUE("id","commentary_section_id"),
	CONSTRAINT "content_revisions_content_not_empty_check" CHECK (btrim("content_revisions"."content") <> ''),
	CONSTRAINT "content_revisions_exactly_one_target_check" CHECK (num_nonnulls(
				"content_revisions"."book_introduction_section_id",
					"content_revisions"."commentary_passage_id",
					"content_revisions"."commentary_section_id"
				) = 1),
	CONSTRAINT "content_revisions_snapshot_shape_check" CHECK (
				(
					"content_revisions"."commentary_passage_id" IS NOT NULL
					AND "content_revisions"."title" IS NULL
					AND "content_revisions"."position" IS NULL
				)
				OR (
					("content_revisions"."book_introduction_section_id" IS NOT NULL OR "content_revisions"."commentary_section_id" IS NOT NULL)
					AND "content_revisions"."title" IS NOT NULL
					AND btrim("content_revisions"."title") <> ''
					AND "content_revisions"."position" IS NOT NULL
					AND "content_revisions"."position" > 0
				)
			)
);
--> statement-breakpoint
CREATE TABLE "contributors" (
	"user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credited_people" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credited_people_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "credited_people_name_not_empty_check" CHECK (btrim("credited_people"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "cross_references" (
	"passage_id" integer NOT NULL,
	"related_passage_id" integer NOT NULL,
	"explanation" text NOT NULL,
	CONSTRAINT "cross_references_passage_id_related_passage_id_pk" PRIMARY KEY("passage_id","related_passage_id"),
	CONSTRAINT "cross_references_no_self_reference_check" CHECK ("cross_references"."passage_id" <> "cross_references"."related_passage_id"),
	CONSTRAINT "cross_references_explanation_not_empty_check" CHECK (btrim("cross_references"."explanation") <> '')
);
--> statement-breakpoint
CREATE TABLE "editorial_assignments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "editorial_assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content_revision_id" integer NOT NULL,
	"assignee_user_id" text NOT NULL,
	"assigned_by_user_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_assignments_revision_assignee_unique" UNIQUE("content_revision_id","assignee_user_id")
);
--> statement-breakpoint
CREATE TABLE "editorial_checklists" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "editorial_checklists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"requirement" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "editorial_checklists_requirement_unique" UNIQUE("requirement"),
	CONSTRAINT "editorial_checklists_position_unique" UNIQUE("position"),
	CONSTRAINT "editorial_checklists_requirement_not_empty_check" CHECK (btrim("editorial_checklists"."requirement") <> ''),
	CONSTRAINT "editorial_checklists_position_positive_check" CHECK ("editorial_checklists"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "editorial_checks" (
	"content_revision_id" integer NOT NULL,
	"editorial_checklist_id" integer NOT NULL,
	"checked_by_user_id" text NOT NULL,
	"result" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_checks_content_revision_id_editorial_checklist_id_pk" PRIMARY KEY("content_revision_id","editorial_checklist_id"),
	CONSTRAINT "editorial_checks_result_check" CHECK ("editorial_checks"."result" IN ('passed', 'failed', 'not_applicable'))
);
--> statement-breakpoint
CREATE TABLE "editorial_reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "editorial_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content_revision_id" integer NOT NULL,
	"reviewer_user_id" text NOT NULL,
	"decision" text NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editorial_reviews_revision_reviewer_unique" UNIQUE("content_revision_id","reviewer_user_id"),
	CONSTRAINT "editorial_reviews_decision_check" CHECK ("editorial_reviews"."decision" IN ('approved', 'changes_requested')),
	CONSTRAINT "editorial_reviews_feedback_not_blank_check" CHECK (
				"editorial_reviews"."feedback" IS NULL
				OR btrim("editorial_reviews"."feedback") <> ''
			),
	CONSTRAINT "editorial_reviews_changes_requested_feedback_check" CHECK (
				"editorial_reviews"."decision" <> 'changes_requested'
				OR "editorial_reviews"."feedback" IS NOT NULL
			)
);
--> statement-breakpoint
CREATE TABLE "event_passages" (
	"event_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "event_passages_event_id_passage_id_pk" PRIMARY KEY("event_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "event_people" (
	"event_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	CONSTRAINT "event_people_event_id_person_id_pk" PRIMARY KEY("event_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "event_places" (
	"event_id" integer NOT NULL,
	"place_id" integer NOT NULL,
	CONSTRAINT "event_places_event_id_place_id_pk" PRIMARY KEY("event_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"historical_period_id" integer,
	CONSTRAINT "events_name_not_blank" CHECK (btrim("events"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "highlights" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "highlights_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"translation_id" integer NOT NULL,
	"verse_id" integer NOT NULL,
	"start_offset" integer NOT NULL,
	"end_offset" integer NOT NULL,
	CONSTRAINT "highlights_exact_range_unique" UNIQUE("user_id","translation_id","verse_id","start_offset","end_offset"),
	CONSTRAINT "highlights_start_offset_check" CHECK ("highlights"."start_offset" >= 0),
	CONSTRAINT "highlights_end_offset_check" CHECK ("highlights"."end_offset" > "highlights"."start_offset")
);
--> statement-breakpoint
CREATE TABLE "historical_periods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "historical_periods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "historical_periods_name_not_blank" CHECK (btrim("historical_periods"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "interpretation_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interpretation_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"interpretive_question_id" integer NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT "interpretation_views_name_not_empty_check" CHECK (btrim("interpretation_views"."name") <> ''),
	CONSTRAINT "interpretation_views_content_not_empty_check" CHECK (btrim("interpretation_views"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "interpretive_questions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interpretive_questions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"passage_id" integer NOT NULL,
	"question" text NOT NULL,
	CONSTRAINT "interpretive_questions_question_not_empty_check" CHECK (btrim("interpretive_questions"."question") <> '')
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "languages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "languages_code_not_blank" CHECK (btrim("languages"."code") <> ''),
	CONSTRAINT "languages_name_not_blank" CHECK (btrim("languages"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "lexemes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lexemes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"language_id" integer NOT NULL,
	"lemma" text NOT NULL,
	CONSTRAINT "lexemes_lemma_not_blank" CHECK (btrim("lexemes"."lemma") <> '')
);
--> statement-breakpoint
CREATE TABLE "literary_units" (
	"passage_id" integer PRIMARY KEY NOT NULL,
	"parent_passage_id" integer,
	CONSTRAINT "literary_units_not_self_parent_check" CHECK ("literary_units"."parent_passage_id" IS NULL OR "literary_units"."parent_passage_id" <> "literary_units"."passage_id")
);
--> statement-breakpoint
CREATE TABLE "manuscripts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "manuscripts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"siglum" text NOT NULL,
	"name" text,
	CONSTRAINT "manuscripts_siglum_not_blank" CHECK (btrim("manuscripts"."siglum") <> ''),
	CONSTRAINT "manuscripts_name_not_blank" CHECK ("manuscripts"."name" IS NULL OR btrim("manuscripts"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"passage_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_content_not_empty_check" CHECK (btrim("notes"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "original_language_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "original_language_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"passage_id" integer NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "original_language_notes_passage_position_unique" UNIQUE("passage_id","position"),
	CONSTRAINT "original_language_notes_content_not_empty_check" CHECK (btrim("original_language_notes"."content") <> ''),
	CONSTRAINT "original_language_notes_position_positive_check" CHECK ("original_language_notes"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "passage_ranges" (
	"passage_id" integer NOT NULL,
	"versification_system_id" integer NOT NULL,
	"start_verse_id" integer NOT NULL,
	"end_verse_id" integer NOT NULL,
	CONSTRAINT "passage_ranges_pk" PRIMARY KEY("passage_id","versification_system_id")
);
--> statement-breakpoint
CREATE TABLE "passages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "passages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"book_id" integer NOT NULL,
	"title" text,
	CONSTRAINT "passages_title_not_empty_check" CHECK ("passages"."title" IS NULL OR btrim("passages"."title") <> '')
);
--> statement-breakpoint
CREATE TABLE "person_aliases" (
	"person_id" integer NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "person_aliases_person_id_alias_pk" PRIMARY KEY("person_id","alias"),
	CONSTRAINT "person_aliases_alias_not_blank" CHECK (btrim("person_aliases"."alias") <> '')
);
--> statement-breakpoint
CREATE TABLE "person_passages" (
	"person_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "person_passages_person_id_passage_id_pk" PRIMARY KEY("person_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "person_relationships" (
	"source_person_id" integer NOT NULL,
	"target_person_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	CONSTRAINT "person_relationships_source_person_id_target_person_id_relationship_type_pk" PRIMARY KEY("source_person_id","target_person_id","relationship_type"),
	CONSTRAINT "person_relationships_different_people" CHECK ("person_relationships"."source_person_id" <> "person_relationships"."target_person_id"),
	CONSTRAINT "person_relationships_relationship_type_not_blank" CHECK (btrim("person_relationships"."relationship_type") <> '')
);
--> statement-breakpoint
CREATE TABLE "place_aliases" (
	"place_id" integer NOT NULL,
	"alias" text NOT NULL,
	CONSTRAINT "place_aliases_place_id_alias_pk" PRIMARY KEY("place_id","alias"),
	CONSTRAINT "place_aliases_alias_not_blank" CHECK (btrim("place_aliases"."alias") <> '')
);
--> statement-breakpoint
CREATE TABLE "place_passages" (
	"place_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "place_passages_place_id_passage_id_pk" PRIMARY KEY("place_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "place_relationships" (
	"source_place_id" integer NOT NULL,
	"target_place_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	CONSTRAINT "place_relationships_source_place_id_target_place_id_relationship_type_pk" PRIMARY KEY("source_place_id","target_place_id","relationship_type"),
	CONSTRAINT "place_relationships_different_places" CHECK ("place_relationships"."source_place_id" <> "place_relationships"."target_place_id"),
	CONSTRAINT "place_relationships_relationship_type_not_blank" CHECK (btrim("place_relationships"."relationship_type") <> '')
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "places_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "places_name_not_blank" CHECK (btrim("places"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "publication_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "publication_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content_revision_id" integer NOT NULL,
	"action" text NOT NULL,
	"performed_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_history_action_check" CHECK ("publication_history"."action" IN ('published', 'corrected', 'republished', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "published_book_introduction_sections" (
	"book_introduction_section_id" integer NOT NULL,
	"content_revision_id" integer NOT NULL,
	CONSTRAINT "published_book_introduction_sections_book_introduction_section_id_pk" PRIMARY KEY("book_introduction_section_id")
);
--> statement-breakpoint
CREATE TABLE "published_commentaries" (
	"passage_id" integer NOT NULL,
	"content_revision_id" integer NOT NULL,
	CONSTRAINT "published_commentaries_passage_id_pk" PRIMARY KEY("passage_id")
);
--> statement-breakpoint
CREATE TABLE "published_commentary_sections" (
	"commentary_section_id" integer NOT NULL,
	"content_revision_id" integer NOT NULL,
	CONSTRAINT "published_commentary_sections_commentary_section_id_pk" PRIMARY KEY("commentary_section_id")
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reading_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"passage_id" integer NOT NULL,
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_positions" (
	"user_id" text NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "reading_positions_pkey" PRIMARY KEY("user_id")
);
--> statement-breakpoint
CREATE TABLE "research_note_sources" (
	"research_note_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"locator" text,
	CONSTRAINT "research_note_sources_pkey" PRIMARY KEY("research_note_id","source_id"),
	CONSTRAINT "research_note_sources_locator_not_empty_check" CHECK ("research_note_sources"."locator" IS NULL OR btrim("research_note_sources"."locator") <> '')
);
--> statement-breakpoint
CREATE TABLE "research_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "research_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"book_id" integer,
	"passage_id" integer,
	"content" text NOT NULL,
	CONSTRAINT "research_notes_target_check" CHECK (num_nonnulls("research_notes"."book_id", "research_notes"."passage_id") = 1),
	CONSTRAINT "research_notes_content_not_empty_check" CHECK (btrim("research_notes"."content") <> '')
);
--> statement-breakpoint
CREATE TABLE "source_credits" (
	"source_id" integer NOT NULL,
	"credited_person_id" integer NOT NULL,
	"role" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "source_credits_pk" PRIMARY KEY("source_id","credited_person_id","role"),
	CONSTRAINT "source_credits_source_position_unique" UNIQUE("source_id","position"),
	CONSTRAINT "source_credits_role_not_empty_check" CHECK (btrim("source_credits"."role") <> ''),
	CONSTRAINT "source_credits_position_positive_check" CHECK ("source_credits"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "source_excerpts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_excerpts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_id" integer NOT NULL,
	"locator" text,
	"text" text NOT NULL,
	CONSTRAINT "source_excerpts_locator_not_empty_check" CHECK ("source_excerpts"."locator" IS NULL OR btrim("source_excerpts"."locator") <> ''),
	CONSTRAINT "source_excerpts_text_not_empty_check" CHECK (btrim("source_excerpts"."text") <> '')
);
--> statement-breakpoint
CREATE TABLE "source_links" (
	"source_id" integer NOT NULL,
	"url" text NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "source_links_pkey" PRIMARY KEY("source_id","url"),
	CONSTRAINT "source_links_url_not_empty_check" CHECK (btrim("source_links"."url") <> ''),
	CONSTRAINT "source_links_kind_not_empty_check" CHECK (btrim("source_links"."kind") <> '')
);
--> statement-breakpoint
CREATE TABLE "source_text_editions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_text_editions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"language_id" integer NOT NULL,
	"versification_system_id" integer NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	CONSTRAINT "source_text_editions_name_unique" UNIQUE("name"),
	CONSTRAINT "source_text_editions_abbreviation_unique" UNIQUE("abbreviation"),
	CONSTRAINT "source_text_editions_name_not_blank" CHECK (btrim("source_text_editions"."name") <> ''),
	CONSTRAINT "source_text_editions_abbreviation_not_blank" CHECK (btrim("source_text_editions"."abbreviation") <> '')
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"type" text NOT NULL,
	"publication_year" integer,
	CONSTRAINT "sources_title_not_empty_check" CHECK (btrim("sources"."title") <> ''),
	CONSTRAINT "sources_type_not_empty_check" CHECK (btrim("sources"."type") <> '')
);
--> statement-breakpoint
CREATE TABLE "study_trail_items" (
	"study_trail_id" integer NOT NULL,
	"position" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "study_trail_items_study_trail_id_position_pk" PRIMARY KEY("study_trail_id","position"),
	CONSTRAINT "study_trail_items_position_positive" CHECK ("study_trail_items"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "study_trails" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "study_trails_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "study_trails_title_not_blank" CHECK (btrim("study_trails"."title") <> '')
);
--> statement-breakpoint
CREATE TABLE "textual_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "textual_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"passage_id" integer NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "textual_notes_passage_position_unique" UNIQUE("passage_id","position"),
	CONSTRAINT "textual_notes_content_not_empty_check" CHECK (btrim("textual_notes"."content") <> ''),
	CONSTRAINT "textual_notes_position_positive_check" CHECK ("textual_notes"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "textual_variant_witnesses" (
	"textual_variant_id" integer NOT NULL,
	"manuscript_id" integer NOT NULL,
	CONSTRAINT "textual_variant_witnesses_textual_variant_id_manuscript_id_pk" PRIMARY KEY("textual_variant_id","manuscript_id")
);
--> statement-breakpoint
CREATE TABLE "textual_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "textual_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"textual_note_id" integer NOT NULL,
	"reading" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "textual_variants_reading_not_blank" CHECK (btrim("textual_variants"."reading") <> ''),
	CONSTRAINT "textual_variants_position_positive" CHECK ("textual_variants"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "theme_passages" (
	"theme_id" integer NOT NULL,
	"passage_id" integer NOT NULL,
	CONSTRAINT "theme_passages_theme_id_passage_id_pk" PRIMARY KEY("theme_id","passage_id")
);
--> statement-breakpoint
CREATE TABLE "theme_relationships" (
	"source_theme_id" integer NOT NULL,
	"target_theme_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	CONSTRAINT "theme_relationships_source_theme_id_target_theme_id_relationship_type_pk" PRIMARY KEY("source_theme_id","target_theme_id","relationship_type"),
	CONSTRAINT "theme_relationships_different_themes" CHECK ("theme_relationships"."source_theme_id" <> "theme_relationships"."target_theme_id"),
	CONSTRAINT "theme_relationships_relationship_type_not_blank" CHECK (btrim("theme_relationships"."relationship_type") <> ''),
	CONSTRAINT "theme_relationships_relationship_type_valid" CHECK ("theme_relationships"."relationship_type" IN (
				'broader_than',
				'narrower_than',
				'related_to'
			))
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "themes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "themes_name_unique" UNIQUE("name"),
	CONSTRAINT "themes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "themes_name_not_empty_check" CHECK (btrim("themes"."name") <> ''),
	CONSTRAINT "themes_slug_not_empty_check" CHECK (btrim("themes"."slug") <> '')
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "translations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"versification_system_id" integer NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "translations_name_unique" UNIQUE("name"),
	CONSTRAINT "translations_abbreviation_unique" UNIQUE("abbreviation"),
	CONSTRAINT "translations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "translations_name_not_empty_check" CHECK (btrim("translations"."name") <> ''),
	CONSTRAINT "translations_abbreviation_not_empty_check" CHECK (btrim("translations"."abbreviation") <> ''),
	CONSTRAINT "translations_slug_not_empty_check" CHECK (btrim("translations"."slug") <> '')
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preferred_canon_tradition_id" integer,
	"preferred_translation_id" integer
);
--> statement-breakpoint
CREATE TABLE "verse_texts" (
	"translation_id" integer NOT NULL,
	"verse_id" integer NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "verse_texts_translation_id_verse_id_pk" PRIMARY KEY("translation_id","verse_id"),
	CONSTRAINT "verse_texts_text_not_empty_check" CHECK (btrim("verse_texts"."text") <> '')
);
--> statement-breakpoint
CREATE TABLE "verses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "verses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"chapter_id" integer NOT NULL,
	"number" integer NOT NULL,
	CONSTRAINT "verses_chapter_id_number_unique" UNIQUE("chapter_id","number"),
	CONSTRAINT "verses_number_positive_check" CHECK ("verses"."number" > 0)
);
--> statement-breakpoint
CREATE TABLE "versification_systems" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "versification_systems_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "versification_systems_name_unique" UNIQUE("name"),
	CONSTRAINT "versification_systems_slug_unique" UNIQUE("slug"),
	CONSTRAINT "versification_systems_name_not_empty_check" CHECK (btrim("versification_systems"."name") <> ''),
	CONSTRAINT "versification_systems_slug_not_empty_check" CHECK (btrim("versification_systems"."slug") <> '')
);
--> statement-breakpoint
CREATE TABLE "word_occurrences" (
	"verse_id" integer NOT NULL,
	"source_text_edition_id" integer NOT NULL,
	"position" integer NOT NULL,
	"form" text NOT NULL,
	"lexeme_id" integer,
	CONSTRAINT "word_occurrences_source_text_edition_id_verse_id_position_pk" PRIMARY KEY("source_text_edition_id","verse_id","position"),
	CONSTRAINT "word_occurrences_position_positive" CHECK ("word_occurrences"."position" > 0),
	CONSTRAINT "word_occurrences_form_not_blank" CHECK (btrim("word_occurrences"."form") <> '')
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_aliases" ADD CONSTRAINT "book_aliases_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_introduction_sections" ADD CONSTRAINT "book_introduction_sections_book_id_book_introductions_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."book_introductions"("book_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_introductions" ADD CONSTRAINT "book_introductions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canon_books" ADD CONSTRAINT "canon_books_canon_id_canon_traditions_id_fk" FOREIGN KEY ("canon_id") REFERENCES "public"."canon_traditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canon_books" ADD CONSTRAINT "canon_books_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_relationships" ADD CONSTRAINT "canonical_relationships_source_passage_id_passages_id_fk" FOREIGN KEY ("source_passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canonical_relationships" ADD CONSTRAINT "canonical_relationships_target_passage_id_passages_id_fk" FOREIGN KEY ("target_passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_versification_system_id_versification_systems_id_fk" FOREIGN KEY ("versification_system_id") REFERENCES "public"."versification_systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_sources" ADD CONSTRAINT "claim_sources_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_sources" ADD CONSTRAINT "claim_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_usages" ADD CONSTRAINT "claim_usages_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_usages" ADD CONSTRAINT "claim_usages_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentaries" ADD CONSTRAINT "commentaries_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentary_sections" ADD CONSTRAINT "commentary_sections_passage_id_commentaries_passage_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."commentaries"("passage_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_issue_comments" ADD CONSTRAINT "content_issue_comments_content_issue_id_content_issues_id_fk" FOREIGN KEY ("content_issue_id") REFERENCES "public"."content_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_issue_comments" ADD CONSTRAINT "content_issue_comments_author_user_id_contributors_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."contributors"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_issues" ADD CONSTRAINT "content_issues_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_issues" ADD CONSTRAINT "content_issues_reported_by_user_id_user_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_issues" ADD CONSTRAINT "content_issues_closed_by_user_id_contributors_user_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."contributors"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_book_introduction_section_id_book_introduction_sections_id_fk" FOREIGN KEY ("book_introduction_section_id") REFERENCES "public"."book_introduction_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_commentary_passage_id_commentaries_passage_id_fk" FOREIGN KEY ("commentary_passage_id") REFERENCES "public"."commentaries"("passage_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_commentary_section_id_commentary_sections_id_fk" FOREIGN KEY ("commentary_section_id") REFERENCES "public"."commentary_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributors" ADD CONSTRAINT "contributors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_references" ADD CONSTRAINT "cross_references_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_references" ADD CONSTRAINT "cross_references_related_passage_id_passages_id_fk" FOREIGN KEY ("related_passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_assignee_user_id_contributors_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."contributors"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_assignments" ADD CONSTRAINT "editorial_assignments_assigned_by_user_id_contributors_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."contributors"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_checks" ADD CONSTRAINT "editorial_checks_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_checks" ADD CONSTRAINT "editorial_checks_editorial_checklist_id_editorial_checklists_id_fk" FOREIGN KEY ("editorial_checklist_id") REFERENCES "public"."editorial_checklists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_checks" ADD CONSTRAINT "editorial_checks_checked_by_user_id_contributors_user_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "public"."contributors"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_reviews" ADD CONSTRAINT "editorial_reviews_reviewer_user_id_contributors_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."contributors"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_passages" ADD CONSTRAINT "event_passages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_passages" ADD CONSTRAINT "event_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_person_id_biblical_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."biblical_people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_places" ADD CONSTRAINT "event_places_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_places" ADD CONSTRAINT "event_places_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_historical_period_id_historical_periods_id_fk" FOREIGN KEY ("historical_period_id") REFERENCES "public"."historical_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_verse_text_fk" FOREIGN KEY ("translation_id","verse_id") REFERENCES "public"."verse_texts"("translation_id","verse_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretation_views" ADD CONSTRAINT "interpretation_views_interpretive_question_id_interpretive_questions_id_fk" FOREIGN KEY ("interpretive_question_id") REFERENCES "public"."interpretive_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interpretive_questions" ADD CONSTRAINT "interpretive_questions_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexemes" ADD CONSTRAINT "lexemes_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "literary_units" ADD CONSTRAINT "literary_units_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "literary_units" ADD CONSTRAINT "literary_units_parent_passage_id_literary_units_passage_id_fk" FOREIGN KEY ("parent_passage_id") REFERENCES "public"."literary_units"("passage_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "original_language_notes" ADD CONSTRAINT "original_language_notes_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_ranges" ADD CONSTRAINT "passage_ranges_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_ranges" ADD CONSTRAINT "passage_ranges_versification_system_id_versification_systems_id_fk" FOREIGN KEY ("versification_system_id") REFERENCES "public"."versification_systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_ranges" ADD CONSTRAINT "passage_ranges_start_verse_id_verses_id_fk" FOREIGN KEY ("start_verse_id") REFERENCES "public"."verses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passage_ranges" ADD CONSTRAINT "passage_ranges_end_verse_id_verses_id_fk" FOREIGN KEY ("end_verse_id") REFERENCES "public"."verses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passages" ADD CONSTRAINT "passages_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_aliases" ADD CONSTRAINT "person_aliases_person_id_biblical_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."biblical_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_passages" ADD CONSTRAINT "person_passages_person_id_biblical_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."biblical_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_passages" ADD CONSTRAINT "person_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_source_person_id_biblical_people_id_fk" FOREIGN KEY ("source_person_id") REFERENCES "public"."biblical_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_relationships" ADD CONSTRAINT "person_relationships_target_person_id_biblical_people_id_fk" FOREIGN KEY ("target_person_id") REFERENCES "public"."biblical_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_aliases" ADD CONSTRAINT "place_aliases_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_passages" ADD CONSTRAINT "place_passages_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_passages" ADD CONSTRAINT "place_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_relationships" ADD CONSTRAINT "place_relationships_source_place_id_places_id_fk" FOREIGN KEY ("source_place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_relationships" ADD CONSTRAINT "place_relationships_target_place_id_places_id_fk" FOREIGN KEY ("target_place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_history" ADD CONSTRAINT "publication_history_content_revision_id_content_revisions_id_fk" FOREIGN KEY ("content_revision_id") REFERENCES "public"."content_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_history" ADD CONSTRAINT "publication_history_performed_by_user_id_user_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_book_introduction_sections" ADD CONSTRAINT "published_book_intro_sections_section_fk" FOREIGN KEY ("book_introduction_section_id") REFERENCES "public"."book_introduction_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_book_introduction_sections" ADD CONSTRAINT "published_book_intro_sections_revision_target_fk" FOREIGN KEY ("content_revision_id","book_introduction_section_id") REFERENCES "public"."content_revisions"("id","book_introduction_section_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_commentaries" ADD CONSTRAINT "published_commentaries_passage_id_commentaries_passage_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."commentaries"("passage_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_commentaries" ADD CONSTRAINT "published_commentaries_revision_target_fk" FOREIGN KEY ("content_revision_id","passage_id") REFERENCES "public"."content_revisions"("id","commentary_passage_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_commentary_sections" ADD CONSTRAINT "published_commentary_sections_commentary_section_id_commentary_sections_id_fk" FOREIGN KEY ("commentary_section_id") REFERENCES "public"."commentary_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_commentary_sections" ADD CONSTRAINT "published_commentary_sections_revision_target_fk" FOREIGN KEY ("content_revision_id","commentary_section_id") REFERENCES "public"."content_revisions"("id","commentary_section_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD CONSTRAINT "reading_positions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD CONSTRAINT "reading_positions_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_note_sources" ADD CONSTRAINT "research_note_sources_research_note_id_research_notes_id_fk" FOREIGN KEY ("research_note_id") REFERENCES "public"."research_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_note_sources" ADD CONSTRAINT "research_note_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_credits" ADD CONSTRAINT "source_credits_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_credits" ADD CONSTRAINT "source_credits_credited_person_id_credited_people_id_fk" FOREIGN KEY ("credited_person_id") REFERENCES "public"."credited_people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_excerpts" ADD CONSTRAINT "source_excerpts_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_links" ADD CONSTRAINT "source_links_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_text_editions" ADD CONSTRAINT "source_text_editions_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_text_editions" ADD CONSTRAINT "source_text_editions_versification_system_id_versification_systems_id_fk" FOREIGN KEY ("versification_system_id") REFERENCES "public"."versification_systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_trail_items" ADD CONSTRAINT "study_trail_items_study_trail_id_study_trails_id_fk" FOREIGN KEY ("study_trail_id") REFERENCES "public"."study_trails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_trail_items" ADD CONSTRAINT "study_trail_items_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_trails" ADD CONSTRAINT "study_trails_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textual_notes" ADD CONSTRAINT "textual_notes_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textual_variant_witnesses" ADD CONSTRAINT "textual_variant_witnesses_textual_variant_id_textual_variants_id_fk" FOREIGN KEY ("textual_variant_id") REFERENCES "public"."textual_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textual_variant_witnesses" ADD CONSTRAINT "textual_variant_witnesses_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "textual_variants" ADD CONSTRAINT "textual_variants_textual_note_id_textual_notes_id_fk" FOREIGN KEY ("textual_note_id") REFERENCES "public"."textual_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_passages" ADD CONSTRAINT "theme_passages_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_passages" ADD CONSTRAINT "theme_passages_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_relationships" ADD CONSTRAINT "theme_relationships_source_theme_id_themes_id_fk" FOREIGN KEY ("source_theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_relationships" ADD CONSTRAINT "theme_relationships_target_theme_id_themes_id_fk" FOREIGN KEY ("target_theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_versification_system_id_versification_systems_id_fk" FOREIGN KEY ("versification_system_id") REFERENCES "public"."versification_systems"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_preferred_canon_tradition_id_canon_traditions_id_fk" FOREIGN KEY ("preferred_canon_tradition_id") REFERENCES "public"."canon_traditions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_preferred_translation_id_translations_id_fk" FOREIGN KEY ("preferred_translation_id") REFERENCES "public"."translations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_texts" ADD CONSTRAINT "verse_texts_translation_id_translations_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."translations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_texts" ADD CONSTRAINT "verse_texts_verse_id_verses_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."verses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verses" ADD CONSTRAINT "verses_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_occurrences" ADD CONSTRAINT "word_occurrences_verse_id_verses_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."verses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_occurrences" ADD CONSTRAINT "word_occurrences_source_text_edition_id_source_text_editions_id_fk" FOREIGN KEY ("source_text_edition_id") REFERENCES "public"."source_text_editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_occurrences" ADD CONSTRAINT "word_occurrences_lexeme_id_lexemes_id_fk" FOREIGN KEY ("lexeme_id") REFERENCES "public"."lexemes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_target_history_idx" ON "audit_log" USING btree ("target_type","target_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_history_idx" ON "audit_log" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_occurred_at_idx" ON "audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "book_aliases_alias_lower_unique" ON "book_aliases" USING btree (lower("alias"));--> statement-breakpoint
CREATE INDEX "canonical_relationships_target_passage_id_idx" ON "canonical_relationships" USING btree ("target_passage_id");--> statement-breakpoint
CREATE INDEX "chapters_book_versification_idx" ON "chapters" USING btree ("book_id","versification_system_id");--> statement-breakpoint
CREATE INDEX "citations_source_id_index" ON "citations" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "citations_content_revision_id_index" ON "citations" USING btree ("content_revision_id");--> statement-breakpoint
CREATE INDEX "claim_sources_claim_id_idx" ON "claim_sources" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claim_sources_source_id_idx" ON "claim_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "claim_usages_content_revision_id_idx" ON "claim_usages" USING btree ("content_revision_id");--> statement-breakpoint
CREATE INDEX "content_issue_comments_issue_created_at_idx" ON "content_issue_comments" USING btree ("content_issue_id","created_at");--> statement-breakpoint
CREATE INDEX "content_issues_revision_status_idx" ON "content_issues" USING btree ("content_revision_id","status");--> statement-breakpoint
CREATE INDEX "content_issues_open_created_at_idx" ON "content_issues" USING btree ("created_at") WHERE "content_issues"."status" = 'open';--> statement-breakpoint
CREATE INDEX "content_revisions_book_intro_section_idx" ON "content_revisions" USING btree ("book_introduction_section_id","created_at") WHERE "content_revisions"."book_introduction_section_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "content_revisions_commentary_idx" ON "content_revisions" USING btree ("commentary_passage_id","created_at") WHERE "content_revisions"."commentary_passage_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "content_revisions_commentary_section_idx" ON "content_revisions" USING btree ("commentary_section_id","created_at") WHERE "content_revisions"."commentary_section_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "content_revisions_created_by_created_at_idx" ON "content_revisions" USING btree ("created_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "cross_references_related_passage_id_idx" ON "cross_references" USING btree ("related_passage_id");--> statement-breakpoint
CREATE INDEX "editorial_assignments_assignee_assigned_at_idx" ON "editorial_assignments" USING btree ("assignee_user_id","assigned_at");--> statement-breakpoint
CREATE INDEX "event_passages_passage_id_idx" ON "event_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "event_people_person_id_idx" ON "event_people" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "event_places_place_id_idx" ON "event_places" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "events_historical_period_id_idx" ON "events" USING btree ("historical_period_id");--> statement-breakpoint
CREATE INDEX "highlights_translation_verse_idx" ON "highlights" USING btree ("translation_id","verse_id");--> statement-breakpoint
CREATE INDEX "interpretation_views_interpretive_question_id_idx" ON "interpretation_views" USING btree ("interpretive_question_id");--> statement-breakpoint
CREATE INDEX "interpretive_questions_passage_id_idx" ON "interpretive_questions" USING btree ("passage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "languages_code_unique" ON "languages" USING btree ("code");--> statement-breakpoint
CREATE INDEX "lexemes_language_id_idx" ON "lexemes" USING btree ("language_id");--> statement-breakpoint
CREATE INDEX "literary_units_parent_passage_id_idx" ON "literary_units" USING btree ("parent_passage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "manuscripts_siglum_unique" ON "manuscripts" USING btree ("siglum");--> statement-breakpoint
CREATE INDEX "notes_user_id_passage_id_idx" ON "notes" USING btree ("user_id","passage_id");--> statement-breakpoint
CREATE INDEX "passage_ranges_start_verse_id_idx" ON "passage_ranges" USING btree ("start_verse_id");--> statement-breakpoint
CREATE INDEX "passage_ranges_end_verse_id_idx" ON "passage_ranges" USING btree ("end_verse_id");--> statement-breakpoint
CREATE INDEX "passages_book_id_idx" ON "passages" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "person_passages_passage_id_idx" ON "person_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "person_relationships_target_person_id_idx" ON "person_relationships" USING btree ("target_person_id");--> statement-breakpoint
CREATE INDEX "place_passages_passage_id_idx" ON "place_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "place_relationships_target_place_id_idx" ON "place_relationships" USING btree ("target_place_id");--> statement-breakpoint
CREATE INDEX "publication_history_revision_created_at_idx" ON "publication_history" USING btree ("content_revision_id","created_at");--> statement-breakpoint
CREATE INDEX "reading_history_user_visited_at_idx" ON "reading_history" USING btree ("user_id","visited_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "research_note_sources_source_id_idx" ON "research_note_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "research_notes_book_id_idx" ON "research_notes" USING btree ("book_id") WHERE "research_notes"."book_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "research_notes_passage_id_idx" ON "research_notes" USING btree ("passage_id") WHERE "research_notes"."passage_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "source_credits_credited_person_id_idx" ON "source_credits" USING btree ("credited_person_id");--> statement-breakpoint
CREATE INDEX "source_excerpts_source_id_idx" ON "source_excerpts" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_text_editions_versification_system_id_idx" ON "source_text_editions" USING btree ("versification_system_id");--> statement-breakpoint
CREATE UNIQUE INDEX "study_trail_items_trail_passage_unique" ON "study_trail_items" USING btree ("study_trail_id","passage_id");--> statement-breakpoint
CREATE INDEX "study_trail_items_passage_id_idx" ON "study_trail_items" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "study_trails_user_id_idx" ON "study_trails" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "textual_variant_witnesses_manuscript_id_idx" ON "textual_variant_witnesses" USING btree ("manuscript_id");--> statement-breakpoint
CREATE UNIQUE INDEX "textual_variants_note_position_unique" ON "textual_variants" USING btree ("textual_note_id","position");--> statement-breakpoint
CREATE INDEX "theme_passages_passage_id_idx" ON "theme_passages" USING btree ("passage_id");--> statement-breakpoint
CREATE INDEX "theme_relationships_target_theme_id_idx" ON "theme_relationships" USING btree ("target_theme_id");--> statement-breakpoint
CREATE INDEX "translations_versification_system_id_idx" ON "translations" USING btree ("versification_system_id");--> statement-breakpoint
CREATE INDEX "verse_texts_verse_id_idx" ON "verse_texts" USING btree ("verse_id");--> statement-breakpoint
CREATE INDEX "word_occurrences_verse_id_idx" ON "word_occurrences" USING btree ("verse_id");--> statement-breakpoint
CREATE INDEX "word_occurrences_lexeme_id_idx" ON "word_occurrences" USING btree ("lexeme_id");
