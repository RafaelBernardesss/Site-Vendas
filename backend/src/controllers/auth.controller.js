const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const env = require('../lib/env');
const { ApiError } = require('../lib/errors');
const { enviarCodigoAdmin, destinoCodigoAdmin, mascararEmail } = require('../lib/mailer');

// ---------- Verificação em 2 etapas do ADMIN (código por e-mail) ----------
const CODIGO_VALIDADE_MIN = 10;
const CODIGO_MAX_TENTATIVAS = 5;
const REENVIO_INTERVALO_S = 60;
const COOKIE_DESAFIO = 'admin_2fa';

const hashCodigo = (codigo) =>
  crypto.createHmac('sha256', env.JWT_SECRET).update(String(codigo)).digest('hex');

/** Gera um código de 6 dígitos, salva o hash, envia por e-mail e define o cookie do desafio. */
async function iniciarDesafioAdmin(res, user) {
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

  // Invalida códigos anteriores ainda abertos
  await prisma.adminCodigo.updateMany({ where: { userId: user.id, usado: false }, data: { usado: true } });
  const reg = await prisma.adminCodigo.create({
    data: {
      userId: user.id,
      codigoHash: hashCodigo(codigo),
      expiraEm: new Date(Date.now() + CODIGO_VALIDADE_MIN * 60 * 1000),
    },
  });

  const destino = destinoCodigoAdmin(user);
  try {
    await enviarCodigoAdmin(destino, codigo);
  } catch (e) {
    await prisma.adminCodigo.delete({ where: { id: reg.id } }).catch(() => {});
    console.error('[2fa] falha ao enviar e-mail:', e.message);
    throw new ApiError(503, 'Não foi possível enviar o código por e-mail. Tente novamente.');
  }

  const desafio = jwt.sign({ id: user.id, cid: reg.id, p: 'admin-2fa' }, env.JWT_SECRET, {
    expiresIn: `${CODIGO_VALIDADE_MIN}m`,
  });
  res.cookie(COOKIE_DESAFIO, desafio, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    maxAge: CODIGO_VALIDADE_MIN * 60 * 1000,
    path: '/api/auth',
  });
  return mascararEmail(destino);
}

function lerDesafio(req) {
  const token = req.cookies && req.cookies[COOKIE_DESAFIO];
  if (!token) throw ApiError.unauthorized('Sessão de verificação expirada. Faça login novamente.');
  try {
    const p = jwt.verify(token, env.JWT_SECRET);
    if (p.p !== 'admin-2fa') throw new Error('x');
    return p;
  } catch {
    throw ApiError.unauthorized('Sessão de verificação expirada. Faça login novamente.');
  }
}

const userPublico = (u) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  role: u.role,
  dataNascimento: u.dataNascimento,
});

function setCookie(res, user) {
  const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/** POST /api/auth/cadastro */
async function cadastro(req, res, next) {
  try {
    const { nome, email, senha, dataNascimento } = req.body;

    const existe = await prisma.user.findUnique({ where: { email } });
    if (existe) throw ApiError.conflict('Este e-mail já está cadastrado. Faça login.');

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        dataNascimento: new Date(dataNascimento),
        role: 'USER',
      },
    });

    setCookie(res, user);
    res.status(201).json({ user: userPublico(user) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login */
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw ApiError.unauthorized('E-mail ou senha incorretos.');

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) throw ApiError.unauthorized('E-mail ou senha incorretos.');

    // ADMIN: senha correta ainda NÃO basta — exige o código enviado por e-mail.
    if (user.role === 'ADMIN' && env.ADMIN_2FA_ATIVO) {
      const emailMascarado = await iniciarDesafioAdmin(res, user);
      return res.json({ requires2fa: true, emailMascarado });
    }

    setCookie(res, user);
    res.json({ user: userPublico(user) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login/verificar  { codigo } */
async function verificarCodigoAdmin(req, res, next) {
  try {
    const { id, cid } = lerDesafio(req);
    const reg = await prisma.adminCodigo.findUnique({ where: { id: cid } });
    if (!reg || reg.userId !== id || reg.usado || reg.expiraEm < new Date()) {
      throw ApiError.unauthorized('Código expirado. Faça login novamente.');
    }
    if (reg.tentativas >= CODIGO_MAX_TENTATIVAS) {
      await prisma.adminCodigo.update({ where: { id: reg.id }, data: { usado: true } });
      throw ApiError.unauthorized('Muitas tentativas. Faça login novamente.');
    }

    // Conta a tentativa ANTES de comparar (evita corrida/força bruta paralela)
    await prisma.adminCodigo.update({ where: { id: reg.id }, data: { tentativas: { increment: 1 } } });

    const enviado = Buffer.from(hashCodigo(req.body.codigo));
    const guardado = Buffer.from(reg.codigoHash);
    const certo = enviado.length === guardado.length && crypto.timingSafeEqual(enviado, guardado);
    if (!certo) throw ApiError.unauthorized('Código incorreto.');

    // Uso único: só um pedido consegue "consumir" o código
    const r = await prisma.adminCodigo.updateMany({ where: { id: reg.id, usado: false }, data: { usado: true } });
    if (r.count !== 1) throw ApiError.unauthorized('Código já utilizado. Faça login novamente.');

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'ADMIN') throw ApiError.unauthorized('Acesso negado.');

    res.clearCookie(COOKIE_DESAFIO, { path: '/api/auth' });
    setCookie(res, user);
    res.json({ user: userPublico(user) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login/reenviar */
async function reenviarCodigoAdmin(req, res, next) {
  try {
    const { id, cid } = lerDesafio(req);
    const atual = await prisma.adminCodigo.findUnique({ where: { id: cid } });
    if (!atual || atual.userId !== id) throw ApiError.unauthorized('Faça login novamente.');
    if (Date.now() - atual.createdAt.getTime() < REENVIO_INTERVALO_S * 1000) {
      throw new ApiError(429, `Aguarde ${REENVIO_INTERVALO_S} segundos para reenviar o código.`);
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== 'ADMIN') throw ApiError.unauthorized('Acesso negado.');

    const emailMascarado = await iniciarDesafioAdmin(res, user);
    res.json({ ok: true, emailMascarado });
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/me */
async function me(req, res, next) {
  try {
    const token = req.cookies && req.cookies.token;
    if (!token) return res.status(401).json({ user: null });

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ user: null });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ user: null });

    res.json({ user: userPublico(user) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/sair */
async function sair(req, res) {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
}

module.exports = { cadastro, login, verificarCodigoAdmin, reenviarCodigoAdmin, me, sair };
