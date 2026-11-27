-- ============================================================
-- Trabajadores + enlace con las jornadas existentes
-- Ejecutar en el SQL Editor de Supabase (idempotente).
-- No borra ni modifica ninguna jornada: solo rellena trabajador_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trabajadores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS trabajadores_nombre_unique
  ON public.trabajadores (LOWER(BTRIM(nombre)));

-- 1) Crear un trabajador por cada nombre distinto de las jornadas existentes
INSERT INTO public.trabajadores (nombre)
SELECT DISTINCT BTRIM(h.trabajador)
FROM public.obra_horas h
WHERE h.trabajador IS NOT NULL
  AND BTRIM(h.trabajador) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.trabajadores t
    WHERE LOWER(t.nombre) = LOWER(BTRIM(h.trabajador))
  );

-- 2) Añadir el enlace y rellenarlo por nombre (sin tocar las jornadas)
ALTER TABLE public.obra_horas
  ADD COLUMN IF NOT EXISTS trabajador_id UUID REFERENCES public.trabajadores(id);

UPDATE public.obra_horas h
SET trabajador_id = t.id
FROM public.trabajadores t
WHERE h.trabajador_id IS NULL
  AND LOWER(BTRIM(h.trabajador)) = LOWER(t.nombre);

-- 3) RLS
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trabajadores_auth_all" ON public.trabajadores;
CREATE POLICY "trabajadores_auth_all" ON public.trabajadores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
