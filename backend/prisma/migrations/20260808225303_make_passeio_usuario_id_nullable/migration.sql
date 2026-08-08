-- DropForeignKey
ALTER TABLE "Passeio" DROP CONSTRAINT "Passeio_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Passeio" ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Passeio" ADD CONSTRAINT "Passeio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
