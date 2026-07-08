/*
  Warnings:

  - You are about to drop the column `valor` on the `Passeio` table. All the data in the column will be lost.
  - Added the required column `preco` to the `Passeio` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Passeio" DROP COLUMN "valor",
ADD COLUMN     "horario" TEXT NOT NULL DEFAULT '08:00',
ADD COLUMN     "preco" DECIMAL(10,2) NOT NULL;
