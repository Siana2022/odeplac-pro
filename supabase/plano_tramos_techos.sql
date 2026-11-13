-- Falsos techos: cada techo guarda dos trazos (largo y ancho) en una misma fila.
-- metros = largo (trazo 1), metros_b = ancho (trazo 2), x3..y4 = coordenadas del trazo 2.
ALTER TABLE plano_tramos ADD COLUMN IF NOT EXISTS metros_b NUMERIC;
ALTER TABLE plano_tramos ADD COLUMN IF NOT EXISTS x3 DOUBLE PRECISION;
ALTER TABLE plano_tramos ADD COLUMN IF NOT EXISTS y3 DOUBLE PRECISION;
ALTER TABLE plano_tramos ADD COLUMN IF NOT EXISTS x4 DOUBLE PRECISION;
ALTER TABLE plano_tramos ADD COLUMN IF NOT EXISTS y4 DOUBLE PRECISION;
