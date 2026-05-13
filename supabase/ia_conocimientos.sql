-- Tabla de conocimiento entrenado conversacionalmente para OdeplacAI
CREATE TABLE IF NOT EXISTS ia_conocimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregunta   TEXT        NOT NULL,
    respuesta  TEXT        NOT NULL,
    keywords   TEXT[]      DEFAULT '{}',
    categoria  TEXT        DEFAULT 'general',
    activo     BOOLEAN     DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de acceso (igual que el resto de tablas)
ALTER TABLE ia_conocimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public full access" ON ia_conocimientos FOR ALL TO anon USING (true) WITH CHECK (true);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_ia_conocimientos_keywords ON ia_conocimientos USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_ia_conocimientos_activo   ON ia_conocimientos (activo);
