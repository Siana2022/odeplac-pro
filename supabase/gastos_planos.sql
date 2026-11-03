-- ============================================================
-- Migración: Gastos por categoría + Medición de planos
-- Ejecutar en el SQL Editor de Supabase (es idempotente).
-- ============================================================

-- ------------------------------------------------------------
-- 1) GASTOS: categoría y archivo original
-- ------------------------------------------------------------
ALTER TABLE gastos_materiales
  ADD COLUMN IF NOT EXISTS categoria    TEXT NOT NULL DEFAULT 'proveedores',
  ADD COLUMN IF NOT EXISTS archivo_path TEXT;

-- Las facturas existentes pasan a la categoría "proveedores"
UPDATE gastos_materiales SET categoria = 'proveedores' WHERE categoria IS NULL;

ALTER TABLE gastos_materiales DROP CONSTRAINT IF EXISTS gastos_materiales_categoria_check;
ALTER TABLE gastos_materiales
  ADD CONSTRAINT gastos_materiales_categoria_check
  CHECK (categoria IN ('proveedores', 'gasolina', 'alquiler', 'otros'));

CREATE INDEX IF NOT EXISTS idx_gastos_materiales_categoria_fecha
  ON gastos_materiales (categoria, fecha_factura);

-- ------------------------------------------------------------
-- 2) PLANOS: planos por obra, mediciones (sistemas) y tramos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id       UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,            -- p.ej. "Plano primera planta"
  zona          TEXT,                     -- p.ej. "Sótano"
  archivo_path  TEXT NOT NULL,            -- ruta en el bucket "planos"
  mime_type     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_planos_obra ON planos (obra_id);

CREATE TABLE IF NOT EXISTS plano_mediciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id    UUID NOT NULL REFERENCES planos(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,              -- sistema, p.ej. "Tabique 70/600 doble placa"
  color       TEXT NOT NULL DEFAULT '#ec4899',
  alto        NUMERIC(8,3) NOT NULL DEFAULT 0,   -- altura en metros
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plano_mediciones_plano ON plano_mediciones (plano_id);

CREATE TABLE IF NOT EXISTS plano_tramos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicion_id   UUID NOT NULL REFERENCES plano_mediciones(id) ON DELETE CASCADE,
  metros        NUMERIC(10,3) NOT NULL,   -- metros lineales del tramo
  -- Coordenadas normalizadas (0..1) respecto al tamaño del plano
  x1 NUMERIC(8,6), y1 NUMERIC(8,6), x2 NUMERIC(8,6), y2 NUMERIC(8,6),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plano_tramos_medicion ON plano_tramos (medicion_id);

ALTER TABLE planos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_mediciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_tramos      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth full access" ON planos;
DROP POLICY IF EXISTS "auth full access" ON plano_mediciones;
DROP POLICY IF EXISTS "auth full access" ON plano_tramos;
CREATE POLICY "auth full access" ON planos           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full access" ON plano_mediciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth full access" ON plano_tramos     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 3) STORAGE: buckets privados para planos y facturas
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('planos', 'planos', false), ('facturas', 'facturas', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "planos_facturas auth all" ON storage.objects;
CREATE POLICY "planos_facturas auth all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id IN ('planos', 'facturas'))
  WITH CHECK (bucket_id IN ('planos', 'facturas'));
