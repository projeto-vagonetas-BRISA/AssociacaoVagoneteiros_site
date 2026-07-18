import 'dotenv/config';
import app from './app';
import prisma from './lib/prisma';
import { iniciarAgendamentoScheduler } from './services/notificationScheduler';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  iniciarAgendamentoScheduler();
});

// Tratamento de encerramento gracioso
const gracefulShutdown = async () => {
  console.log('Encerrando servidor...');
  server.close(async () => {
    console.log('Servidor HTTP fechado.');
    await prisma.$disconnect();
    console.log('Conexão Prisma encerrada.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
