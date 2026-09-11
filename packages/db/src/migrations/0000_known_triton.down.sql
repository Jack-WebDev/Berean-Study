DROP INDEX IF EXISTS "word_occurrences_lexeme_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "word_occurrences_verse_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "verse_texts_verse_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "translations_versification_system_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "theme_relationships_target_theme_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "theme_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "textual_variants_note_position_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "textual_variant_witnesses_manuscript_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "study_trails_user_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "study_trail_items_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "study_trail_items_trail_passage_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "source_text_editions_versification_system_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "source_excerpts_source_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "source_credits_credited_person_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "research_notes_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "research_notes_book_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "research_note_sources_source_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "reading_history_user_visited_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "publication_history_revision_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "place_relationships_target_place_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "place_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "person_relationships_target_person_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "person_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "passages_book_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "passage_ranges_end_verse_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "passage_ranges_start_verse_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "notes_user_id_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "manuscripts_siglum_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "literary_units_parent_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "lexemes_language_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "languages_code_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "interpretive_questions_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "interpretation_views_interpretive_question_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "highlights_translation_verse_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "events_historical_period_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "event_places_place_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "event_people_person_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "event_passages_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "editorial_assignments_assignee_assigned_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "cross_references_related_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_revisions_created_by_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_revisions_commentary_section_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_revisions_commentary_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_revisions_book_intro_section_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_issues_open_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_issues_revision_status_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "content_issue_comments_issue_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "claim_usages_content_revision_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "claim_sources_source_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "claim_sources_claim_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "citations_content_revision_id_index";
--> statement-breakpoint
DROP INDEX IF EXISTS "citations_source_id_index";
--> statement-breakpoint
DROP INDEX IF EXISTS "chapters_book_versification_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "canonical_relationships_target_passage_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "book_aliases_alias_lower_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "verification_identifier_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "session_userId_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "account_userId_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "account_issuer_accountId_uidx";
--> statement-breakpoint
DROP INDEX IF EXISTS "audit_log_occurred_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "audit_log_actor_history_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "audit_log_target_history_idx";
--> statement-breakpoint
ALTER TABLE "word_occurrences" DROP CONSTRAINT IF EXISTS "word_occurrences_lexeme_id_lexemes_id_fk";
--> statement-breakpoint
ALTER TABLE "word_occurrences" DROP CONSTRAINT IF EXISTS "word_occurrences_source_text_edition_id_source_text_editions_id_fk";
--> statement-breakpoint
ALTER TABLE "word_occurrences" DROP CONSTRAINT IF EXISTS "word_occurrences_verse_id_verses_id_fk";
--> statement-breakpoint
ALTER TABLE "verses" DROP CONSTRAINT IF EXISTS "verses_chapter_id_chapters_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_texts" DROP CONSTRAINT IF EXISTS "verse_texts_verse_id_verses_id_fk";
--> statement-breakpoint
ALTER TABLE "verse_texts" DROP CONSTRAINT IF EXISTS "verse_texts_translation_id_translations_id_fk";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_preferred_translation_id_translations_id_fk";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_preferred_canon_tradition_id_canon_traditions_id_fk";
--> statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "user_preferences_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "translations" DROP CONSTRAINT IF EXISTS "translations_versification_system_id_versification_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "theme_relationships" DROP CONSTRAINT IF EXISTS "theme_relationships_target_theme_id_themes_id_fk";
--> statement-breakpoint
ALTER TABLE "theme_relationships" DROP CONSTRAINT IF EXISTS "theme_relationships_source_theme_id_themes_id_fk";
--> statement-breakpoint
ALTER TABLE "theme_passages" DROP CONSTRAINT IF EXISTS "theme_passages_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "theme_passages" DROP CONSTRAINT IF EXISTS "theme_passages_theme_id_themes_id_fk";
--> statement-breakpoint
ALTER TABLE "textual_variants" DROP CONSTRAINT IF EXISTS "textual_variants_textual_note_id_textual_notes_id_fk";
--> statement-breakpoint
ALTER TABLE "textual_variant_witnesses" DROP CONSTRAINT IF EXISTS "textual_variant_witnesses_manuscript_id_manuscripts_id_fk";
--> statement-breakpoint
ALTER TABLE "textual_variant_witnesses" DROP CONSTRAINT IF EXISTS "textual_variant_witnesses_textual_variant_id_textual_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "textual_notes" DROP CONSTRAINT IF EXISTS "textual_notes_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "study_trails" DROP CONSTRAINT IF EXISTS "study_trails_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "study_trail_items" DROP CONSTRAINT IF EXISTS "study_trail_items_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "study_trail_items" DROP CONSTRAINT IF EXISTS "study_trail_items_study_trail_id_study_trails_id_fk";
--> statement-breakpoint
ALTER TABLE "source_text_editions" DROP CONSTRAINT IF EXISTS "source_text_editions_versification_system_id_versification_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "source_text_editions" DROP CONSTRAINT IF EXISTS "source_text_editions_language_id_languages_id_fk";
--> statement-breakpoint
ALTER TABLE "source_links" DROP CONSTRAINT IF EXISTS "source_links_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "source_excerpts" DROP CONSTRAINT IF EXISTS "source_excerpts_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "source_credits" DROP CONSTRAINT IF EXISTS "source_credits_credited_person_id_credited_people_id_fk";
--> statement-breakpoint
ALTER TABLE "source_credits" DROP CONSTRAINT IF EXISTS "source_credits_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP CONSTRAINT IF EXISTS "research_notes_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "research_notes" DROP CONSTRAINT IF EXISTS "research_notes_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "research_note_sources" DROP CONSTRAINT IF EXISTS "research_note_sources_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "research_note_sources" DROP CONSTRAINT IF EXISTS "research_note_sources_research_note_id_research_notes_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP CONSTRAINT IF EXISTS "reading_positions_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_positions" DROP CONSTRAINT IF EXISTS "reading_positions_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_history" DROP CONSTRAINT IF EXISTS "reading_history_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "reading_history" DROP CONSTRAINT IF EXISTS "reading_history_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "published_commentary_sections" DROP CONSTRAINT IF EXISTS "published_commentary_sections_revision_target_fk";
--> statement-breakpoint
ALTER TABLE "published_commentary_sections" DROP CONSTRAINT IF EXISTS "published_commentary_sections_commentary_section_id_commentary_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "published_commentaries" DROP CONSTRAINT IF EXISTS "published_commentaries_revision_target_fk";
--> statement-breakpoint
ALTER TABLE "published_commentaries" DROP CONSTRAINT IF EXISTS "published_commentaries_passage_id_commentaries_passage_id_fk";
--> statement-breakpoint
ALTER TABLE "published_book_introduction_sections" DROP CONSTRAINT IF EXISTS "published_book_intro_sections_revision_target_fk";
--> statement-breakpoint
ALTER TABLE "published_book_introduction_sections" DROP CONSTRAINT IF EXISTS "published_book_intro_sections_section_fk";
--> statement-breakpoint
ALTER TABLE "publication_history" DROP CONSTRAINT IF EXISTS "publication_history_performed_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "publication_history" DROP CONSTRAINT IF EXISTS "publication_history_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "place_relationships" DROP CONSTRAINT IF EXISTS "place_relationships_target_place_id_places_id_fk";
--> statement-breakpoint
ALTER TABLE "place_relationships" DROP CONSTRAINT IF EXISTS "place_relationships_source_place_id_places_id_fk";
--> statement-breakpoint
ALTER TABLE "place_passages" DROP CONSTRAINT IF EXISTS "place_passages_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "place_passages" DROP CONSTRAINT IF EXISTS "place_passages_place_id_places_id_fk";
--> statement-breakpoint
ALTER TABLE "place_aliases" DROP CONSTRAINT IF EXISTS "place_aliases_place_id_places_id_fk";
--> statement-breakpoint
ALTER TABLE "person_relationships" DROP CONSTRAINT IF EXISTS "person_relationships_target_person_id_biblical_people_id_fk";
--> statement-breakpoint
ALTER TABLE "person_relationships" DROP CONSTRAINT IF EXISTS "person_relationships_source_person_id_biblical_people_id_fk";
--> statement-breakpoint
ALTER TABLE "person_passages" DROP CONSTRAINT IF EXISTS "person_passages_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "person_passages" DROP CONSTRAINT IF EXISTS "person_passages_person_id_biblical_people_id_fk";
--> statement-breakpoint
ALTER TABLE "person_aliases" DROP CONSTRAINT IF EXISTS "person_aliases_person_id_biblical_people_id_fk";
--> statement-breakpoint
ALTER TABLE "passages" DROP CONSTRAINT IF EXISTS "passages_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "passage_ranges" DROP CONSTRAINT IF EXISTS "passage_ranges_end_verse_id_verses_id_fk";
--> statement-breakpoint
ALTER TABLE "passage_ranges" DROP CONSTRAINT IF EXISTS "passage_ranges_start_verse_id_verses_id_fk";
--> statement-breakpoint
ALTER TABLE "passage_ranges" DROP CONSTRAINT IF EXISTS "passage_ranges_versification_system_id_versification_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "passage_ranges" DROP CONSTRAINT IF EXISTS "passage_ranges_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "original_language_notes" DROP CONSTRAINT IF EXISTS "original_language_notes_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "literary_units" DROP CONSTRAINT IF EXISTS "literary_units_parent_passage_id_literary_units_passage_id_fk";
--> statement-breakpoint
ALTER TABLE "literary_units" DROP CONSTRAINT IF EXISTS "literary_units_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "lexemes" DROP CONSTRAINT IF EXISTS "lexemes_language_id_languages_id_fk";
--> statement-breakpoint
ALTER TABLE "interpretive_questions" DROP CONSTRAINT IF EXISTS "interpretive_questions_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "interpretation_views" DROP CONSTRAINT IF EXISTS "interpretation_views_interpretive_question_id_interpretive_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "highlights" DROP CONSTRAINT IF EXISTS "highlights_verse_text_fk";
--> statement-breakpoint
ALTER TABLE "highlights" DROP CONSTRAINT IF EXISTS "highlights_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_historical_period_id_historical_periods_id_fk";
--> statement-breakpoint
ALTER TABLE "event_places" DROP CONSTRAINT IF EXISTS "event_places_place_id_places_id_fk";
--> statement-breakpoint
ALTER TABLE "event_places" DROP CONSTRAINT IF EXISTS "event_places_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "event_people" DROP CONSTRAINT IF EXISTS "event_people_person_id_biblical_people_id_fk";
--> statement-breakpoint
ALTER TABLE "event_people" DROP CONSTRAINT IF EXISTS "event_people_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "event_passages" DROP CONSTRAINT IF EXISTS "event_passages_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "event_passages" DROP CONSTRAINT IF EXISTS "event_passages_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_reviews" DROP CONSTRAINT IF EXISTS "editorial_reviews_reviewer_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_reviews" DROP CONSTRAINT IF EXISTS "editorial_reviews_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_checks" DROP CONSTRAINT IF EXISTS "editorial_checks_checked_by_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_checks" DROP CONSTRAINT IF EXISTS "editorial_checks_editorial_checklist_id_editorial_checklists_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_checks" DROP CONSTRAINT IF EXISTS "editorial_checks_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP CONSTRAINT IF EXISTS "editorial_assignments_assigned_by_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP CONSTRAINT IF EXISTS "editorial_assignments_assignee_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "editorial_assignments" DROP CONSTRAINT IF EXISTS "editorial_assignments_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "cross_references" DROP CONSTRAINT IF EXISTS "cross_references_related_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "cross_references" DROP CONSTRAINT IF EXISTS "cross_references_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "contributors" DROP CONSTRAINT IF EXISTS "contributors_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_commentary_section_id_commentary_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_commentary_passage_id_commentaries_passage_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_book_introduction_section_id_book_introduction_sections_id_fk";
--> statement-breakpoint
ALTER TABLE "content_revisions" DROP CONSTRAINT IF EXISTS "content_revisions_created_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_issues" DROP CONSTRAINT IF EXISTS "content_issues_closed_by_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_issues" DROP CONSTRAINT IF EXISTS "content_issues_reported_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_issues" DROP CONSTRAINT IF EXISTS "content_issues_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "content_issue_comments" DROP CONSTRAINT IF EXISTS "content_issue_comments_author_user_id_contributors_user_id_fk";
--> statement-breakpoint
ALTER TABLE "content_issue_comments" DROP CONSTRAINT IF EXISTS "content_issue_comments_content_issue_id_content_issues_id_fk";
--> statement-breakpoint
ALTER TABLE "commentary_sections" DROP CONSTRAINT IF EXISTS "commentary_sections_passage_id_commentaries_passage_id_fk";
--> statement-breakpoint
ALTER TABLE "commentaries" DROP CONSTRAINT IF EXISTS "commentaries_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "claim_usages" DROP CONSTRAINT IF EXISTS "claim_usages_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "claim_usages" DROP CONSTRAINT IF EXISTS "claim_usages_claim_id_claims_id_fk";
--> statement-breakpoint
ALTER TABLE "claim_sources" DROP CONSTRAINT IF EXISTS "claim_sources_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "claim_sources" DROP CONSTRAINT IF EXISTS "claim_sources_claim_id_claims_id_fk";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_content_revision_id_content_revisions_id_fk";
--> statement-breakpoint
ALTER TABLE "citations" DROP CONSTRAINT IF EXISTS "citations_source_id_sources_id_fk";
--> statement-breakpoint
ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_versification_system_id_versification_systems_id_fk";
--> statement-breakpoint
ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "canonical_relationships" DROP CONSTRAINT IF EXISTS "canonical_relationships_target_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "canonical_relationships" DROP CONSTRAINT IF EXISTS "canonical_relationships_source_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "canon_books" DROP CONSTRAINT IF EXISTS "canon_books_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "canon_books" DROP CONSTRAINT IF EXISTS "canon_books_canon_id_canon_traditions_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmarks" DROP CONSTRAINT IF EXISTS "bookmarks_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmarks" DROP CONSTRAINT IF EXISTS "bookmarks_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "book_introductions" DROP CONSTRAINT IF EXISTS "book_introductions_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "book_introduction_sections" DROP CONSTRAINT IF EXISTS "book_introduction_sections_book_id_book_introductions_book_id_fk";
--> statement-breakpoint
ALTER TABLE "book_aliases" DROP CONSTRAINT IF EXISTS "book_aliases_book_id_books_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_actor_user_id_user_id_fk";
--> statement-breakpoint
DROP TABLE IF EXISTS "word_occurrences";
--> statement-breakpoint
DROP TABLE IF EXISTS "versification_systems";
--> statement-breakpoint
DROP TABLE IF EXISTS "verses";
--> statement-breakpoint
DROP TABLE IF EXISTS "verse_texts";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_preferences";
--> statement-breakpoint
DROP TABLE IF EXISTS "translations";
--> statement-breakpoint
DROP TABLE IF EXISTS "themes";
--> statement-breakpoint
DROP TABLE IF EXISTS "theme_relationships";
--> statement-breakpoint
DROP TABLE IF EXISTS "theme_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "textual_variants";
--> statement-breakpoint
DROP TABLE IF EXISTS "textual_variant_witnesses";
--> statement-breakpoint
DROP TABLE IF EXISTS "textual_notes";
--> statement-breakpoint
DROP TABLE IF EXISTS "study_trails";
--> statement-breakpoint
DROP TABLE IF EXISTS "study_trail_items";
--> statement-breakpoint
DROP TABLE IF EXISTS "sources";
--> statement-breakpoint
DROP TABLE IF EXISTS "source_text_editions";
--> statement-breakpoint
DROP TABLE IF EXISTS "source_links";
--> statement-breakpoint
DROP TABLE IF EXISTS "source_excerpts";
--> statement-breakpoint
DROP TABLE IF EXISTS "source_credits";
--> statement-breakpoint
DROP TABLE IF EXISTS "research_notes";
--> statement-breakpoint
DROP TABLE IF EXISTS "research_note_sources";
--> statement-breakpoint
DROP TABLE IF EXISTS "reading_positions";
--> statement-breakpoint
DROP TABLE IF EXISTS "reading_history";
--> statement-breakpoint
DROP TABLE IF EXISTS "published_commentary_sections";
--> statement-breakpoint
DROP TABLE IF EXISTS "published_commentaries";
--> statement-breakpoint
DROP TABLE IF EXISTS "published_book_introduction_sections";
--> statement-breakpoint
DROP TABLE IF EXISTS "publication_history";
--> statement-breakpoint
DROP TABLE IF EXISTS "places";
--> statement-breakpoint
DROP TABLE IF EXISTS "place_relationships";
--> statement-breakpoint
DROP TABLE IF EXISTS "place_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "place_aliases";
--> statement-breakpoint
DROP TABLE IF EXISTS "person_relationships";
--> statement-breakpoint
DROP TABLE IF EXISTS "person_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "person_aliases";
--> statement-breakpoint
DROP TABLE IF EXISTS "passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "passage_ranges";
--> statement-breakpoint
DROP TABLE IF EXISTS "original_language_notes";
--> statement-breakpoint
DROP TABLE IF EXISTS "notes";
--> statement-breakpoint
DROP TABLE IF EXISTS "manuscripts";
--> statement-breakpoint
DROP TABLE IF EXISTS "literary_units";
--> statement-breakpoint
DROP TABLE IF EXISTS "lexemes";
--> statement-breakpoint
DROP TABLE IF EXISTS "languages";
--> statement-breakpoint
DROP TABLE IF EXISTS "interpretive_questions";
--> statement-breakpoint
DROP TABLE IF EXISTS "interpretation_views";
--> statement-breakpoint
DROP TABLE IF EXISTS "historical_periods";
--> statement-breakpoint
DROP TABLE IF EXISTS "highlights";
--> statement-breakpoint
DROP TABLE IF EXISTS "events";
--> statement-breakpoint
DROP TABLE IF EXISTS "event_places";
--> statement-breakpoint
DROP TABLE IF EXISTS "event_people";
--> statement-breakpoint
DROP TABLE IF EXISTS "event_passages";
--> statement-breakpoint
DROP TABLE IF EXISTS "editorial_reviews";
--> statement-breakpoint
DROP TABLE IF EXISTS "editorial_checks";
--> statement-breakpoint
DROP TABLE IF EXISTS "editorial_checklists";
--> statement-breakpoint
DROP TABLE IF EXISTS "editorial_assignments";
--> statement-breakpoint
DROP TABLE IF EXISTS "cross_references";
--> statement-breakpoint
DROP TABLE IF EXISTS "credited_people";
--> statement-breakpoint
DROP TABLE IF EXISTS "contributors";
--> statement-breakpoint
DROP TABLE IF EXISTS "content_revisions";
--> statement-breakpoint
DROP TABLE IF EXISTS "content_issues";
--> statement-breakpoint
DROP TABLE IF EXISTS "content_issue_comments";
--> statement-breakpoint
DROP TABLE IF EXISTS "commentary_sections";
--> statement-breakpoint
DROP TABLE IF EXISTS "commentaries";
--> statement-breakpoint
DROP TABLE IF EXISTS "claims";
--> statement-breakpoint
DROP TABLE IF EXISTS "claim_usages";
--> statement-breakpoint
DROP TABLE IF EXISTS "claim_sources";
--> statement-breakpoint
DROP TABLE IF EXISTS "citations";
--> statement-breakpoint
DROP TABLE IF EXISTS "chapters";
--> statement-breakpoint
DROP TABLE IF EXISTS "canonical_relationships";
--> statement-breakpoint
DROP TABLE IF EXISTS "canon_traditions";
--> statement-breakpoint
DROP TABLE IF EXISTS "canon_books";
--> statement-breakpoint
DROP TABLE IF EXISTS "books";
--> statement-breakpoint
DROP TABLE IF EXISTS "bookmarks";
--> statement-breakpoint
DROP TABLE IF EXISTS "book_introductions";
--> statement-breakpoint
DROP TABLE IF EXISTS "book_introduction_sections";
--> statement-breakpoint
DROP TABLE IF EXISTS "book_aliases";
--> statement-breakpoint
DROP TABLE IF EXISTS "biblical_people";
--> statement-breakpoint
DROP TABLE IF EXISTS "verification";
--> statement-breakpoint
DROP TABLE IF EXISTS "user";
--> statement-breakpoint
DROP TABLE IF EXISTS "session";
--> statement-breakpoint
DROP TABLE IF EXISTS "account";
--> statement-breakpoint
DROP TABLE IF EXISTS "audit_log";
