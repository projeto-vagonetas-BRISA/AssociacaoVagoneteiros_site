-- CreateTable
CREATE TABLE IF NOT EXISTS "AvaliacaoCache" (
    id SERIAL PRIMARY KEY,
    "avaliacaoMedia" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalAvaliacoes" INTEGER NOT NULL DEFAULT 0,
    "atualizadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed inicial
INSERT INTO "AvaliacaoCache" ("avaliacaoMedia", "totalAvaliacoes", "atualizadaEm")
SELECT 4.6, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "AvaliacaoCache");
