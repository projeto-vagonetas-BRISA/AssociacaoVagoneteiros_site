import { PrismaClient, Perfil } from '@prisma/client';
import bcrypt from 'bcrypt';

/**
 * Seed NÃO-destrutivo para os testes E2E.
 * Faz apenas upsert — não apaga nenhum dado existente.
 *
 * Cria (ou atualiza) credenciais de teste usadas pelo Playwright:
 *   - admin:  admin@vagoneteiros.com      / admin123
 *   - redator: redator@vagoneteiros.com   / redator123
 *   - vagoneteiro: vagoneteiro@vagoneteiros.com / vaga123
 *
 * Uso: npx ts-node prisma/seed-e2e.ts
 */
const prisma = new PrismaClient();

const saltRounds = 10;

async function upsertUsuario(dados: {
  name: string; cpf: string; email: string; telefone: string; perfil: Perfil; senha: string;
}) {
  const senha = await bcrypt.hash(dados.senha, saltRounds);
  return prisma.usuario.upsert({
    where: { cpf: dados.cpf },
    update: { name: dados.name, email: dados.email, telefone: dados.telefone, senha, perfil: dados.perfil },
    create: { ...dados, senha },
  });
}

async function main() {
  console.log('🌱 Seeding E2E (não-destrutivo)...');

  const admin = await upsertUsuario({
    name: 'Administrador E2E', cpf: '12738985246', email: 'admin@vagoneteiros.com',
    telefone: '(53) 99999-0000', perfil: Perfil.ADMIN, senha: 'admin123',
  });
  console.log(`  ✅ ${admin.name} (${admin.email} / admin123)`);

  const redator = await upsertUsuario({
    name: 'Redator E2E', cpf: '73229928733', email: 'redator@vagoneteiros.com',
    telefone: '(53) 98888-0000', perfil: Perfil.REDATOR, senha: 'redator123',
  });
  console.log(`  ✅ ${redator.name} (${redator.email} / redator123)`);

  const vagoneteiro = await upsertUsuario({
    name: 'Vagoneteiro E2E', cpf: '16310347039', email: 'vagoneteiro@vagoneteiros.com',
    telefone: '(53) 97777-0000', perfil: Perfil.VAGONETEIRO, senha: 'vaga123',
  });
  console.log(`  ✅ ${vagoneteiro.name} (${vagoneteiro.email} / vaga123)`);

  console.log('✅ Seed E2E concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
