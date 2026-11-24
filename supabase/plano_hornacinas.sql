-- ============================================================
-- Hornacinas / oscuros: Alto × Ancho × Profundo = m³
-- Ejecutar en el SQL Editor de Supabase (idempotente).
-- ============================================================

-- 1) Dimensiones propias de cada hornacina
ALTER TABLE plano_mediciones ADD COLUMN IF NOT EXISTS ancho NUMERIC;
ALTER TABLE plano_mediciones ADD COLUMN IF NOT EXISTS profundo NUMERIC;

-- 2) Permitir la nueva fórmula en los tipos (el nombre del CHECK puede variar)
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid = 'public.plano_tipos_sistema'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%formula%';

  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.plano_tipos_sistema DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE public.plano_tipos_sistema
  ADD CONSTRAINT plano_tipos_sistema_formula_check
  CHECK (formula IN ('ml_x_alto', 'largo_x_ancho', 'suma_ml', 'alto_x_ancho_x_profundo'));

-- 3) Tipo por defecto
INSERT INTO public.plano_tipos_sistema (nombre, descripcion, formula, orden)
SELECT 'Hornacinas / Oscuros', 'Alto × Ancho × Profundo = m³', 'alto_x_ancho_x_profundo', 4
WHERE NOT EXISTS (
  SELECT 1 FROM public.plano_tipos_sistema WHERE formula = 'alto_x_ancho_x_profundo'
);
