-- CreateEnum
CREATE TYPE "TipoSlot" AS ENUM ('FIXO', 'LOTE', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "StatusSlot" AS ENUM ('DISPONIVEL', 'ATRIBUIDO', 'CANCELADO', 'REALIZADO');

-- CreateEnum
CREATE TYPE "StatusInstancia" AS ENUM ('AGENDADO', 'EM_ANDAMENTO', 'REALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusAtribuicao" AS ENUM ('ATRIBUIDO', 'REALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "SlotPasseio" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoSlot" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "diaSemana" "DiaSemana",
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "intervaloDias" INTEGER,
    "loteId" TEXT,
    "capacidade" INTEGER NOT NULL DEFAULT 1,
    "valor" DECIMAL(10,2) NOT NULL,
    "usuarioId" INTEGER,
    "status" "StatusSlot" NOT NULL DEFAULT 'DISPONIVEL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotPasseio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotInstancia" (
    "id" SERIAL NOT NULL,
    "slotPasseioId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "status" "StatusInstancia" NOT NULL DEFAULT 'AGENDADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotInstancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotAtribuicao" (
    "id" SERIAL NOT NULL,
    "slotPasseioId" INTEGER NOT NULL,
    "instanciaId" INTEGER,
    "vagoneteiroId" INTEGER NOT NULL,
    "status" "StatusAtribuicao" NOT NULL DEFAULT 'ATRIBUIDO',
    "atribuidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceladoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotAtribuicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlotInstancia_slotPasseioId_data_horaInicio_key" ON "SlotInstancia"("slotPasseioId", "data", "horaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "SlotAtribuicao_slotPasseioId_instanciaId_vagoneteiroId_key" ON "SlotAtribuicao"("slotPasseioId", "instanciaId", "vagoneteiroId");

-- AddForeignKey
ALTER TABLE "SlotPasseio" ADD CONSTRAINT "SlotPasseio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotInstancia" ADD CONSTRAINT "SlotInstancia_slotPasseioId_fkey" FOREIGN KEY ("slotPasseioId") REFERENCES "SlotPasseio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotAtribuicao" ADD CONSTRAINT "SlotAtribuicao_slotPasseioId_fkey" FOREIGN KEY ("slotPasseioId") REFERENCES "SlotPasseio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotAtribuicao" ADD CONSTRAINT "SlotAtribuicao_instanciaId_fkey" FOREIGN KEY ("instanciaId") REFERENCES "SlotInstancia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotAtribuicao" ADD CONSTRAINT "SlotAtribuicao_vagoneteiroId_fkey" FOREIGN KEY ("vagoneteiroId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
