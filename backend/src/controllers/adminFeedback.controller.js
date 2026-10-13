const prisma = require('../lib/prisma');
const { ApiError } = require('../lib/errors');

const notaMedia = (soma, total) => (total ? Math.round((soma / total) * 10) / 10 : 0);

/** Compradores distintos (pedido PAID) por material: Map<materialId, Set<userId>>. */
async function compradoresPorMaterial(where = {}) {
  const itens = await prisma.orderItem.findMany({
    where: { status: 'PAID', order: { status: 'PAID' }, ...where },
    select: { materialId: true, order: { select: { userId: true } } },
  });
  const mapa = new Map();
  for (const i of itens) {
    if (!mapa.has(i.materialId)) mapa.set(i.materialId, new Set());
    mapa.get(i.materialId).add(i.order.userId);
  }
  return mapa;
}

/** GET /api/admin/feedback/resumo — por material: compradores, notas e comentários. */
async function resumo(req, res, next) {
  try {
    const [materiais, compradores, avaliacoes, comentarios] = await Promise.all([
      prisma.material.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, titulo: true, preco: true, arquivoCapa: true },
      }),
      compradoresPorMaterial(),
      prisma.avaliacao.findMany({ select: { materialId: true, nota: true } }),
      prisma.comentario.findMany({
        select: { materialId: true, _count: { select: { respostas: true } } },
      }),
    ]);

    const notas = new Map();
    for (const a of avaliacoes) {
      const n = notas.get(a.materialId) || { soma: 0, total: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      n.soma += a.nota;
      n.total += 1;
      n.dist[a.nota] += 1;
      notas.set(a.materialId, n);
    }
    const coment = new Map();
    for (const c of comentarios) {
      const x = coment.get(c.materialId) || { total: 0, semResposta: 0 };
      x.total += 1;
      if (c._count.respostas === 0) x.semResposta += 1;
      coment.set(c.materialId, x);
    }

    const lista = materiais.map((m) => {
      const n = notas.get(m.id) || { soma: 0, total: 0, dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      const c = coment.get(m.id) || { total: 0, semResposta: 0 };
      const compradoresN = (compradores.get(m.id) || new Set()).size;
      return {
        id: m.id,
        titulo: m.titulo,
        preco: m.preco,
        capa: m.arquivoCapa ? `/api/materiais/capa/${m.id}` : null,
        compradores: compradoresN,
        receita: Number((compradoresN * m.preco).toFixed(2)),
        media: notaMedia(n.soma, n.total),
        avaliacoes: n.total,
        distribuicao: n.dist,
        comentarios: c.total,
        semResposta: c.semResposta,
      };
    });

    const totais = lista.reduce(
      (t, m) => ({
        compradores: t.compradores + m.compradores,
        avaliacoes: t.avaliacoes + m.avaliacoes,
        comentarios: t.comentarios + m.comentarios,
        semResposta: t.semResposta + m.semResposta,
        soma: t.soma + m.media * m.avaliacoes,
      }),
      { compradores: 0, avaliacoes: 0, comentarios: 0, semResposta: 0, soma: 0 }
    );

    res.json({
      totais: {
        compradores: totais.compradores,
        avaliacoes: totais.avaliacoes,
        comentarios: totais.comentarios,
        semResposta: totais.semResposta,
        media: notaMedia(totais.soma, totais.avaliacoes),
      },
      materiais: lista,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/materiais/:id/compradores — quem comprou, quando e a nota dada. */
async function compradores(req, res, next) {
  try {
    const materialId = Number(req.params.id);
    const material = await prisma.material.findUnique({ where: { id: materialId }, select: { id: true, titulo: true } });
    if (!material) throw ApiError.notFound('Material não encontrado.');

    const itens = await prisma.orderItem.findMany({
      where: { materialId, status: 'PAID', order: { status: 'PAID' } },
      select: {
        preco: true,
        order: { select: { id: true, paidAt: true, createdAt: true, user: { select: { id: true, nome: true, email: true } } } },
      },
      orderBy: { order: { paidAt: 'desc' } },
    });
    const ids = [...new Set(itens.map((i) => i.order.user.id))];
    const [notas, coments] = await Promise.all([
      prisma.avaliacao.findMany({ where: { materialId, userId: { in: ids } }, select: { userId: true, nota: true } }),
      prisma.comentario.findMany({ where: { materialId, userId: { in: ids } }, select: { userId: true, id: true } }),
    ]);
    const notaDe = new Map(notas.map((n) => [n.userId, n.nota]));
    const comentDe = new Map(coments.map((c) => [c.userId, c.id]));

    const vistos = new Set();
    const lista = [];
    for (const i of itens) {
      const u = i.order.user;
      if (vistos.has(u.id)) continue;
      vistos.add(u.id);
      lista.push({
        userId: u.id,
        nome: u.nome,
        email: u.email,
        preco: i.preco,
        compradoEm: i.order.paidAt || i.order.createdAt,
        nota: notaDe.get(u.id) || null,
        comentarioId: comentDe.get(u.id) || null,
      });
    }
    res.json({ material, compradores: lista });
  } catch (err) {
    next(err);
  }
}

const incluirResp = {
  user: { select: { id: true, nome: true, email: true, role: true } },
  material: { select: { id: true, titulo: true } },
  respostas: {
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, nome: true, role: true } } },
  },
};

async function formatarComentarios(comentarios) {
  const pares = comentarios.map((c) => ({ userId: c.userId, materialId: c.materialId }));
  const userIds = [...new Set(pares.map((p) => p.userId))];
  const matIds = [...new Set(pares.map((p) => p.materialId))];

  const [notas, compras] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { userId: { in: userIds }, materialId: { in: matIds } },
      select: { userId: true, materialId: true, nota: true },
    }),
    prisma.orderItem.findMany({
      where: { status: 'PAID', materialId: { in: matIds }, order: { status: 'PAID', userId: { in: userIds } } },
      select: { materialId: true, order: { select: { userId: true } } },
    }),
  ]);
  const chave = (u, m) => `${u}:${m}`;
  const notaDe = new Map(notas.map((n) => [chave(n.userId, n.materialId), n.nota]));
  const comprou = new Set(compras.map((c) => chave(c.order.userId, c.materialId)));

  return comentarios.map((c) => ({
    id: c.id,
    texto: c.texto,
    createdAt: c.createdAt,
    material: c.material,
    autor: { id: c.user.id, nome: c.user.nome, email: c.user.email, admin: c.user.role === 'ADMIN' },
    nota: notaDe.get(chave(c.userId, c.materialId)) || null,
    comprou: comprou.has(chave(c.userId, c.materialId)),
    respostas: c.respostas.map((r) => ({
      id: r.id,
      texto: r.texto,
      createdAt: r.createdAt,
      autor: r.user.nome,
      admin: r.user.role === 'ADMIN',
    })),
  }));
}

/**
 * GET /api/admin/comentarios?materialId=&status=todos|pendentes|respondidos&q=&pagina=&limite=
 * "pendentes" = comentários de clientes que ainda não receberam nenhuma resposta.
 */
async function listarComentarios(req, res, next) {
  try {
    const { materialId, status = 'todos', q, pagina = 1, limite = 20 } = req.query;
    const where = {};
    if (materialId) where.materialId = Number(materialId);
    if (status === 'pendentes') where.respostas = { none: {} };
    if (status === 'respondidos') where.respostas = { some: {} };
    if (q && String(q).trim()) {
      const t = String(q).trim();
      where.OR = [{ texto: { contains: t } }, { user: { nome: { contains: t } } }, { user: { email: { contains: t } } }];
    }

    const take = Math.min(Math.max(Number(limite) || 20, 1), 50);
    const skip = (Math.max(Number(pagina) || 1, 1) - 1) * take;

    const [total, comentarios] = await Promise.all([
      prisma.comentario.count({ where }),
      prisma.comentario.findMany({
        where,
        include: incluirResp,
        // Dúvidas sem resposta primeiro não é possível em SQL simples; ordenação por data (mais recentes).
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    res.json({ total, pagina: Math.floor(skip / take) + 1, paginas: Math.max(Math.ceil(total / take), 1), comentarios: await formatarComentarios(comentarios) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/comentarios/:id/respostas { texto } */
async function responder(req, res, next) {
  try {
    const id = Number(req.params.id);
    const texto = String(req.body.texto || '').trim();
    if (texto.length < 2) throw ApiError.badRequest('Escreva a resposta (mínimo 2 caracteres).');
    if (texto.length > 1000) throw ApiError.badRequest('A resposta pode ter no máximo 1000 caracteres.');

    const c = await prisma.comentario.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw ApiError.notFound('Comentário não encontrado.');

    const r = await prisma.resposta.create({ data: { comentarioId: id, userId: req.user.id, texto } });
    res.status(201).json({
      id: r.id,
      texto: r.texto,
      createdAt: r.createdAt,
      autor: req.user.nome,
      admin: true,
    });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/respostas/:id */
async function excluirResposta(req, res, next) {
  try {
    const id = Number(req.params.id);
    const r = await prisma.resposta.findUnique({ where: { id }, select: { id: true } });
    if (!r) throw ApiError.notFound('Resposta não encontrada.');
    await prisma.resposta.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { resumo, compradores, listarComentarios, responder, excluirResposta };
