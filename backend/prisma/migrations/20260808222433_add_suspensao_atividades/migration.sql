-- AlterEnum
ALTER TYPE "StatusAgendamento" ADD VALUE 'SUSPENSO';

-- AlterEnum
ALTER TYPE "StatusInstancia" ADD VALUE 'SUSPENSO';

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "statusAnterior" "StatusAgendamento",
ADD COLUMN     "suspensaoId" INTEGER;

-- AlterTable
ALTER TABLE "SlotInstancia" ADD COLUMN     "statusAnterior" "StatusInstancia",
ADD COLUMN     "suspensaoId" INTEGER;

-- CreateTable
CREATE TABLE "Suspensao" (
    "id" SERIAL NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "criadoPorId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "removidaEm" TIMESTAMP(3),
    "removidaPorId" INTEGER,

    CONSTRAINT "Suspensao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_suspensaoId_fkey" FOREIGN KEY ("suspensaoId") REFERENCES "Suspensao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotInstancia" ADD CONSTRAINT "SlotInstancia_suspensaoId_fkey" FOREIGN KEY ("suspensaoId") REFERENCES "Suspensao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
