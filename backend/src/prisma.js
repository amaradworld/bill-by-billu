const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Graceful shutdown
async function disconnect() {
  await prisma.$disconnect();
  console.log('[Prisma] Disconnected');
}

process.on('SIGTERM', async () => {
  console.log('[Prisma] SIGTERM received, disconnecting...');
  await disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Prisma] SIGINT received, disconnecting...');
  await disconnect();
  process.exit(0);
});

process.on('beforeExit', async () => {
  await disconnect();
});

module.exports = prisma;
