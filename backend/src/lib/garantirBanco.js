const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const prisma = require('./prisma');

const BACKEND = path.join(__dirname, '..', '..');
const MIGRATIONS = path.join(BACKEND, 'prisma', 'migrations');

function comandosDoSql(sql) {
  return sql
    .split(/\r?\n/)
    .filter((linha) => !linha.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\r?\n|$)/)
    .map((c) => c.trim())
    .filter(Boolean);
}

async function tabelaUserExiste() {
  try {
    await prisma.user.count();
    return true;
  } catch (e) {
    if (e && e.code === 'P2021') return false;
    throw e;
  }
}

async function garantirBanco() {
  if (await tabelaUserExiste()) return false;

  console.warn('[db] Tabelas ausentes. Aplicando migrations automaticamente...');
  const pastas = fs
    .readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const pasta of pastas) {
    const arquivo = path.join(MIGRATIONS, pasta, 'migration.sql');
    if (!fs.existsSync(arquivo)) continue;
    for (const comando of comandosDoSql(fs.readFileSync(arquivo, 'utf8'))) {
      await prisma.$executeRawUnsafe(comando);
    }
    console.log(`[db] Migration aplicada: ${pasta}`);
  }

  console.log('[db] Rodando seed...');
  const r = spawnSync(process.execPath, ['prisma/seed.js'], {
    cwd: BACKEND,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) console.warn(`[db] AVISO: seed terminou com erro (código ${r.status}).`);
  return true;
}

module.exports = { garantirBanco, comandosDoSql };
