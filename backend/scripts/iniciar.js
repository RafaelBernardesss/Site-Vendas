const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Carrega o .env e normaliza DATABASE_URL (sempre SQLite, caminho absoluto)
// ANTES de chamar o Prisma CLI — assim o CLI e o servidor usam o mesmo banco.
require('../src/lib/env');

const backend = path.join(__dirname, '..');
const raiz = path.join(backend, '..');
const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';
const npm = isWin ? 'npm.cmd' : 'npm';

function rodar(titulo, cmd, args, cwd) {
  console.log(`[iniciar] ${titulo}...`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin, env: process.env });
  if (r.status !== 0) console.warn(`[iniciar] AVISO: "${titulo}" terminou com erro (código ${r.status}).`);
  return r.status === 0;
}

try {
  const arquivoDb = process.env.DATABASE_URL.replace(/^file:/, '').split('?')[0];
  fs.mkdirSync(path.dirname(arquivoDb), { recursive: true });
  console.log(`[iniciar] Banco SQLite: ${arquivoDb}`);
} catch (e) {
  console.warn(`[iniciar] AVISO: nao foi possivel preparar a pasta do banco: ${e.message}`);
}

rodar('Gerando Prisma Client', npx, ['prisma', 'generate'], backend);

if (!rodar('Aplicando migrations', npx, ['prisma', 'migrate', 'deploy'], backend)) {
  rodar('Criando tabelas (db push)', npx, ['prisma', 'db', 'push', '--skip-generate'], backend);
}

rodar('Seed', isWin ? 'node' : process.execPath, ['prisma/seed.js'], backend);

function maisRecente(dir) {
  let max = 0;
  for (const nome of fs.readdirSync(dir)) {
    if (nome === 'dist' || nome === 'node_modules') continue;
    const abs = path.join(dir, nome);
    const st = fs.statSync(abs);
    max = Math.max(max, st.isDirectory() ? maisRecente(abs) : st.mtimeMs);
  }
  return max;
}
const frontDir = path.join(raiz, 'frontend');
const distIndex = path.join(frontDir, 'dist', 'index.html');
if (!fs.existsSync(distIndex) || maisRecente(frontDir) > fs.statSync(distIndex).mtimeMs) {
  rodar('Construindo o front-end (Vite)', npm, ['run', 'build', '--workspace', 'frontend'], raiz);
}

// 5) Servidor
require('../src/server.js');
