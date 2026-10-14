/**
 * Criptografia de dados sensíveis em repouso (CPF, nome do comprador...).
 *
 * - Algoritmo: AES-256-GCM (criptografa E autentica: se alguém alterar o valor
 *   no banco, a descriptografia falha em vez de devolver lixo).
 * - IV aleatório de 12 bytes a cada gravação (o mesmo CPF gera textos diferentes).
 * - "contexto" (ex.: 'Order.cpf') é amarrado ao valor: um texto criptografado de
 *   um campo não pode ser copiado para outro campo e continuar válido.
 * - A chave vem de ENCRYPTION_KEY (.env) e NUNCA fica no banco nem no Git.
 *
 * Formato salvo:  v1:<iv>:<tag>:<dados>   (tudo em base64)
 */
const crypto = require('crypto');
const env = require('./env');

const PREFIXO = 'v1';

function chave() {
  if (!/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY || '')) {
    throw new Error(
      'ENCRYPTION_KEY ausente ou inválida no .env (precisa de 64 caracteres hexadecimais = 32 bytes). ' +
        'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

function estaCriptografado(valor) {
  return typeof valor === 'string' && valor.startsWith(`${PREFIXO}:`) && valor.split(':').length === 4;
}

/** Criptografa um texto. null/undefined/'' passam direto. Não criptografa duas vezes. */
function criptografar(texto, contexto = '') {
  if (texto === null || texto === undefined || texto === '') return texto;
  if (estaCriptografado(texto)) return texto;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', chave(), iv);
  cipher.setAAD(Buffer.from(contexto));
  const dados = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIXO, iv.toString('base64'), tag.toString('base64'), dados.toString('base64')].join(':');
}

/** Descriptografa. Valores antigos ainda em texto puro são devolvidos como estão. */
function descriptografar(valor, contexto = '') {
  if (!estaCriptografado(valor)) return valor;
  const [, iv, tag, dados] = valor.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', chave(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(contexto));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dados, 'base64')), decipher.final()]).toString('utf8');
}

/** 12345678901 -> ***.***.***-01 (para mostrar em telas sem expor o CPF inteiro). */
function mascararCpf(cpfPuro) {
  const d = String(cpfPuro || '').replace(/\D/g, '');
  return d.length === 11 ? `***.***.***-${d.slice(9)}` : '';
}

module.exports = { criptografar, descriptografar, estaCriptografado, mascararCpf };
