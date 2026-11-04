require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const { PrismaClient } = require('@prisma/client');
const { criptografar, estaCriptografado } = require('../src/lib/crypto');

const prisma = new PrismaClient();

async function main() {
  const pedidos = await prisma.order.findMany({ select: { id: true, cpf: true, nomeCompleto: true } });
  let atualizados = 0;

  for (const p of pedidos) {
    const data = {};
    if (p.cpf && !estaCriptografado(p.cpf)) data.cpf = criptografar(p.cpf, 'Order.cpf');
    if (p.nomeCompleto && !estaCriptografado(p.nomeCompleto)) {
      data.nomeCompleto = criptografar(p.nomeCompleto, 'Order.nomeCompleto');
    }
    if (Object.keys(data).length) {
      await prisma.order.update({ where: { id: p.id }, data });
      atualizados++;
    }
  }
  console.log(`[criptografar] ${atualizados} pedido(s) atualizado(s) de ${pedidos.length}.`);
}

main()
  .catch((e) => { console.error('[criptografar] Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
