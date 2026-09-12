DROP TRIGGER IF EXISTS passage_ranges_validate
ON passage_ranges;

--> statement-breakpoint

DROP FUNCTION IF EXISTS validate_passage_range();