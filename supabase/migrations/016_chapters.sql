-- =============================================
-- 016: Chapters for the journal
-- Groups days into narrative arcs (chapters)
-- =============================================

-- ---------- chapters table ----------
CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  slug text UNIQUE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Add chapter_id to days ----------
ALTER TABLE public.days ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;

-- ---------- Add pinned to days ----------
ALTER TABLE public.days ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

-- ---------- Seed chapter 1 + assign existing days ----------
INSERT INTO public.chapters (number, title, slug)
SELECT 1, 'Chapitre 1', 'chapitre-1'
WHERE NOT EXISTS (SELECT 1 FROM public.chapters WHERE number = 1);

UPDATE public.days
SET chapter_id = (SELECT id FROM public.chapters WHERE number = 1)
WHERE chapter_id IS NULL;

-- ---------- RLS ----------
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapters_read" ON public.chapters;
CREATE POLICY "chapters_read" ON public.chapters FOR SELECT USING (true);

DROP POLICY IF EXISTS "chapters_insert" ON public.chapters;
CREATE POLICY "chapters_insert" ON public.chapters FOR INSERT WITH CHECK (public.can_contribute());

DROP POLICY IF EXISTS "chapters_update" ON public.chapters;
CREATE POLICY "chapters_update" ON public.chapters FOR UPDATE USING (public.can_contribute()) WITH CHECK (public.can_contribute());

DROP POLICY IF EXISTS "chapters_delete" ON public.chapters;
CREATE POLICY "chapters_delete" ON public.chapters FOR DELETE USING (public.is_admin());
