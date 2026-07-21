/*
  Warnings:

  - A unique constraint covering the columns `[slotAtribuicaoId]` on the table `Passeio` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Passeio" ADD COLUMN     "slotAtribuicaoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Passeio_slotAtribuicaoId_key" ON "Passeio"("slotAtribuicaoId");
