/*
  Warnings:

  - Added the required column `perfil` to the `ResetToken` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ResetTokenStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED');

-- AlterTable
ALTER TABLE "ResetToken" ADD COLUMN     "aprovadoEm" TIMESTAMP(3),
ADD COLUMN     "aprovadoPorId" INTEGER,
ADD COLUMN     "perfil" "Perfil" NOT NULL,
ADD COLUMN     "status" "ResetTokenStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
ADD COLUMN     "usuarioId" INTEGER,
ALTER COLUMN "token" DROP NOT NULL,
ALTER COLUMN "expiraEm" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "ResetToken" ADD CONSTRAINT "ResetToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
