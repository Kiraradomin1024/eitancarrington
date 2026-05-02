-- =============================================================
-- Backfill slugs for npcs, days, and investigations
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jlkqdajlalzyrupleums/sql/new
-- =============================================================

-- Helper function: slugify (same logic as the app)
CREATE OR REPLACE FUNCTION _temp_slugify(input text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  result text;
BEGIN
  -- Lowercase first
  result := lower(input);
  -- Transliterate accented characters manually
  result := translate(result,
    'àáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿřšžďťňľĺćčő',
    'aaaaaaeceeeeiiiidnoooouuuuypyrszddnnllcco'
  );
  -- Replace non-alphanumeric with dashes
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Trim leading/trailing dashes
  result := trim(both '-' from result);
  RETURN result;
END;
$$;

-- Helper function: generate unique slug for a table
CREATE OR REPLACE FUNCTION _temp_unique_slug(
  tbl text, base_slug text, row_id uuid
)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  candidate text;
  i int := 1;
  cnt int;
BEGIN
  IF base_slug = '' OR base_slug IS NULL THEN
    candidate := 'item';
  ELSE
    candidate := base_slug;
  END IF;

  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I WHERE slug = $1 AND id != $2', tbl
    ) INTO cnt USING candidate, row_id;

    IF cnt = 0 THEN RETURN candidate; END IF;
    i := i + 1;
    candidate := base_slug || '-' || i;
    IF i > 1000 THEN RETURN base_slug || '-' || extract(epoch from now())::bigint; END IF;
  END LOOP;
END;
$$;

-- ─── Backfill npcs (slug from name) ─────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM npcs WHERE slug IS NULL LOOP
    UPDATE npcs
    SET slug = _temp_unique_slug('npcs', _temp_slugify(r.name), r.id)
    WHERE id = r.id;
    RAISE NOTICE 'npcs: % → %', r.name, _temp_unique_slug('npcs', _temp_slugify(r.name), r.id);
  END LOOP;
END $$;

-- ─── Backfill days (slug from day_number or title) ──────────
DO $$
DECLARE r RECORD; base text;
BEGIN
  FOR r IN SELECT id, day_number, title, date FROM days WHERE slug IS NULL LOOP
    IF r.day_number IS NOT NULL THEN
      base := 'jour-' || r.day_number;
    ELSIF r.title IS NOT NULL AND r.title != '' THEN
      base := _temp_slugify(r.title);
    ELSE
      base := _temp_slugify(r.date::text);
    END IF;
    UPDATE days
    SET slug = _temp_unique_slug('days', base, r.id)
    WHERE id = r.id;
  END LOOP;
END $$;

-- ─── Backfill investigations (slug from title) ─────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, title FROM investigations WHERE slug IS NULL LOOP
    UPDATE investigations
    SET slug = _temp_unique_slug('investigations', _temp_slugify(r.title), r.id)
    WHERE id = r.id;
  END LOOP;
END $$;

-- Clean up temporary functions
DROP FUNCTION IF EXISTS _temp_slugify(text);
DROP FUNCTION IF EXISTS _temp_unique_slug(text, text, uuid);

-- Verify results
SELECT 'npcs' AS table_name, name, slug FROM npcs
UNION ALL
SELECT 'days', title, slug FROM days
UNION ALL
SELECT 'investigations', title, slug FROM investigations
ORDER BY table_name, slug;
