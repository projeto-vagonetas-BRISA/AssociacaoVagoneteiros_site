-- CreateEnum
CREATE TYPE "StatusPasseio" AS ENUM ('CONFIRMADO', 'REALIZADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "Passeio" ADD COLUMN     "status" "StatusPasseio" NOT NULL DEFAULT 'CONFIRMADO';
