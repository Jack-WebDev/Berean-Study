-- Custom SQL migration file, put your code below! --

CREATE FUNCTION validate_passage_range()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	passage_book_id integer;

	start_book_id integer;
	start_versification_system_id integer;
	start_chapter_position integer;
	start_verse_number integer;

	end_book_id integer;
	end_versification_system_id integer;
	end_chapter_position integer;
	end_verse_number integer;
BEGIN
	-- Get the book this conceptual passage belongs to.
	SELECT book_id
	INTO passage_book_id
	FROM passages
	WHERE id = NEW.passage_id;

	-- Resolve the start verse to its book, versification system,
	-- chapter position, and verse number.
	SELECT
		chapters.book_id,
		chapters.versification_system_id,
		chapters.number,
		verses.number
	INTO
		start_book_id,
		start_versification_system_id,
		start_chapter_position,
		start_verse_number
	FROM verses
	JOIN chapters
		ON chapters.id = verses.chapter_id
	WHERE verses.id = NEW.start_verse_id;

	-- Resolve the end verse.
	SELECT
		chapters.book_id,
		chapters.versification_system_id,
		chapters.number,
		verses.number
	INTO
		end_book_id,
		end_versification_system_id,
		end_chapter_position,
		end_verse_number
	FROM verses
	JOIN chapters
		ON chapters.id = verses.chapter_id
	WHERE verses.id = NEW.end_verse_id;

	-- Both boundaries must belong to the passage's book.
	IF start_book_id <> passage_book_id
		OR end_book_id <> passage_book_id
	THEN
		RAISE EXCEPTION
			'Passage range boundaries must belong to the same book as the passage'
			USING ERRCODE = '23514';
	END IF;

	-- Both boundaries must use the declared versification system.
	IF start_versification_system_id <> NEW.versification_system_id
		OR end_versification_system_id <> NEW.versification_system_id
	THEN
		RAISE EXCEPTION
			'Passage range boundaries must belong to the declared versification system'
			USING ERRCODE = '23514';
	END IF;

	-- The start must not come after the end.
	IF (start_chapter_position, start_verse_number)
		> (end_chapter_position, end_verse_number)
	THEN
		RAISE EXCEPTION
			'Passage range start verse must not come after the end verse'
			USING ERRCODE = '23514';
	END IF;

	RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER passage_ranges_validate
BEFORE INSERT OR UPDATE OF
	passage_id,
	versification_system_id,
	start_verse_id,
	end_verse_id
ON passage_ranges
FOR EACH ROW
EXECUTE FUNCTION validate_passage_range();
