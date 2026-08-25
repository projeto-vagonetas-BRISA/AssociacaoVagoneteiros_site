-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "canceladoPor" TEXT,
ADD COLUMN     "motivoCancelamento" TEXT;
