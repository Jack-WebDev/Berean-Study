ALTER TABLE "canon_books" DROP CONSTRAINT IF EXISTS "canon_books_chapter_limit_positive_check";
--> statement-breakpoint
ALTER TABLE "canon_books" DROP COLUMN IF EXISTS "chapter_limit";
