-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "notificacao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promocao" BOOLEAN NOT NULL DEFAULT false;
