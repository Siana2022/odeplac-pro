-- ============================================================
-- Migración: Tipos de sistema personalizables para planos
-- Ejecutar en el SQL Editor de Supabase (es idempotente).
-- ============================================================

-- 1) Tabla de tipos
CREATE TABLE IF NOT EXISTS plano_tipos_sistema (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  formula     TEXT NOT NULL DEFAULT 'ml_x_alto'
                CHECK (formula IN ('ml_x_alto', 'largo_x_ancho', 'suma_ml')),
  orden       INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2) Tipos por defecto
INSERT INTO plano_tipos_sistema (nombre, descripcion, formula, orden) VALUES
  ('Trasdosados / Tabiques', 'ML × alto = m²',  'ml_x_alto',      1),
  ('Falsos techos',          'Largo × Ancho = m²', 'largo_x_ancho', 2),
  ('Cortineros',             'Suma de ML',          'suma_ml',        3)
ON CONFLICT DO NOTHING;

-- 3) Añadir tipo_id a planos
ALTER TABLE planos ADD COLUMN IF NOT EXISTS tipo_id UUID REFERENCES plano_tipos_sistema(id);

-- 4) Migrar planos existentes al tipo correcto
UPDATE planos SET tipo_id = (
  SELECT id FROM plano_tipos_sistema WHERE formula = 'ml_x_alto' ORDER BY orden LIMIT 1
) WHERE tipo_sistema = 'trasdosados' AND tipo_id IS NULL;

UPDATE planos SET tipo_id = (
  SELECT id FROM plano_tipos_sistema WHERE formula = 'largo_x_ancho' ORDER BY orden LIMIT 1
) WHERE tipo_sistema = 'techos' AND tipo_id IS NULL;

UPDATE planos SET tipo_id = (
  SELECT id FROM plano_tipos_sistema WHERE formula = 'suma_ml' ORDER BY orden LIMIT 1
) WHERE tipo_sistema = 'cortineros' AND tipo_id IS NULL;

-- Planos sin tipo (fallback a trasdosados)
UPDATE planos SET tipo_id = (
  SELECT id FROM plano_tipos_sistema WHERE formula = 'ml_x_alto' ORDER BY orden LIMIT 1
) WHERE tipo_id IS NULL;

-- 5) RLS
ALTER TABLE plano_tipos_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plano_tipos_all" ON plano_tipos_sistema;
CREATE POLICY "plano_tipos_all" ON plano_tipos_sistema FOR ALL USING (true);
