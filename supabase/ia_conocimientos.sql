-- Tabla de conocimiento entrenado conversacionalmente para OdeplacAI
CREATE TABLE IF NOT EXISTS ia_conocimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregunta   TEXT        NOT NULL,          -- tema / pregunta que dispara este conocimiento
    respuesta  TEXT        NOT NULL,          -- respuesta / conocimiento guardado
    keywords   TEXT[]      DEFAULT '{}',      -- palabras clave para búsqueda
    categoria  TEXT        DEFAULT 'general', -- materiales | sistemas | precios | procesos | general
    activo     BOOLEAN     DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda rápida por keywords
CREATE INDEX IF NOT EXISTS idx_ia_conocimientos_keywords ON ia_conocimientos USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_ia_conocimientos_activo   ON ia_conocimientos (activo);
