ALTER TABLE "canon_books" ADD COLUMN "chapter_limit" smallint;--> statement-breakpoint
ALTER TABLE "canon_books" ADD CONSTRAINT "canon_books_chapter_limit_positive_check" CHECK ("canon_books"."chapter_limit" IS NULL OR "canon_books"."chapter_limit" > 0);--> statement-breakpoint
UPDATE "canon_books" SET "chapter_limit" = "books"."expected_chapters" FROM "books", "canon_traditions" WHERE "books"."id" = "canon_books"."book_id" AND "canon_traditions"."id" = "canon_books"."canon_id" AND "canon_traditions"."slug" = 'protestant';
