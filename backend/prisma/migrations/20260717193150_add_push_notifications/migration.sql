-- CreateEnum
CREATE TYPE "TipoNotificacaoAgendamento" AS ENUM ('ONE_WEEK', 'THREE_DAYS', 'ONE_DAY', 'TWELVE_HOURS', 'SIX_HOURS', 'THREE_HOURS', 'ONE_HOUR', 'THIRTY_MINUTES', 'TEN_MINUTES');

-- CreateTable
CREATE TABLE "NotificacaoAgendamento" (
    "id" SERIAL NOT NULL,
    "agendamentoId" INTEGER NOT NULL,
    "pushSubscriptionId" INTEGER,
    "tipo" "TipoNotificacaoAgendamento" NOT NULL,
    "enviarEm" TIMESTAMP(3) NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificacaoAgendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_token_key" ON "PushSubscription"("token");

-- AddForeignKey
ALTER TABLE "NotificacaoAgendamento" ADD CONSTRAINT "NotificacaoAgendamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacaoAgendamento" ADD CONSTRAINT "NotificacaoAgendamento_pushSubscriptionId_fkey" FOREIGN KEY ("pushSubscriptionId") REFERENCES "PushSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
