-- AlterTable
ALTER TABLE "Clientes" ADD COLUMN     "anonimizado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "anonimizado" BOOLEAN NOT NULL DEFAULT false;
