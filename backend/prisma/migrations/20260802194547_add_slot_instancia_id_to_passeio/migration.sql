/*
  Warnings:

  - A unique constraint covering the columns `[slotInstanciaId]` on the table `Passeio` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "StatusAgendamento" ADD VALUE 'REALIZADO';

-- AlterTable
ALTER TABLE "AvaliacaoCache" ALTER COLUMN "avaliacaoMedia" DROP DEFAULT,
ALTER COLUMN "avaliacaoMedia" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "totalAvaliacoes" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Passeio" ADD COLUMN     "slotInstanciaId" INTEGER;

-- CreateTable
CREATE TABLE "ResetToken" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResetToken_token_key" ON "ResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Passeio_slotInstanciaId_key" ON "Passeio"("slotInstanciaId");
